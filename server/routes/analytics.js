const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

function phonesMatch(a, b) {
  if (!a || !b) return false;
  const digits = s => s.replace(/\D/g, '');
  return digits(a) === digits(b);
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {}
  }
  next();
}

// GET /analytics/platform — admin only
router.get('/platform', optionalAuth, (req, res) => {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (adminPhone) {
    const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(req.user.userId);
    if (!user || !phonesMatch(user.phone, adminPhone)) return res.status(403).json({ error: 'Forbidden' });
  }

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

// GET /analytics/my-loans — detailed breakdown with names
router.get('/my-loans', optionalAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.userId;

  const owedToMe = db.prepare(`
    SELECT l.id, l.amount, l.status, l.due_date, l.note, l.created_at,
      COALESCE(b.name, l.borrower_phone) as person_name,
      COALESCE(b.phone, l.borrower_phone) as person_phone,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.loan_id = l.id), 0) as paid_amount
    FROM loans l
    LEFT JOIN users b ON l.borrower_id = b.id
    WHERE l.lender_id = ? AND l.status != 'declined'
    ORDER BY l.status ASC, l.due_date ASC
  `).all(userId);

  const iOwe = db.prepare(`
    SELECT l.id, l.amount, l.status, l.due_date, l.note, l.created_at,
      COALESCE(u.name, u.phone) as person_name,
      u.phone as person_phone,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.loan_id = l.id), 0) as paid_amount
    FROM loans l
    LEFT JOIN users u ON l.lender_id = u.id
    WHERE l.borrower_id = ? AND l.status != 'declined'
    ORDER BY l.status ASC, l.due_date ASC
  `).all(userId);

  res.json({ owedToMe, iOwe });
});

// GET /analytics/admin — full admin dashboard data
router.get('/admin', optionalAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(req.user.userId);
    if (!user || !phonesMatch(user.phone, adminPhone)) return res.status(403).json({ error: 'Forbidden' });
  }

  // Recent signups
  const recentUsers = db.prepare(`
    SELECT id, name, phone, created_at FROM users ORDER BY created_at DESC LIMIT 20
  `).all();

  // Signups per day (last 14 days)
  const signupsPerDay = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM users WHERE created_at >= DATE('now', '-14 days')
    GROUP BY DATE(created_at) ORDER BY day ASC
  `).all();

  // Loans per day (last 14 days)
  const loansPerDay = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM loans WHERE created_at >= DATE('now', '-14 days')
    GROUP BY DATE(created_at) ORDER BY day ASC
  `).all();

  // Recent loans
  const recentLoans = db.prepare(`
    SELECT l.id, l.amount, l.status, l.created_at, l.due_date,
      lender.name as lender_name, COALESCE(borrower.name, l.borrower_phone) as borrower_name
    FROM loans l
    LEFT JOIN users lender ON l.lender_id = lender.id
    LEFT JOIN users borrower ON l.borrower_id = borrower.id
    ORDER BY l.created_at DESC LIMIT 10
  `).all();

  // Totals
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalLoans = db.prepare('SELECT COUNT(*) as c FROM loans').get().c;
  const totalVolume = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM loans WHERE status != 'declined'").get().v;
  const newUsersToday = db.prepare("SELECT COUNT(*) as c FROM users WHERE DATE(created_at) = DATE('now')").get().c;
  const newUsersThisWeek = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= DATE('now', '-7 days')").get().c;

  res.json({ recentUsers, signupsPerDay, loansPerDay, recentLoans, totalUsers, totalLoans, totalVolume, newUsersToday, newUsersThisWeek });
});

module.exports = router;
