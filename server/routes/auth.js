const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

function getClient() {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid') {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return null;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { phone, name } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const code = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  db.prepare('DELETE FROM otps WHERE phone = ?').run(phone);
  db.prepare('INSERT INTO otps (phone, code, expires_at) VALUES (?, ?, ?)').run(phone, code, expires);

  // Store name temporarily (will be used on verify if new user)
  if (name) {
    db.prepare('INSERT OR IGNORE INTO users (phone, name) VALUES (?, ?)').run(phone, name);
    db.prepare('UPDATE users SET name = ? WHERE phone = ?').run(name, phone);
  }

  try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid') {
      await getClient().messages.create({
        body: `Your Settlr verification code is: ${code}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } else {
      // Dev mode - log OTP to console
      console.log(`[DEV] OTP for ${phone}: ${code}`);
    }
    res.json({ success: true, message: 'OTP sent', dev_code: process.env.NODE_ENV !== 'production' ? code : undefined });
  } catch (err) {
    console.error('Twilio error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { phone, code, name } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

  const otp = db.prepare('SELECT * FROM otps WHERE phone = ? AND used = 0 ORDER BY id DESC LIMIT 1').get(phone);

  if (!otp) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
  if (new Date(otp.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });
  if (otp.code !== code) return res.status(400).json({ error: 'Invalid OTP' });

  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(otp.id);

  // Create user if not exists
  if (name) {
    db.prepare('INSERT OR IGNORE INTO users (phone, name) VALUES (?, ?)').run(phone, name);
    db.prepare('UPDATE users SET name = ? WHERE phone = ?').run(name, phone);
  } else {
    db.prepare('INSERT OR IGNORE INTO users (phone, name) VALUES (?, ?)').run(phone, phone);
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  // Link any loans created for this phone number before they signed up
  db.prepare('UPDATE loans SET borrower_id = ? WHERE borrower_phone = ? AND borrower_id IS NULL').run(user.id, phone);

  const token = jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.json({ success: true, token, user: { id: user.id, name: user.name, phone: user.phone } });
});

module.exports = router;
