const express = require('express');
const router = express.Router();
const db = require('../db');

function calculateScore(userId) {
  const loans = db.prepare(`
    SELECT *, due_date < DATE('now') as is_overdue
    FROM loans WHERE borrower_id = ? AND status != 'declined' AND status != 'pending'
  `).all(userId);

  if (loans.length === 0) return { score: 70, grade: 'B', label: 'No history', color: '#f59e0b' };

  let score = 70;
  let paid = 0, late = 0, overdue = 0;

  for (const loan of loans) {
    if (loan.status === 'paid') {
      if (loan.is_overdue) { late++; score -= 15; }
      else { paid++; score += 8; }
    } else if (loan.status === 'active' && loan.is_overdue) {
      overdue++; score -= 20;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let grade, label, color;
  if (score >= 85)      { grade = 'A'; label = 'Excellent';  color = '#16a34a'; }
  else if (score >= 70) { grade = 'B'; label = 'Good';       color = '#2563eb'; }
  else if (score >= 50) { grade = 'C'; label = 'Fair';       color = '#f59e0b'; }
  else if (score >= 30) { grade = 'D'; label = 'Poor';       color = '#ea580c'; }
  else                  { grade = 'F'; label = 'Very Poor';  color = '#dc2626'; }

  return { score, grade, label, color, stats: { paid, late, overdue, total: loans.length } };
}

// GET /credit/:phone — get credit score by phone (for lenders checking borrowers)
router.get('/:phone', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(req.params.phone);
  if (!user) return res.json({ score: null, label: 'New user', color: '#888', grade: 'N/A', stats: null });

  const result = calculateScore(user.id);
  // Don't expose the user's full details, just score
  res.json({ ...result, name: user.name });
});

// GET /credit/me/score — get your own credit score
router.get('/me/score', (req, res) => {
  res.json(calculateScore(req.user.userId));
});

module.exports = { router, calculateScore };
