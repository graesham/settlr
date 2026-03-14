const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// POST /loans/:id/payments — add a partial payment
router.post('/', (req, res) => {
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

  // Update loan amount_paid and possibly status
  if (newAmountPaid >= loan.amount) {
    db.prepare('UPDATE loans SET amount_paid = ?, status = ? WHERE id = ?').run(newAmountPaid, 'paid', loanId);
  } else {
    db.prepare('UPDATE loans SET amount_paid = ? WHERE id = ?').run(newAmountPaid, loanId);
  }

  // Insert payment record
  const result = db.prepare(`
    INSERT INTO payments (loan_id, amount, note, created_by) VALUES (?, ?, ?, ?)
  `).run(loanId, payAmt, note || null, userId);

  // Log activity
  db.prepare(`
    INSERT INTO activities (loan_id, user_id, type, meta) VALUES (?, ?, 'payment_made', ?)
  `).run(loanId, userId, JSON.stringify({ amount: payAmt, remaining: newRemaining }));

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
    const msg = `${actorName} recorded a payment of $${payAmt.toFixed(2)} on loan #${loanId}. Remaining: $${newRemaining.toFixed(2)}.`;
    db.prepare(`
      INSERT INTO notifications (user_id, message, type, loan_id) VALUES (?, ?, 'payment_made', ?)
    `).run(notifyUserId, msg, loanId);
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
  res.json({ payment, newAmountPaid, newRemaining });
});

// GET /loans/:id/payments — get all payments for a loan
router.get('/', (req, res) => {
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

module.exports = router;
