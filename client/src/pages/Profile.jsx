import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function Profile() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProfile(phone)
      .then(setProfile)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [phone]);

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '4rem', color: '#dc2626' }}>{error}</div>;
  if (!profile) return null;

  const { name, creditScore: cs, stats } = profile;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '1rem 0 1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{
          background: '#e2e8f0', border: 'none', borderRadius: 10,
          padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600,
        }}>
          Back
        </button>
      </div>

      {/* Profile hero */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: 20,
        padding: '2rem 1.5rem',
        textAlign: 'center',
        color: '#fff',
        marginBottom: '1.2rem',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
          fontSize: '1.8rem', fontWeight: 900,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{name}</div>
        <div style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: 4 }}>Settlr Member</div>
      </div>

      {/* Credit score */}
      {cs && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '1.4rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '1rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Credit Score
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: cs.color, lineHeight: 1 }}>
            {cs.score ?? '?'}
          </div>
          <div style={{ fontWeight: 700, color: cs.color, marginTop: 6 }}>
            {cs.grade} · {cs.label}
          </div>
          {cs.stats && (
            <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 8 }}>
              {cs.stats.paid} paid on time · {cs.stats.late} late · {cs.stats.overdue} overdue
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '1.4rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: '0.75rem' }}>
          Loan History
        </div>
        {[
          ['Loans Completed', stats.loansCompleted],
          ['On-Time Rate', stats.onTimePercent !== null ? `${stats.onTimePercent}%` : 'N/A'],
          ['Total Borrowed', fmt(stats.totalBorrowed)],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '0.65rem 0', borderBottom: '1px solid #f0f0f0',
          }}>
            <span style={{ color: '#888', fontSize: '0.88rem' }}>{label}</span>
            <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.88rem' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
