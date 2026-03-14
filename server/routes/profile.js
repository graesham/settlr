const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateScore } = require('./credit');

// GET /profile/:phone — public profile (no auth required)
router.get('/:phone', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(req.params.phone);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const creditResult = calculateScore(user.id);

  const completedLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE borrower_id = ? AND status = 'paid'").get(user.id).c;
  const totalBorrowedRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM loans WHERE borrower_id = ? AND status != 'declined'").get(user.id);
  const totalBorrowed = totalBorrowedRow.s;

  const paidOnTimeRow = db.prepare(`
    SELECT COUNT(*) as c FROM loans
    WHERE borrower_id = ? AND status = 'paid' AND due_date >= DATE('now')
  `).get(user.id);
  const paidOnTime = paidOnTimeRow.c;
  const onTimePct = completedLoans > 0 ? Math.round((paidOnTime / completedLoans) * 100) : null;

  res.json({
    name: user.name,
    creditScore: creditResult,
    stats: {
      loansCompleted: completedLoans,
      onTimePercent: onTimePct,
      totalBorrowed: parseFloat(totalBorrowed.toFixed(2)),
    },
  });
});

module.exports = router;
