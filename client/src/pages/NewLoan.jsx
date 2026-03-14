import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function NewLoan() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('lender'); // 'lender' | 'borrower'
  const [form, setForm] = useState({ phone: '', amount: '', note: '', due_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creditScore, setCreditScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState('');

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (k === 'phone') { setCreditScore(null); setScoreError(''); }
  };

  async function lookupScore() {
    if (!form.phone || mode !== 'lender') return;
    setScoreLoading(true);
    setScoreError('');
    setCreditScore(null);
    try {
      const score = await api.getCreditScore(form.phone);
      setCreditScore(score);
    } catch (e) {
      setScoreError('Could not fetch score: ' + e.message);
    } finally {
      setScoreLoading(false);
    }
  }

  // Default min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.phone || !form.amount || !form.due_date) {
      return setError('Please fill in all required fields');
    }
    setLoading(true); setError('');
    try {
      if (mode === 'lender') {
        await api.createLoan({ borrower_phone: form.phone, amount: parseFloat(form.amount), note: form.note, due_date: form.due_date });
      } else {
        await api.createRequest({ lender_phone: form.phone, amount: parseFloat(form.amount), note: form.note, due_date: form.due_date });
      }
      navigate('/?created=1');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const s = {
    page: { maxWidth: 500, margin: '0 auto', padding: '1rem' },
    header: { display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 0 1.5rem' },
    back: { background: '#e2e8f0', border: 'none', borderRadius: 10, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 },
    title: { fontWeight: 800, fontSize: '1.3rem', color: '#1a1a2e' },
    card: { background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
    label: { display: 'block', fontWeight: 600, marginBottom: 6, color: '#333', fontSize: '0.9rem' },
    input: { width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '1rem', outline: 'none', marginBottom: '1.2rem', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
    error: { background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' },
    hint: { color: '#aaa', fontSize: '0.78rem', marginTop: -10, marginBottom: '1.2rem' },
  };

  const isLender = mode === 'lender';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.back} onClick={() => navigate('/')}>Back</button>
        <div style={s.title}>{isLender ? 'Record a New Loan' : 'Request to Borrow'}</div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: '1.2rem' }}>
        <button
          onClick={() => { setMode('lender'); setForm({ phone: '', amount: '', note: '', due_date: '' }); setCreditScore(null); setError(''); }}
          style={{
            flex: 1, padding: '0.6rem', border: 'none', borderRadius: 10, cursor: 'pointer',
            fontWeight: 700, fontSize: '0.9rem',
            background: isLender ? '#fff' : 'transparent',
            color: isLender ? '#667eea' : '#888',
            boxShadow: isLender ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          I lent money
        </button>
        <button
          onClick={() => { setMode('borrower'); setForm({ phone: '', amount: '', note: '', due_date: '' }); setCreditScore(null); setError(''); }}
          style={{
            flex: 1, padding: '0.6rem', border: 'none', borderRadius: 10, cursor: 'pointer',
            fontWeight: 700, fontSize: '0.9rem',
            background: !isLender ? '#fff' : 'transparent',
            color: !isLender ? '#667eea' : '#888',
            boxShadow: !isLender ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          I'm requesting to borrow
        </button>
      </div>

      <div style={s.card}>
        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>
            {isLender ? "Borrower's Phone Number *" : "Lender's Phone Number *"}
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <input
              style={{ ...s.input, marginBottom: 0, flex: 1 }}
              value={form.phone}
              onChange={set('phone')}
              placeholder="+1 555 123 4567"
              type="tel"
            />
            {isLender && (
              <button type="button" onClick={lookupScore} disabled={!form.phone || scoreLoading}
                style={{ padding: '0 1rem', background: '#e2e8f0', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                {scoreLoading ? '...' : 'Check Score'}
              </button>
            )}
          </div>

          {isLender && scoreLoading && (
            <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '0.8rem', color: '#888', fontSize: '0.85rem' }}>
              Checking credit score...
            </div>
          )}
          {isLender && scoreError && (
            <div style={{ background: '#fee2e2', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '0.8rem', color: '#dc2626', fontSize: '0.85rem' }}>
              {scoreError}
            </div>
          )}
          {isLender && creditScore && !scoreLoading && (
            <div style={{ background: creditScore.color + '18', border: `2px solid ${creditScore.color}55`, borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: creditScore.color }}>
                  {creditScore.name ? `${creditScore.name}'s Credit Score` : 'Credit Score'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                  {creditScore.stats
                    ? `${creditScore.stats.paid} paid on time · ${creditScore.stats.late} late · ${creditScore.stats.overdue} overdue`
                    : creditScore.score === null ? 'New user — no loan history' : 'No loan history yet'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: creditScore.color, lineHeight: 1 }}>
                  {creditScore.score ?? '?'}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: creditScore.color }}>
                  {creditScore.grade} · {creditScore.label}
                </div>
              </div>
            </div>
          )}

          <div style={s.hint}>
            {isLender ? "They'll receive an SMS notification" : "They'll get notified to accept your request"}
          </div>

          <label style={s.label}>Amount ($) *</label>
          <input style={s.input} value={form.amount} onChange={set('amount')}
            placeholder="0.00" type="number" min="0.01" step="0.01" />

          <label style={s.label}>Due Date *</label>
          <input style={s.input} value={form.due_date} onChange={set('due_date')}
            type="date" min={minDate} />

          <label style={s.label}>Note (optional)</label>
          <input style={s.input} value={form.note} onChange={set('note')}
            placeholder="e.g. Rent split, Birthday gift..." />

          <button style={s.btn} disabled={loading}>
            {loading
              ? (isLender ? 'Creating...' : 'Sending Request...')
              : (isLender ? 'Record Loan & Notify Borrower' : 'Send Borrow Request')}
          </button>
        </form>
      </div>

      <div style={{ color: '#aaa', fontSize: '0.82rem', textAlign: 'center', marginTop: '1.5rem', lineHeight: 1.6 }}>
        {isLender
          ? 'The borrower will receive an SMS. Automatic reminders are sent 3 days before, on, and after the due date.'
          : 'The lender will receive an SMS notification to review your request.'}
      </div>
    </div>
  );
}
