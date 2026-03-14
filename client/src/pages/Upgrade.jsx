import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Toast({ message, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1a1a2e',
      color: '#fff',
      borderRadius: 12,
      padding: '0.75rem 1.5rem',
      fontWeight: 600,
      fontSize: '0.9rem',
      zIndex: 9999,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>x</button>
    </div>
  );
}

function CheckItem({ children, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <span style={{ color: color || '#16a34a', fontWeight: 700, fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>✓</span>
      <span style={{ color: '#444', fontSize: '0.9rem', lineHeight: 1.4 }}>{children}</span>
    </div>
  );
}

export default function Upgrade() {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');

  function handleUpgrade() {
    setToast('Coming soon — payment processing');
    setTimeout(() => setToast(''), 3500);
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '1rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '1rem 0 1.5rem' }}>
        <button onClick={() => navigate('/')} style={{
          background: '#e2e8f0', border: 'none', borderRadius: 10,
          padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
        }}>
          Back
        </button>
      </div>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: 20,
        padding: '2rem 1.5rem',
        textAlign: 'center',
        color: '#fff',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 32px rgba(102,126,234,0.3)',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⭐</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 4 }}>Go Premium</div>
        <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>Unlock the full Settlr experience</div>
      </div>

      {/* Plans side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
        {/* Free */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '1.2rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          border: '2px solid #e2e8f0',
        }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1a1a2e', marginBottom: 4 }}>Free</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#666', marginBottom: 12 }}>$0</div>
          <CheckItem color="#888">Up to 3 active loans</CheckItem>
          <CheckItem color="#888">Basic SMS reminders</CheckItem>
          <CheckItem color="#888">Credit score view</CheckItem>
          <CheckItem color="#888">Digital signatures</CheckItem>
        </div>

        {/* Premium */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          borderRadius: 16,
          padding: '1.2rem',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(102,126,234,0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 10, right: -16,
            background: '#f59e0b', color: '#fff',
            fontSize: '0.65rem', fontWeight: 800,
            padding: '2px 20px', transform: 'rotate(35deg)',
          }}>POPULAR</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>Premium</div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>$4.99</span>
            <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>/mo</span>
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.75, marginBottom: 12 }}>Cancel anytime</div>
          <CheckItem color="#fff">Unlimited loans</CheckItem>
          <CheckItem color="#fff">PDF agreements</CheckItem>
          <CheckItem color="#fff">Full credit history</CheckItem>
          <CheckItem color="#fff">Priority SMS reminders</CheckItem>
          <CheckItem color="#fff">Analytics dashboard</CheckItem>
        </div>
      </div>

      {/* Feature comparison */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.4rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: '1rem' }}>
          Everything in Premium
        </div>
        {[
          ['Unlimited loans', 'No more 3-loan cap. Track everything.'],
          ['PDF loan agreements', 'Download signed contracts for any loan.'],
          ['Full credit history', 'See detailed repayment history for any user.'],
          ['Priority SMS reminders', 'Faster, more frequent automated nudges.'],
          ['Advanced analytics', 'Recovery rates, trends, and personal stats.'],
        ].map(([title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
            <span style={{
              background: '#667eea22', color: '#667eea',
              borderRadius: '50%', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
            }}>✓</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a2e' }}>{title}</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleUpgrade}
        style={{
          width: '100%',
          padding: '1rem',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          fontSize: '1rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(102,126,234,0.4)',
          marginBottom: '0.75rem',
        }}
      >
        Upgrade Now — $4.99/mo
      </button>
      <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.78rem' }}>
        Cancel anytime. No hidden fees.
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
