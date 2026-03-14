const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /notifications — get last 20 unread notifications for current user
router.get('/', (req, res) => {
  const userId = req.user.userId;
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ? AND read = 0
    ORDER BY created_at DESC
    LIMIT 20
  `).all(userId);
  res.json(notifications);
});

// GET /notifications/count — returns count of unread notifications
router.get('/count', (req, res) => {
  const userId = req.user.userId;
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(userId);
  res.json({ count: row.count });
});

// PATCH /notifications/read-all — mark all as read
router.patch('/read-all', (req, res) => {
  const userId = req.user.userId;
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  res.json({ success: true });
});

// PATCH /notifications/:id/read — mark one as read
router.patch('/:id/read', (req, res) => {
  const userId = req.user.userId;
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  if (notif.user_id !== userId) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
