import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_STYLE = {
  active: { bg: '#fef3c7', color: '#92400e' },
  pending: { bg: '#ede9fe', color: '#5b21b6' },
  paid: { bg: '#dcfce7', color: '#15803d' },
  declined: { bg: '#fee2e2', color: '#dc2626' },
};

function MiniBar({ data, color }) {
  if (!data?.length) return <div style={{ color: '#aaa', fontSize: '0.8rem' }}>No data yet</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: '100%', borderRadius: 3,
            height: `${Math.max(4, (d.count / max) * 44)}px`,
            background: color,
            opacity: i === data.length - 1 ? 1 : 0.5 + (i / data.length) * 0.5,
          }} />
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAdminData()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ color: '#888' }}>Loading admin data...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🚫</div>
        <div style={{ fontWeight: 600 }}>Access Denied</div>
        <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Admin only</div>
        <button onClick={() => navigate('/')} style={{ marginTop: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer' }}>Go Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        borderRadius: 20, padding: '1.5rem', color: '#fff', marginBottom: '1.5rem',
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
          padding: '0.4rem 0.9rem', color: '#fff', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.85rem', marginBottom: '1rem', display: 'block',
        }}>← Back</button>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>🛡️ Admin Dashboard</div>
        <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>Platform overview · Owner only</div>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.2rem' }}>
        {[
          { label: 'Total Users', value: data.totalUsers, sub: `+${data.newUsersToday} today`, g: 'linear-gradient(135deg, #667eea, #764ba2)' },
          { label: 'This Week', value: `+${data.newUsersThisWeek}`, sub: 'New signups', g: 'linear-gradient(135deg, #16a34a, #15803d)' },
          { label: 'Total Loans', value: data.totalLoans, sub: 'All time', g: 'linear-gradient(135deg, #f59e0b, #d97706)' },
          { label: 'Total Volume', value: fmt(data.totalVolume), sub: 'Tracked', g: 'linear-gradient(135deg, #dc2626, #b91c1c)' },
        ].map(({ label, value, sub, g }) => (
          <div key={label} style={{ background: g, borderRadius: 14, padding: '1rem', color: '#fff' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.85, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Signup chart */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.2rem', marginBottom: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>📈 Signups — Last 14 Days</div>
        <MiniBar data={data.signupsPerDay} color="linear-gradient(180deg, #667eea, #764ba2)" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: '#aaa' }}>
          <span>{data.signupsPerDay[0]?.day?.slice(5) || ''}</span>
          <span>Today</span>
        </div>
      </div>

      {/* Loans chart */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.2rem', marginBottom: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>📋 Loans Created — Last 14 Days</div>
        <MiniBar data={data.loansPerDay} color="linear-gradient(180deg, #f59e0b, #d97706)" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: '#aaa' }}>
          <span>{data.loansPerDay[0]?.day?.slice(5) || ''}</span>
          <span>Today</span>
        </div>
      </div>

      {/* Recent signups */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.2rem', marginBottom: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>👥 Recent Signups</div>
        {data.recentUsers.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: '0.85rem' }}>No users yet</div>
        ) : data.recentUsers.map(u => (
          <div key={u.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.6rem 0', borderBottom: '1px solid #f5f5f5',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a2e' }}>{u.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{u.phone}</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{timeAgo(u.created_at)}</div>
          </div>
        ))}
      </div>

      {/* Recent loans */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.2rem', marginBottom: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>💸 Recent Loans</div>
        {data.recentLoans.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: '0.85rem' }}>No loans yet</div>
        ) : data.recentLoans.map(l => (
          <div key={l.id} onClick={() => navigate(`/loan/${l.id}`)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.6rem 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a2e' }}>
                {l.lender_name} → {l.borrower_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{timeAgo(l.created_at)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fmt(l.amount)}</div>
              <span style={{
                background: STATUS_STYLE[l.status]?.bg || '#f0f0f0',
                color: STATUS_STYLE[l.status]?.color || '#666',
                borderRadius: 20, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 600,
              }}>{l.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
