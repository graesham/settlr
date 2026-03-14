const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {}
  }
  next();
}

// GET /analytics/platform — public stats
router.get('/platform', (req, res) => {
  const totalLoans = db.prepare('SELECT COUNT(*) as c FROM loans').get().c;
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const volumeRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as v FROM loans WHERE status != 'declined'").get();
  const totalVolume = volumeRow.v;
  const paidLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'paid'").get().c;
  const activeLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'active'").get().c;
  const completedOrPaid = db.prepare("SELECT COUNT(*) as c FROM loans WHERE status IN ('paid', 'active', 'declined')").get().c;
  const recoveryRate = completedOrPaid > 0 ? Math.round((paidLoans / completedOrPaid) * 100) : 0;
  const avgRow = db.prepare("SELECT COALESCE(AVG(amount), 0) as a FROM loans WHERE status != 'declined'").get();
  const avgLoanAmount = parseFloat(avgRow.a.toFixed(2));

  res.json({ totalLoans, totalUsers, totalVolume, recoveryRate, avgLoanAmount, activeLoans });
});

// GET /analytics/me — auth required
router.get('/me', optionalAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.userId;

  const lentLoans = db.prepare("SELECT * FROM loans WHERE lender_id = ? AND status != 'declined'").all(userId);
  const borrowedLoans = db.prepare("SELECT * FROM loans WHERE borrower_id = ? AND status != 'declined'").all(userId);

  const totalLent = lentLoans.reduce((s, l) => s + l.amount, 0);
  const totalBorrowed = borrowedLoans.reduce((s, l) => s + l.amount, 0);

  const paidLent = lentLoans.filter(l => l.status === 'paid').length;
  const recoveryRate = lentLoans.length > 0 ? Math.round((paidLent / lentLoans.length) * 100) : 0;

  // On-time = paid before or on due_date
  const onTimePayments = db.prepare(`
    SELECT COUNT(*) as c FROM loans
    WHERE borrower_id = ? AND status = 'paid' AND due_date >= DATE(signed_at)
  `).get(userId).c;

  const latePayments = db.prepare(`
    SELECT COUNT(*) as c FROM loans
    WHERE borrower_id = ? AND status = 'paid' AND due_date < DATE('now')
  `).get(userId).c;

  const allLoans = [...lentLoans, ...borrowedLoans];
  const avgLoanSize = allLoans.length > 0
    ? parseFloat((allLoans.reduce((s, l) => s + l.amount, 0) / allLoans.length).toFixed(2))
    : 0;

  res.json({
    totalLent: parseFloat(totalLent.toFixed(2)),
    totalBorrowed: parseFloat(totalBorrowed.toFixed(2)),
    recoveryRate,
    loansLent: lentLoans.length,
    loansBorrowed: borrowedLoans.length,
    onTimePayments,
    latePayments,
    avgLoanSize,
  });
});

module.exports = router;
