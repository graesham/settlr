import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACTIVITY_ICONS = {
  loan_created: '📝',
  loan_requested: '🙋',
  loan_accepted: '✅',
  loan_declined: '❌',
  loan_paid: '💚',
  payment_made: '💸',
};

const ACTIVITY_LABELS = {
  loan_created: 'Loan created',
  loan_requested: 'Loan requested',
  loan_accepted: 'Loan accepted',
  loan_declined: 'Loan declined',
  loan_paid: 'Marked as paid',
  payment_made: 'Payment recorded',
};

function ScoreRing({ score, grade, label, color }) {
  if (score === null) return null;
  return (
    <div style={{ textAlign: 'center', padding: '1rem', background: color + '11', borderRadius: 12, marginBottom: '1.2rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>Borrower Credit Score</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, color }}>{score}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{grade} · {label}</div>
    </div>
  );
}

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loan, setLoan] = useState(null);
  const [creditScore, setCreditScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [signature, setSignature] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);

  // Payments
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Activities
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    api.getLoan(id)
      .then(async (l) => {
        setLoan(l);
        if (user && l.lender_id === user.id && l.borrower_phone) {
          try {
            const score = await api.getCreditScore(l.borrower_phone);
            setCreditScore(score);
          } catch {}
        }
        // Load payments and activities if user is involved
        if (user && (l.lender_id === user.id || l.borrower_id === user.id)) {
          setPaymentsLoading(true);
          setActivitiesLoading(true);
          api.getPayments(id).then(setPayments).catch(() => {}).finally(() => setPaymentsLoading(false));
          api.getActivities(id).then(setActivities).catch(() => {}).finally(() => setActivitiesLoading(false));
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function doAction(action, fn) {
    setActionLoading(action);
    try {
      await fn();
      const updated = await api.getLoan(id);
      setLoan(updated);
      setShowSignModal(false);
      // Refresh activities
      api.getActivities(id).then(setActivities).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading('');
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    if (!payAmount || isNaN(payAmount) || parseFloat(payAmount) <= 0) {
      return setPayError('Enter a valid positive amount');
    }
    setPayLoading(true);
    setPayError('');
    try {
      const result = await api.addPayment(id, { amount: parseFloat(payAmount), note: payNote });
      setPayments(prev => [...prev, result.payment]);
      const updated = await api.getLoan(id);
      setLoan(updated);
      api.getActivities(id).then(setActivities).catch(() => {});
      setPayAmount('');
      setPayNote('');
      setShowPaymentForm(false);
    } catch (e) {
      setPayError(e.message);
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>Loading...</div>;
  if (error && !loan) return <div style={{ textAlign: 'center', padding: '4rem', color: '#dc2626' }}>{error}</div>;
  if (!loan) return null;

  const isLender = user && loan.lender_id === user.id;
  const isBorrower = user && (loan.borrower_id === user.id || (!loan.borrower_id && user?.phone === loan.borrower_phone));
  const overdue = loan.status === 'active' && loan.due_date < new Date().toISOString().split('T')[0];
  const canRecordPayment = (isLender || isBorrower) && (loan.status === 'active');

  const amountPaid = loan.amount_paid || 0;
  const remaining = Math.max(0, loan.amount - amountPaid);
  const progressPct = Math.min(100, (amountPaid / loan.amount) * 100);

  const statusColors = {
    pending:  '#f59e0b',
    active:   '#2563eb',
    paid:     '#16a34a',
    declined: '#dc2626',
  };
  const statusColor = overdue ? '#dc2626' : (statusColors[loan.status] || '#888');
  const statusLabel = overdue ? 'Overdue' : loan.status.charAt(0).toUpperCase() + loan.status.slice(1);

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '1rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 0 1.2rem' }}>
        <button onClick={() => user ? navigate('/') : window.history.back()} style={{
          background: '#e2e8f0', border: 'none', borderRadius: 10, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600
        }}>Back</button>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a1a2e' }}>Loan Agreement</div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem' }}>{error}</div>
      )}

      {/* Credit score — shown to lender */}
      {isLender && creditScore && <ScoreRing {...creditScore} />}

      {/* Main card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '1rem' }}>
        {/* Status + amount */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <span style={{ background: statusColor + '22', color: statusColor, borderRadius: 20, padding: '4px 16px', fontWeight: 700, fontSize: '0.85rem' }}>
            {statusLabel}
          </span>
          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#1a1a2e', margin: '0.6rem 0' }}>{fmt(loan.amount)}</div>
        </div>

        {/* Details */}
        {[
          ['Lender', `${loan.lender_name}${isLender ? ' (You)' : ''}`],
          ['Borrower', `${loan.borrower_name || loan.borrower_phone}${isBorrower ? ' (You)' : ''}`],
          ['Due Date', loan.due_date],
          ['Created', new Date(loan.created_at).toLocaleDateString()],
          loan.note && ['Note', `"${loan.note}"`],
        ].filter(Boolean).map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#888', fontSize: '0.88rem' }}>{label}</span>
            <span style={{ fontWeight: 600, color: '#333', fontSize: '0.88rem' }}>{value}</span>
          </div>
        ))}

        {/* Signature block */}
        {loan.borrower_signature && (
          <div style={{ marginTop: '1.2rem', background: '#f0fdf4', borderRadius: 10, padding: '0.9rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>Digitally signed by borrower</div>
            <div style={{ fontSize: '1.4rem', fontStyle: 'italic', fontWeight: 700, color: '#1a1a2e', margin: '4px 0' }}>
              {loan.borrower_signature}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#aaa' }}>
              {loan.signed_at ? new Date(loan.signed_at).toLocaleString() : ''}
            </div>
          </div>
        )}

        {/* Pay Now buttons — shown to borrower on active loans */}
        {isBorrower && loan.status === 'active' && (
          <div style={{ marginTop: '1.2rem', background: '#f8fafc', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#333', marginBottom: 8 }}>
              Pay back quickly
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                {
                  label: 'Venmo',
                  color: '#008CFF',
                  url: `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(loan.lender_phone)}&amount=${loan.amount - (loan.amount_paid || 0)}&note=${encodeURIComponent('Settlr loan repayment')}`,
                },
                {
                  label: 'Cash App',
                  color: '#00D632',
                  url: `https://cash.app/`,
                },
                {
                  label: 'Zelle',
                  color: '#6D1ED4',
                  url: `https://enroll.zellepay.com/`,
                },
              ].map(({ label, color, url }) => (
                <a key={label} href={url} target="_blank" rel="noreferrer" style={{
                  flex: 1, padding: '0.6rem 0', background: color, color: '#fff',
                  borderRadius: 10, fontWeight: 700, fontSize: '0.82rem',
                  textAlign: 'center', textDecoration: 'none',
                }}>
                  {label}
                </a>
              ))}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 6, textAlign: 'center' }}>
              Send {fmt(loan.amount - (loan.amount_paid || 0))} to {loan.lender_name} · {loan.lender_phone}
            </div>
          </div>
        )}

        {/* PDF download */}
        {(isLender || isBorrower) && loan.borrower_signature && (
          <a
            href={`${import.meta.env.VITE_API_URL || ''}/loans/${loan.id}/pdf?token=${localStorage.getItem('token') || ''}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block', textAlign: 'center', marginTop: '1rem',
              padding: '0.7rem', background: '#f1f5f9', borderRadius: 10,
              color: '#334155', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem',
            }}
          >
            Download Agreement PDF
          </a>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: '1.2rem' }}>
          {isBorrower && loan.status === 'pending' && (
            <button style={{ flex: 1, padding: '0.8rem', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setShowSignModal(true)}>
              Sign & Accept
            </button>
          )}

          {isBorrower && loan.status === 'pending' && (
            <button style={{ flex: 1, padding: '0.8rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              disabled={!!actionLoading}
              onClick={() => doAction('decline', () => api.declineLoan(id))}>
              {actionLoading === 'decline' ? '...' : 'Decline'}
            </button>
          )}

          {(isLender || isBorrower) && loan.status === 'active' && (
            <button style={{ flex: 1, padding: '0.8rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              disabled={!!actionLoading}
              onClick={() => doAction('paid', () => api.markPaid(id))}>
              {actionLoading === 'paid' ? 'Marking...' : 'Mark as Paid'}
            </button>
          )}
        </div>

        {/* Not logged in */}
        {!user && loan.status === 'pending' && (
          <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
            <div style={{ color: '#888', marginBottom: '0.8rem', fontSize: '0.88rem' }}>Sign in to accept or decline</div>
            <button style={{ width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => navigate('/login')}>
              Sign In with Phone Number
            </button>
          </div>
        )}
      </div>

      {/* Payments Section */}
      {(isLender || isBorrower) && loan.status !== 'pending' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.4rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>Payments</div>
            {canRecordPayment && (
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0.4rem 0.85rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem',
                }}
              >
                + Record Payment
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#888', marginBottom: 4 }}>
              <span>Paid: {fmt(amountPaid)}</span>
              <span>Remaining: {fmt(remaining)}</span>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                background: progressPct >= 100 ? '#16a34a' : 'linear-gradient(90deg, #667eea, #764ba2)',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 3 }}>
              {progressPct.toFixed(0)}% of {fmt(loan.amount)} repaid
            </div>
          </div>

          {/* Record Payment inline form */}
          {showPaymentForm && (
            <form onSubmit={handleAddPayment} style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 8, color: '#333' }}>Record a Payment</div>
              {payError && <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: 6 }}>{payError}</div>}
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder={`Amount (up to ${fmt(remaining)})`}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e2e8f0', borderRadius: 8, marginBottom: 8, fontSize: '0.9rem' }}
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e2e8f0', borderRadius: 8, marginBottom: 10, fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setShowPaymentForm(false); setPayError(''); }}
                  style={{ flex: 1, padding: '0.6rem', background: '#e2e8f0', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={payLoading}
                  style={{ flex: 2, padding: '0.6rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  {payLoading ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          )}

          {/* Payment list */}
          {paymentsLoading ? (
            <div style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem' }}>Loading...</div>
          ) : payments.length === 0 ? (
            <div style={{ color: '#ccc', fontSize: '0.82rem', textAlign: 'center', padding: '0.5rem' }}>No payments recorded yet</div>
          ) : (
            payments.map(p => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0',
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>{fmt(p.amount)}</div>
                  {p.note && <div style={{ fontSize: '0.75rem', color: '#888' }}>{p.note}</div>}
                  <div style={{ fontSize: '0.72rem', color: '#bbb' }}>{p.created_by_name} · {timeAgo(p.created_at)}</div>
                </div>
                <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>PAID</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity Feed */}
      {(isLender || isBorrower) && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.4rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '2rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>Activity</div>
          {activitiesLoading ? (
            <div style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem' }}>Loading...</div>
          ) : activities.length === 0 ? (
            <div style={{ color: '#ccc', fontSize: '0.82rem', textAlign: 'center', padding: '0.5rem' }}>No activity yet</div>
          ) : (
            <div style={{ position: 'relative' }}>
              {activities.map((a, i) => {
                let meta = null;
                try { meta = a.meta ? JSON.parse(a.meta) : null; } catch {}
                return (
                  <div key={a.id} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    paddingBottom: i < activities.length - 1 ? '1rem' : 0,
                    position: 'relative',
                  }}>
                    {/* Timeline line */}
                    {i < activities.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 15, top: 28, bottom: 0,
                        width: 2, background: '#f0f0f0',
                      }} />
                    )}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#f8fafc', border: '2px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', flexShrink: 0, zIndex: 1,
                    }}>
                      {ACTIVITY_ICONS[a.type] || '•'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333' }}>
                        {ACTIVITY_LABELS[a.type] || a.type}
                        {a.user_name ? <span style={{ fontWeight: 400, color: '#888' }}> by {a.user_name}</span> : ''}
                      </div>
                      {meta && meta.amount && (
                        <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2 }}>
                          {fmt(meta.amount)} · remaining: {fmt(meta.remaining)}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: '#bbb', marginTop: 2 }}>{timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Signature Modal */}
      {showSignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.8rem', width: '100%', maxWidth: 400 }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sign Loan Agreement</div>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
              By signing, you agree to repay <strong>{fmt(loan.amount)}</strong> to <strong>{loan.lender_name}</strong> by <strong>{loan.due_date}</strong>.
            </div>
            <label style={{ fontWeight: 600, fontSize: '0.88rem', display: 'block', marginBottom: 6 }}>
              Type your full name as your digital signature
            </label>
            <input
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Your full name..."
              autoFocus
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '1rem' }}
            />
            {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowSignModal(false); setSignature(''); setError(''); }}
                style={{ flex: 1, padding: '0.75rem', background: '#e2e8f0', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                disabled={!signature.trim() || !!actionLoading}
                onClick={() => doAction('accept', () => api.acceptLoan(id, signature))}
                style={{ flex: 1, padding: '0.75rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', opacity: !signature.trim() ? 0.5 : 1 }}>
                {actionLoading === 'accept' ? 'Signing...' : 'Confirm & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
