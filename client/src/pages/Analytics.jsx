import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function StatCard({ label, value, sub, gradient }) {
  return (
    <div style={{
      background: gradient || 'linear-gradient(135deg, #667eea, #764ba2)',
      borderRadius: 16,
      padding: '1.2rem 1rem',
      color: '#fff',
      boxShadow: '0 4px 16px rgba(102,126,234,0.2)',
    }}>
      <div style={{ fontSize: '0.72rem', opacity: 0.85, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function PersonalRow({ label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.7rem 0',
      borderBottom: '1px solid #f0f0f0',
    }}>
      <span style={{ color: '#555', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || '#1a1a2e', fontSize: '0.95rem' }}>{value}</span>
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getPlatformAnalytics(),
      api.getMyAnalytics(),
    ]).then(([p, m]) => {
      setPlatform(p);
      setMe(m);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '1rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: 20,
        padding: '1.5rem',
        color: '#fff',
        marginBottom: '1.5rem',
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: 8,
          padding: '0.4rem 0.9rem',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
          marginBottom: '1rem',
          display: 'block',
        }}>
          Back
        </button>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>Analytics</div>
        <div style={{ opacity: 0.85, fontSize: '0.88rem' }}>Platform stats and your personal breakdown</div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '0.75rem', marginBottom: '1rem' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading analytics...</div>
      ) : (
        <>
          {/* Platform Stats */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>
              Platform Stats
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard
                label="Total Loans Tracked"
                value={platform?.totalLoans ?? 0}
                sub="All time"
                gradient="linear-gradient(135deg, #667eea, #764ba2)"
              />
              <StatCard
                label="Total Users"
                value={platform?.totalUsers ?? 0}
                sub="Registered"
                gradient="linear-gradient(135deg, #2563eb, #1d4ed8)"
              />
              <StatCard
                label="Total Volume"
                value={fmt(platform?.totalVolume ?? 0)}
                sub="Tracked"
                gradient="linear-gradient(135deg, #16a34a, #15803d)"
              />
              <StatCard
                label="Recovery Rate"
                value={`${platform?.recoveryRate ?? 0}%`}
                sub="Loans paid back"
                gradient="linear-gradient(135deg, #f59e0b, #d97706)"
              />
              <StatCard
                label="Avg Loan Amount"
                value={fmt(platform?.avgLoanAmount ?? 0)}
                gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
              />
              <StatCard
                label="Active Loans"
                value={platform?.activeLoans ?? 0}
                sub="Currently open"
                gradient="linear-gradient(135deg, #dc2626, #b91c1c)"
              />
            </div>
          </div>

          {/* Personal Stats */}
          {me && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.4rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '2rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e', marginBottom: '0.5rem' }}>
                Your Stats
              </div>
              <PersonalRow label="Total Lent Out" value={fmt(me.totalLent)} color="#16a34a" />
              <PersonalRow label="Total Borrowed" value={fmt(me.totalBorrowed)} color="#dc2626" />
              <PersonalRow label="Loans Lent" value={me.loansLent} />
              <PersonalRow label="Loans Borrowed" value={me.loansBorrowed} />
              <PersonalRow label="Recovery Rate" value={`${me.recoveryRate}%`} color={me.recoveryRate >= 80 ? '#16a34a' : me.recoveryRate >= 50 ? '#f59e0b' : '#dc2626'} />
              <PersonalRow label="On-Time Payments" value={me.onTimePayments} color="#16a34a" />
              <PersonalRow label="Late Payments" value={me.latePayments} color={me.latePayments > 0 ? '#dc2626' : '#888'} />
              <PersonalRow label="Avg Loan Size" value={fmt(me.avgLoanSize)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
