const express = require('express');
const router = express.Router();
const db = require('../db');
const twilio = require('twilio');
const PDFDocument = require('pdfkit');

function getClient() {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid') {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return null;
}

async function sendSMS(to, message) {
  const client = getClient();
  if (client) {
    return client.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to });
  } else {
    console.log(`[DEV SMS] To: ${to} | Message: ${message}`);
  }
}

function normalizePhone(raw) {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.startsWith('+')) return raw;
  return `+${digits}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function logActivity(loanId, userId, type, meta) {
  db.prepare('INSERT INTO activities (loan_id, user_id, type, meta) VALUES (?, ?, ?, ?)').run(
    loanId, userId, type, meta ? JSON.stringify(meta) : null
  );
}

function createNotification(userId, message, type, loanId) {
  db.prepare('INSERT INTO notifications (user_id, message, type, loan_id) VALUES (?, ?, ?, ?)').run(
    userId, message, type, loanId || null
  );
}

// GET /loans - all loans for current user (as lender or borrower)
router.get('/', (req, res) => {
  const userId = req.user.userId;
  const loans = db.prepare(`
    SELECT l.*,
      lender.name as lender_name, lender.phone as lender_phone,
      borrower.name as borrower_name
    FROM loans l
    LEFT JOIN users lender ON l.lender_id = lender.id
    LEFT JOIN users borrower ON l.borrower_id = borrower.id
    WHERE l.lender_id = ? OR l.borrower_id = ?
    ORDER BY l.created_at DESC
  `).all(userId, userId);
  res.json(loans);
});

// POST /loans - create a new loan request (lender_created)
router.post('/', async (req, res) => {
  const { borrower_phone: rawBorrowerPhone, amount, note, due_date } = req.body;
  const borrower_phone = normalizePhone(rawBorrowerPhone);
  const lenderId = req.user.userId;

  if (!borrower_phone || !amount || !due_date) {
    return res.status(400).json({ error: 'borrower_phone, amount, and due_date are required' });
  }

  const lender = db.prepare('SELECT * FROM users WHERE id = ?').get(lenderId);
  if (lender.phone === borrower_phone) {
    return res.status(400).json({ error: 'You cannot create a loan with yourself' });
  }

  // Free tier limit: max 3 active loans as lender
  if (!lender.premium) {
    const activeCount = db.prepare(
      "SELECT COUNT(*) as c FROM loans WHERE lender_id = ? AND status IN ('pending', 'active')"
    ).get(lenderId).c;
    if (activeCount >= 3) {
      return res.status(400).json({ error: 'Upgrade to Premium to create more than 3 loans' });
    }
  }

  // Check if borrower is already a user
  const borrower = db.prepare('SELECT * FROM users WHERE phone = ?').get(borrower_phone);

  const result = db.prepare(`
    INSERT INTO loans (lender_id, borrower_phone, borrower_id, amount, note, due_date, status, type)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 'lender_created')
  `).run(lenderId, borrower_phone, borrower ? borrower.id : null, amount, note || '', due_date);

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid);

  // Log activity
  logActivity(loan.id, lenderId, 'loan_created', { amount, borrower_phone });

  // Notify borrower in-app
  if (borrower) {
    createNotification(borrower.id, `${lender.name} recorded a loan of ${formatCurrency(amount)} to you. Due: ${due_date}.`, 'loan_created', loan.id);
  }

  // Notify borrower via SMS
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const message = borrower
    ? `Hi ${borrower.name}! ${lender.name} has recorded a loan of ${formatCurrency(amount)} to you via Settlr. Due date: ${due_date}. ${note ? 'Note: ' + note + '. ' : ''}View & accept: ${appUrl}/loan/${loan.id}`
    : `Hi! ${lender.name} has recorded a loan of ${formatCurrency(amount)} to you via Settlr. Due date: ${due_date}. ${note ? 'Note: ' + note + '. ' : ''}Sign up to manage it: ${appUrl}`;

  try {
    await sendSMS(borrower_phone, message);
  } catch (e) {
    console.error('SMS error:', e.message);
  }

  res.json(loan);
});

// POST /loans/request — borrower creates a loan request to a lender
router.post('/request', async (req, res) => {
  const { lender_phone: rawLenderPhone, amount, note, due_date } = req.body;
  const lender_phone = normalizePhone(rawLenderPhone);
  const borrowerId = req.user.userId;

  if (!lender_phone || !amount || !due_date) {
    return res.status(400).json({ error: 'lender_phone, amount, and due_date are required' });
  }

  const borrower = db.prepare('SELECT * FROM users WHERE id = ?').get(borrowerId);
  if (borrower.phone === lender_phone) {
    return res.status(400).json({ error: 'You cannot create a loan with yourself' });
  }

  const lender = db.prepare('SELECT * FROM users WHERE phone = ?').get(lender_phone);

  // Insert loan: borrower is the requestor, lender is whoever has lender_phone
  // For borrower_request: lender_id is set if lender exists, else we store lender_phone in borrower_phone column with a special flag
  // We store: lender_id = lender.id (if exists), borrower_id = borrowerId, borrower_phone = borrower.phone
  if (!lender) {
    return res.status(404).json({ error: 'No user found with that phone number' });
  }

  const result = db.prepare(`
    INSERT INTO loans (lender_id, borrower_phone, borrower_id, amount, note, due_date, status, type)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 'borrower_request')
  `).run(lender.id, borrower.phone, borrowerId, amount, note || '', due_date);

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid);

  // Log activity
  logActivity(loan.id, borrowerId, 'loan_requested', { amount, lender_phone });

  // Notify lender in-app
  createNotification(lender.id, `${borrower.name} is requesting to borrow ${formatCurrency(amount)} from you. Due: ${due_date}.`, 'loan_requested', loan.id);

  // Notify lender via SMS
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const smsMsg = `Hi ${lender.name}! ${borrower.name} has requested to borrow ${formatCurrency(amount)} from you via Settlr. Due: ${due_date}.${note ? ' Note: ' + note + '.' : ''} View: ${appUrl}/loan/${loan.id}`;
  try {
    await sendSMS(lender_phone, smsMsg);
  } catch (e) {
    console.error('SMS error:', e.message);
  }

  res.json(loan);
});

// PATCH /loans/:id/accept
router.patch('/:id/accept', async (req, res) => {
  const { signature } = req.body;
  if (!signature || signature.trim().length < 2) {
    return res.status(400).json({ error: 'A valid signature is required to accept the loan' });
  }

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (user.phone !== loan.borrower_phone) return res.status(403).json({ error: 'Not authorized' });

  db.prepare(`
    UPDATE loans SET status = 'active', borrower_id = ?, borrower_signature = ?, signed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(req.user.userId, signature.trim(), loan.id);

  // Log activity
  logActivity(loan.id, req.user.userId, 'loan_accepted', { signature: signature.trim() });

  // Notify lender in-app
  createNotification(loan.lender_id, `${user.name} has accepted and signed the loan of ${formatCurrency(loan.amount)}.`, 'loan_accepted', loan.id);

  // Notify lender via SMS
  const lender = db.prepare('SELECT * FROM users WHERE id = ?').get(loan.lender_id);
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    await sendSMS(lender.phone, `${user.name} has accepted and signed the loan of ${formatCurrency(loan.amount)}. Due: ${loan.due_date}. View: ${appUrl}/loan/${loan.id}`);
  } catch (e) {
    console.error('SMS error:', e.message);
  }

  res.json({ success: true });
});

// GET /loans/:id/pdf — download signed loan agreement (token via query param for direct link support)
router.get('/:id/pdf', (req, res) => {
  // Allow token via query string (for direct <a> download links in production)
  if (!req.user && req.query.token) {
    try {
      const jwt = require('jsonwebtoken');
      req.user = jwt.verify(req.query.token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const loan = db.prepare(`
    SELECT l.*, lender.name as lender_name, lender.phone as lender_phone,
      borrower.name as borrower_name
    FROM loans l
    LEFT JOIN users lender ON l.lender_id = lender.id
    LEFT JOIN users borrower ON l.borrower_id = borrower.id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const userId = req.user.userId;
  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const doc = new PDFDocument({ margin: 60 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="loanpal-agreement-${loan.id}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text('Settlr', { align: 'center' });
  doc.fontSize(14).font('Helvetica').text('Loan Agreement', { align: 'center' });
  doc.moveDown();
  doc.moveTo(60, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown();

  // Details
  const rows = [
    ['Agreement ID', `#${loan.id}`],
    ['Date Created', new Date(loan.created_at).toLocaleDateString()],
    ['Lender', `${loan.lender_name} (${loan.lender_phone})`],
    ['Borrower', `${loan.borrower_name || loan.borrower_phone} (${loan.borrower_phone})`],
    ['Amount', formatCurrency(loan.amount)],
    ['Due Date', loan.due_date],
    ['Purpose / Note', loan.note || 'N/A'],
    ['Status', loan.status.toUpperCase()],
  ];

  rows.forEach(([label, value]) => {
    doc.fontSize(11).font('Helvetica-Bold').text(`${label}:`, { continued: true });
    doc.font('Helvetica').text(`  ${value}`);
    doc.moveDown(0.3);
  });

  doc.moveDown();
  doc.moveTo(60, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown();

  // Signature block
  doc.fontSize(13).font('Helvetica-Bold').text('Digital Signature');
  doc.moveDown(0.5);
  if (loan.borrower_signature) {
    doc.fontSize(11).font('Helvetica').text(`Borrower digitally signed as:`);
    doc.moveDown(0.3);
    doc.fontSize(18).font('Helvetica-BoldOblique').text(loan.borrower_signature);
    doc.fontSize(10).font('Helvetica').fillColor('#888').text(`Signed on: ${loan.signed_at ? new Date(loan.signed_at).toLocaleString() : 'N/A'}`);
    doc.fillColor('#000');
  } else {
    doc.fontSize(11).font('Helvetica').fillColor('#888').text('Not yet signed by borrower.');
    doc.fillColor('#000');
  }

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#aaa').text(
    'This document was generated by Settlr and serves as a record of a personal loan agreement between the parties listed above.',
    { align: 'center' }
  );

  doc.end();
});

// PATCH /loans/:id/decline
router.patch('/:id/decline', async (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (user.phone !== loan.borrower_phone) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('declined', loan.id);

  // Log activity
  logActivity(loan.id, req.user.userId, 'loan_declined', null);

  // Notify lender in-app
  createNotification(loan.lender_id, `${user.name} has declined the loan of ${formatCurrency(loan.amount)}.`, 'loan_declined', loan.id);

  const lender = db.prepare('SELECT * FROM users WHERE id = ?').get(loan.lender_id);
  try {
    await sendSMS(lender.phone, `${user.name} has declined the loan of ${formatCurrency(loan.amount)}.`);
  } catch (e) {
    console.error('SMS error:', e.message);
  }

  res.json({ success: true });
});

// PATCH /loans/:id/paid
router.patch('/:id/paid', async (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const userId = req.user.userId;
  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('paid', loan.id);

  // Log activity
  logActivity(loan.id, userId, 'loan_paid', null);

  // Notify both parties
  const lender = db.prepare('SELECT * FROM users WHERE id = ?').get(loan.lender_id);
  const borrower = loan.borrower_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(loan.borrower_id) : null;

  if (userId === loan.lender_id && borrower) {
    createNotification(borrower.id, `${lender.name} marked your loan of ${formatCurrency(loan.amount)} as paid.`, 'loan_paid', loan.id);
  } else if (userId === loan.borrower_id) {
    createNotification(loan.lender_id, `${borrower?.name || loan.borrower_phone} marked the loan of ${formatCurrency(loan.amount)} as paid.`, 'loan_paid', loan.id);
  }

  try {
    if (userId === loan.lender_id && borrower) {
      await sendSMS(borrower.phone, `${lender.name} has marked your loan of ${formatCurrency(loan.amount)} as paid. Thanks!`);
    } else if (userId === loan.borrower_id) {
      await sendSMS(lender.phone, `${borrower?.name || loan.borrower_phone} has marked the loan of ${formatCurrency(loan.amount)} as paid!`);
    }
  } catch (e) {
    console.error('SMS error:', e.message);
  }

  res.json({ success: true });
});

// POST /loans/:id/payments — add a partial payment
router.post('/:id/payments', (req, res) => {
  const loanId = req.params.id;
  const userId = req.user.userId;
  const { amount, note } = req.body;

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const amountPaid = loan.amount_paid || 0;
  const remaining = loan.amount - amountPaid;
  const payAmt = parseFloat(amount);

  if (payAmt > remaining) {
    return res.status(400).json({ error: `Payment exceeds remaining balance of ${remaining.toFixed(2)}` });
  }

  const newAmountPaid = amountPaid + payAmt;
  const newRemaining = loan.amount - newAmountPaid;

  if (newAmountPaid >= loan.amount) {
    db.prepare('UPDATE loans SET amount_paid = ?, status = ? WHERE id = ?').run(newAmountPaid, 'paid', loanId);
  } else {
    db.prepare('UPDATE loans SET amount_paid = ? WHERE id = ?').run(newAmountPaid, loanId);
  }

  const result = db.prepare(`
    INSERT INTO payments (loan_id, amount, note, created_by) VALUES (?, ?, ?, ?)
  `).run(loanId, payAmt, note || null, userId);

  logActivity(loanId, userId, 'payment_made', { amount: payAmt, remaining: newRemaining });

  // Notify the other party
  let notifyUserId = null;
  if (userId === loan.lender_id && loan.borrower_id) {
    notifyUserId = loan.borrower_id;
  } else if (userId === loan.borrower_id) {
    notifyUserId = loan.lender_id;
  }

  if (notifyUserId) {
    const actor = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    const actorName = actor ? actor.name : 'Someone';
    const msg = `${actorName} recorded a payment of ${formatCurrency(payAmt)} on loan #${loanId}. Remaining: ${formatCurrency(newRemaining)}.`;
    createNotification(notifyUserId, msg, 'payment_made', loanId);
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
  res.json({ payment, newAmountPaid, newRemaining });
});

// GET /loans/:id/payments — get all payments for a loan
router.get('/:id/payments', (req, res) => {
  const loanId = req.params.id;
  const userId = req.user.userId;

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const payments = db.prepare(`
    SELECT p.*, u.name as created_by_name
    FROM payments p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.loan_id = ?
    ORDER BY p.created_at ASC
  `).all(loanId);

  res.json(payments);
});

// GET /loans/:id/activities — get activities for a loan
router.get('/:id/activities', (req, res) => {
  const loanId = req.params.id;
  const userId = req.user.userId;

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const activities = db.prepare(`
    SELECT a.*, u.name as user_name
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.loan_id = ?
    ORDER BY a.created_at ASC
  `).all(loanId);

  res.json(activities);
});

// GET /loans/:id
router.get('/:id', (req, res) => {
  const loan = db.prepare(`
    SELECT l.*,
      lender.name as lender_name, lender.phone as lender_phone,
      borrower.name as borrower_name
    FROM loans l
    LEFT JOIN users lender ON l.lender_id = lender.id
    LEFT JOIN users borrower ON l.borrower_id = borrower.id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  res.json(loan);
});

module.exports = router;
