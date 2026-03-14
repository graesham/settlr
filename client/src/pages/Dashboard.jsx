import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';
import NotificationBell from '../components/NotificationBell';

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date(new Date().toDateString());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ScoreBadge({ score, label, color, grade }) {
  if (score === null) return <span style={{ color: '#888', fontSize: '0.8rem' }}>No history</span>;
  return (
    <span style={{ background: color + '22', color, borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: '0.8rem' }}>
      {grade} · {label} ({score})
    </span>
  );
}

function LoanCard({ loan, userId }) {
  const isLender = loan.lender_id === userId;
  const days = daysUntil(loan.due_date);
  const overdue = loan.status === 'active' && days < 0;
  const dueSoon = loan.status === 'active' && days >= 0 && days <= 3;
  const other = isLender ? (loan.borrower_name || loan.borrower_phone) : loan.lender_name;

  let borderColor = '#e2e8f0';
  if (overdue) borderColor = '#dc2626';
  else if (dueSoon) borderColor = '#f59e0b';
  else if (loan.status === 'paid') borderColor = '#16a34a';

  return (
    <Link to={`/loan/${loan.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '1rem 1.2rem',
        marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${borderColor}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.95rem' }}>
            {isLender ? `Lent to ${other}` : `Owe ${other}`}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 2 }}>
            Due: {loan.due_date}
            {overdue && <span style={{ color: '#dc2626', fontWeight: 700 }}> · OVERDUE</span>}
            {dueSoon && !overdue && <span style={{ color: '#f59e0b', fontWeight: 700 }}> · Due in {days}d</span>}
          </div>
          {loan.note && <div style={{ color: '#bbb', fontSize: '0.75rem' }}>"{loan.note}"</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: isLender ? '#16a34a' : '#dc2626' }}>
            {fmt(loan.amount)}
          </div>
          {loan.status === 'pending' && <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>Pending</div>}
          {loan.status === 'paid' && <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>Paid</div>}
        </div>
      </div>
    </Link>
  );
}

function UpcomingItem({ loan, userId }) {
  const isLender = loan.lender_id === userId;
  const days = daysUntil(loan.due_date);
  const other = isLender ? (loan.borrower_name || loan.borrower_phone) : loan.lender_name;
  const overdue = days < 0;

  return (
    <Link to={`/loan/${loan.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.7rem 1rem', background: overdue ? '#fff5f5' : days <= 1 ? '#fffbeb' : '#f9fafb',
        borderRadius: 10, marginBottom: 8,
        border: `1px solid ${overdue ? '#fecaca' : days <= 1 ? '#fde68a' : '#e5e7eb'}`,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1a1a2e' }}>
            {isLender ? `${other} owes you` : `You owe ${other}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: overdue ? '#dc2626' : days <= 1 ? '#d97706' : '#888' }}>
            {overdue ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due TODAY' : `Due in ${days} day${days !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ fontWeight: 800, color: isLender ? '#16a34a' : '#dc2626', fontSize: '0.95rem' }}>
          {fmt(loan.amount)}
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loans, setLoans] = useState([]);
  const [myScore, setMyScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const justCreated = location.search.includes('created=1');

  useEffect(() => {
    Promise.all([
      api.getLoans(),
      api.getMyCreditScore(),
    ]).then(([loansData, scoreData]) => {
      setLoans(loansData);
      setMyScore(scoreData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active = loans.filter(l => l.status === 'active' || l.status === 'pending');
  const lent = active.filter(l => l.lender_id === user.id);
  const owed = active.filter(l => l.borrower_id === user.id);
  const history = loans.filter(l => l.status === 'paid' || l.status === 'declined');

  const totalLent = lent.reduce((s, l) => s + l.amount, 0);
  const totalOwed = owed.reduce((s, l) => s + l.amount, 0);

  // Upcoming: active loans due within 14 days or overdue
  const upcoming = [...lent, ...owed]
    .filter(l => l.status === 'active')
    .filter(l => daysUntil(l.due_date) <= 14)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const overdueCount = upcoming.filter(l => daysUntil(l.due_date) < 0).length;

  // Premium upsell: show if not premium and has 2+ active loans as lender
  const activeLentCount = lent.length;
  const showUpgradeBanner = !user.premium && activeLentCount >= 2;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '1.2rem 1.2rem 1.4rem',
        borderRadius: '0 0 24px 24px',
      }}>
        {/* Brand + icons row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Settlr
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <NotificationBell />
            <div
              onClick={logout}
              title="Sign out"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontWeight: 800, color: '#fff', fontSize: '0.95rem',
                border: '2px solid rgba(255,255,255,0.4)',
              }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>Welcome back</div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.7rem' }}>
          {user.name}
        </div>
        {myScore && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '4px 14px', marginBottom: '1.2rem' }}>
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>Credit Score</span>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.88rem' }}>{myScore.score}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem' }}>{myScore.grade} · {myScore.label}</span>
          </div>
        )}

        {/* Action buttons — inside header, no overlap */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/new-loan')} style={{
            flex: 2, padding: '0.65rem 0', background: '#fff',
            color: '#667eea', border: 'none', borderRadius: 10,
            fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem',
          }}>+ New Loan</button>
          <button onClick={() => navigate('/analytics')} style={{
            flex: 1, padding: '0.65rem 0', background: 'rgba(255,255,255,0.15)',
            color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10,
            fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem',
          }}>Analytics</button>
          <button onClick={() => navigate('/upgrade')} style={{
            flex: 1, padding: '0.65rem 0', background: 'rgba(255,255,255,0.15)',
            color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10,
            fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem',
          }}>Upgrade</button>
          {user?.phone?.replace(/\D/g,'') === '14698889968' && (
            <button onClick={() => navigate('/admin')} style={{
              flex: 1, padding: '0.65rem 0', background: 'rgba(0,0,0,0.3)',
              color: '#fff', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 10,
              fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem',
            }}>🛡️</button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: '1.2rem' }}>

      {/* Success banner */}
      {justCreated && (
        <div style={{ background: '#dcfce7', color: '#166534', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
          Loan recorded! The borrower has been notified.
        </div>
      )}

      {/* Premium upsell banner */}
      {showUpgradeBanner && (
        <div
          onClick={() => navigate('/upgrade')}
          style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '1.5px solid #fbbf24',
            borderRadius: 12,
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.88rem' }}>
              You have {activeLentCount}/3 free loans
            </div>
            <div style={{ color: '#b45309', fontSize: '0.78rem' }}>Upgrade to Premium for unlimited loans</div>
          </div>
          <span style={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem' }}>Go Premium</span>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '1.2rem 0' }}>
        <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', borderRadius: 14, padding: '1.1rem', color: '#fff' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Lent Out</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>{fmt(totalLent)}</div>
          <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>{lent.length} loan{lent.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', borderRadius: 14, padding: '1.1rem', color: '#fff' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>I Owe</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>{fmt(totalOwed)}</div>
          <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>{owed.length} loan{owed.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto' }}>
        {[
          ['overview', 'Overview'],
          ['lent', `Lent (${lent.length})`],
          ['owed', `I Owe (${owed.length})`],
          ['history', 'History'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '0.45rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600,
            whiteSpace: 'nowrap', fontSize: '0.85rem',
            background: tab === key ? '#667eea' : '#e2e8f0',
            color: tab === key ? '#fff' : '#555',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Loading...</div>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              {/* Upcoming & Overdue */}
              {upcoming.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Upcoming Payments
                    {overdueCount > 0 && (
                      <span style={{ background: '#dc2626', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: '0.72rem' }}>
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>
                  {upcoming.map(l => <UpcomingItem key={l.id} loan={l} userId={user.id} />)}
                </div>
              )}

              {/* Who owes me */}
              {lent.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: 8 }}>
                    Money Owed to You
                  </div>
                  {lent.map(l => <LoanCard key={l.id} loan={l} userId={user.id} />)}
                </div>
              )}

              {/* What I owe */}
              {owed.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: 8 }}>
                    Money You Owe
                  </div>
                  {owed.map(l => <LoanCard key={l.id} loan={l} userId={user.id} />)}
                </div>
              )}

              {loans.length === 0 && (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}>
                  <div style={{ fontSize: '3rem' }}>💸</div>
                  <div style={{ marginTop: 8 }}>No loans yet</div>
                  <button onClick={() => navigate('/new-loan')} style={{
                    marginTop: '1rem', background: '#667eea', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '0.7rem 1.5rem', fontWeight: 600, cursor: 'pointer'
                  }}>Record your first loan</button>
                </div>
              )}
            </>
          )}

          {tab === 'lent' && (
            lent.length === 0
              ? <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>No active loans you've made</div>
              : lent.map(l => <LoanCard key={l.id} loan={l} userId={user.id} />)
          )}

          {tab === 'owed' && (
            owed.length === 0
              ? <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>You don't owe anyone right now</div>
              : owed.map(l => <LoanCard key={l.id} loan={l} userId={user.id} />)
          )}

          {tab === 'history' && (
            history.length === 0
              ? <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>No completed loans yet</div>
              : history.map(l => <LoanCard key={l.id} loan={l} userId={user.id} />)
          )}
        </>
      )}
      </div>{/* end content area */}
    </div>
  );
}
