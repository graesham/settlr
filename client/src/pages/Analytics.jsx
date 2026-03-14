import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const STATUS_COLOR = {
  active: { bg: '#fef3c7', text: '#92400e', label: 'Active' },
  pending: { bg: '#ede9fe', text: '#5b21b6', label: 'Pending' },
  paid: { bg: '#dcfce7', text: '#15803d', label: 'Paid' },
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fda085, #f6d365)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
];

function avatarGradient(name) {
  const code = (name || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

function PersonCard({ loan, type }) {
  const navigate = useNavigate();
  const remaining = Math.max(0, loan.amount - loan.paid_amount);
  const pct = loan.amount > 0 ? Math.min(100, Math.round((loan.paid_amount / loan.amount) * 100)) : 0;
  const status = STATUS_COLOR[loan.status] || STATUS_COLOR.active;
  const isOverdue = loan.status === 'active' && loan.due_date && new Date(loan.due_date) < new Date();

  return (
    <div
      onClick={() => navigate(`/loan/${loan.id}`)}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '1rem',
        marginBottom: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        border: isOverdue ? '1.5px solid #fca5a5' : '1.5px solid transparent',
        transition: 'box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.7rem' }}>
        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: avatarGradient(loan.person_name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0,
        }}>
          {initials(loan.person_name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loan.person_name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#888' }}>
            Due {loan.due_date} {isOverdue && <span style={{ color: '#ef4444', fontWeight: 600 }}>· Overdue</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: type === 'owed' ? '#16a34a' : '#dc2626' }}>
            {fmt(remaining)}
          </div>
          <span style={{
            background: status.bg, color: status.text,
            borderRadius: 20, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600,
          }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {loan.status !== 'pending' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#999', marginBottom: 4 }}>
            <span>Paid {fmt(loan.paid_amount)}</span>
            <span>{pct}% of {fmt(loan.amount)}</span>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 99,
              background: pct === 100 ? '#16a34a' : type === 'owed' ? 'linear-gradient(90deg, #667eea, #764ba2)' : 'linear-gradient(90deg, #f093fb, #f5576c)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [myLoans, setMyLoans] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyAnalytics(), api.getMyLoans()])
      .then(([stats, loans]) => { setMe(stats); setMyLoans(loans); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalOwedToMe = myLoans?.owedToMe
    .filter(l => l.status !== 'paid')
    .reduce((s, l) => s + Math.max(0, l.amount - l.paid_amount), 0) || 0;

  const totalIOwe = myLoans?.iOwe
    .filter(l => l.status !== 'paid')
    .reduce((s, l) => s + Math.max(0, l.amount - l.paid_amount), 0) || 0;

  const netPosition = totalOwedToMe - totalIOwe;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: 20, padding: '1.5rem', color: '#fff', marginBottom: '1.5rem',
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
          padding: '0.4rem 0.9rem', color: '#fff', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.85rem', marginBottom: '1rem', display: 'block',
        }}>← Back</button>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>My Money Map</div>
        <div style={{ opacity: 0.85, fontSize: '0.88rem' }}>Who owes you · Who you owe</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading...</div>
      ) : (
        <>
          {/* Net Position Banner */}
          <div style={{
            background: netPosition >= 0
              ? 'linear-gradient(135deg, #16a34a, #15803d)'
              : 'linear-gradient(135deg, #dc2626, #b91c1c)',
            borderRadius: 16, padding: '1.2rem 1.4rem', color: '#fff',
            marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: 2 }}>NET POSITION</div>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>{fmt(Math.abs(netPosition))}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                {netPosition >= 0 ? 'You are owed more than you owe' : 'You owe more than you are owed'}
              </div>
            </div>
            <div style={{ fontSize: '3rem' }}>{netPosition >= 0 ? '📈' : '📉'}</div>
          </div>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              borderRadius: 14, padding: '1rem', color: '#fff',
            }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, marginBottom: 4, textTransform: 'uppercase' }}>Owed to You</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{fmt(totalOwedToMe)}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>{myLoans?.owedToMe.filter(l => l.status !== 'paid').length} active loans</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              borderRadius: 14, padding: '1rem', color: '#fff',
            }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, marginBottom: 4, textTransform: 'uppercase' }}>You Owe</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{fmt(totalIOwe)}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>{myLoans?.iOwe.filter(l => l.status !== 'paid').length} active loans</div>
            </div>
          </div>

          {/* People who owe you */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontWeight: 700, fontSize: '1rem', color: '#1a1a2e', marginBottom: '0.75rem',
            }}>
              <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 8, padding: '2px 8px', fontSize: '0.8rem' }}>
                💰 Owed to You
              </span>
              <span style={{ color: '#888', fontWeight: 400, fontSize: '0.85rem' }}>
                {myLoans?.owedToMe.length || 0} people
              </span>
            </div>
            {myLoans?.owedToMe.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
                No one owes you right now
              </div>
            ) : (
              myLoans.owedToMe.map(loan => (
                <PersonCard key={loan.id} loan={loan} type="owed" />
              ))
            )}
          </div>

          {/* People you owe */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontWeight: 700, fontSize: '1rem', color: '#1a1a2e', marginBottom: '0.75rem',
            }}>
              <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '2px 8px', fontSize: '0.8rem' }}>
                💸 You Owe
              </span>
              <span style={{ color: '#888', fontWeight: 400, fontSize: '0.85rem' }}>
                {myLoans?.iOwe.length || 0} people
              </span>
            </div>
            {myLoans?.iOwe.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
                You don't owe anyone right now
              </div>
            ) : (
              myLoans.iOwe.map(loan => (
                <PersonCard key={loan.id} loan={loan} type="owe" />
              ))
            )}
          </div>

          {/* Personal stats */}
          {me && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.4rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '2rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>📊 Your Stats</div>
              {[
                { label: 'Recovery Rate', value: `${me.recoveryRate}%`, color: me.recoveryRate >= 80 ? '#16a34a' : me.recoveryRate >= 50 ? '#f59e0b' : '#dc2626' },
                { label: 'Total Ever Lent', value: fmt(me.totalLent), color: '#16a34a' },
                { label: 'Total Ever Borrowed', value: fmt(me.totalBorrowed), color: '#dc2626' },
                { label: 'On-Time Payments', value: me.onTimePayments, color: '#16a34a' },
                { label: 'Late Payments', value: me.latePayments, color: me.latePayments > 0 ? '#dc2626' : '#888' },
                { label: 'Avg Loan Size', value: fmt(me.avgLoanSize), color: '#667eea' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.65rem 0', borderBottom: '1px solid #f0f0f0',
                }}>
                  <span style={{ color: '#555', fontSize: '0.9rem' }}>{label}</span>
                  <span style={{ fontWeight: 700, color, fontSize: '0.95rem' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
