const cron = require('node-cron');
const db = require('./db');
const twilio = require('twilio');

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

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

async function processReminders() {
  const today = new Date().toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const activeLoans = db.prepare(`
    SELECT l.*,
      lender.name as lender_name, lender.phone as lender_phone,
      borrower.name as borrower_name, borrower.phone as borrower_phone_reg
    FROM loans l
    LEFT JOIN users lender ON l.lender_id = lender.id
    LEFT JOIN users borrower ON l.borrower_id = borrower.id
    WHERE l.status = 'active'
  `).all();

  for (const loan of activeLoans) {
    const dueDate = loan.due_date;
    let reminderType = null;

    if (dueDate === in3Days) {
      reminderType = '3_days_before';
    } else if (dueDate === today) {
      reminderType = 'due_today';
    } else if (dueDate < today) {
      reminderType = 'overdue';
    }

    if (!reminderType) continue;

    // Check if we already sent this type of reminder today
    const alreadySent = db.prepare(`
      SELECT * FROM reminders
      WHERE loan_id = ? AND type = ? AND DATE(sent_at) = DATE('now')
    `).get(loan.id, reminderType);

    if (alreadySent) continue;

    const borrowerPhone = loan.borrower_phone_reg || loan.borrower_phone;
    const borrowerName = loan.borrower_name || 'there';

    let borrowerMsg = '';
    let lenderMsg = '';

    if (reminderType === '3_days_before') {
      borrowerMsg = `Hi ${borrowerName}! This is a reminder from Settlr: you have a loan of ${formatCurrency(loan.amount)} from ${loan.lender_name} due in 3 days on ${dueDate}. Please make arrangements to repay.`;
      lenderMsg = `Settlr: A reminder was sent to ${borrowerName} about the ${formatCurrency(loan.amount)} loan due in 3 days (${dueDate}).`;
    } else if (reminderType === 'due_today') {
      borrowerMsg = `Hi ${borrowerName}! Your loan of ${formatCurrency(loan.amount)} from ${loan.lender_name} is DUE TODAY (${dueDate}). Please repay as soon as possible.`;
      lenderMsg = `Settlr: A due-today reminder was sent to ${borrowerName} about the ${formatCurrency(loan.amount)} loan.`;
    } else if (reminderType === 'overdue') {
      borrowerMsg = `Hi ${borrowerName}! Your loan of ${formatCurrency(loan.amount)} from ${loan.lender_name} was due on ${dueDate} and is now OVERDUE. Please repay as soon as possible.`;
      lenderMsg = `Settlr: An overdue reminder was sent to ${borrowerName} about the ${formatCurrency(loan.amount)} loan (due ${dueDate}).`;
    }

    try {
      await sendSMS(borrowerPhone, borrowerMsg);
      await sendSMS(loan.lender_phone, lenderMsg);

      db.prepare('INSERT INTO reminders (loan_id, type) VALUES (?, ?)').run(loan.id, reminderType);
      console.log(`[CRON] Sent ${reminderType} reminder for loan ${loan.id}`);
    } catch (err) {
      console.error(`[CRON] Error sending reminder for loan ${loan.id}:`, err.message);
    }
  }
}

// Run every day at 9:00 AM
function startCron() {
  cron.schedule('0 9 * * *', () => {
    console.log('[CRON] Running daily reminder check...');
    processReminders();
  });

  console.log('[CRON] Daily reminder job scheduled (9:00 AM)');
}

module.exports = { startCron, processReminders };
