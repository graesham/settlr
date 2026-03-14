require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { startCron } = require('./cron');

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.use('/auth', require('./routes/auth'));
app.use('/loans', authenticate, require('./routes/loans'));
app.use('/credit', authenticate, require('./routes/credit').router);
app.use('/notifications', authenticate, require('./routes/notifications'));
app.use('/analytics', require('./routes/analytics'));
app.use('/profile', require('./routes/profile'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

startCron();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Settlr server running on port ${PORT}`));
