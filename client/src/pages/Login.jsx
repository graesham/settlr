import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { background: '#fff', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  logo: { textAlign: 'center', marginBottom: '2rem' },
  logoText: { fontSize: '2.4rem', fontWeight: 900, background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' },
  tagline: { color: '#888', fontSize: '0.9rem', marginTop: 4 },
  label: { display: 'block', fontWeight: 600, marginBottom: 6, color: '#333', fontSize: '0.9rem' },
  input: { width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '1rem', outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  btnSecondary: { width: '100%', padding: '0.85rem', background: '#e2e8f0', color: '#666', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' },
  devNote: { background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '0.75rem', marginTop: '1rem', fontSize: '0.8rem' },
  step: { color: '#888', fontSize: '0.85rem', textAlign: 'center', marginTop: '1.5rem' },
  greeting: { color: '#667eea', fontWeight: 600, textAlign: 'center', marginBottom: '1rem', fontSize: '1rem' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // phone | name | otp
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [returning, setReturning] = useState(false);

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (!phone) return setError('Please enter your phone number');
    setLoading(true); setError('');
    try {
      const BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${BASE}/auth/check-user?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (data.exists) {
        setReturning(true);
        setName(data.name);
        // Send OTP directly for returning users
        const otpRes = await api.sendOTP(phone.trim(), data.name);
        if (otpRes.dev_code) setDevCode(otpRes.dev_code);
        setStep('otp');
      } else {
        setReturning(false);
        setStep('name');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleNameSubmit(e) {
    e.preventDefault();
    if (!name) return setError('Please enter your name');
    setLoading(true); setError('');
    try {
      const res = await api.sendOTP(phone.trim(), name.trim());
      if (res.dev_code) setDevCode(res.dev_code);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.verifyOTP(phone.trim(), code.trim(), name.trim());
      login(res.user, res.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoText}>Settlr</div>
          <div style={s.tagline}>Lending made honest. Repayment made easy.</div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Phone Number</label>
              <input style={s.input} value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 123 4567" type="tel" autoFocus />
            </div>
            <button style={s.btn} disabled={loading}>{loading ? 'Checking...' : 'Continue'}</button>
            <div style={s.step}>Step 1 of 2</div>
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={handleNameSubmit}>
            <div style={s.greeting}>Welcome to Settlr!</div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Your Name</label>
              <input style={s.input} value={name} onChange={e => setName(e.target.value)}
                placeholder="John Doe" autoFocus />
            </div>
            <button style={s.btn} disabled={loading}>{loading ? 'Sending code...' : 'Send Verification Code'}</button>
            <button type="button" style={s.btnSecondary} onClick={() => { setStep('phone'); setError(''); }}>Back</button>
            <div style={s.step}>Step 1 of 2</div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            {returning && <div style={s.greeting}>Welcome back, {name}!</div>}
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Enter 6-digit code sent to {phone}</label>
              <input style={{ ...s.input, letterSpacing: 8, textAlign: 'center', fontSize: '1.5rem' }}
                value={code} onChange={e => setCode(e.target.value)}
                placeholder="······" maxLength={6} autoFocus />
            </div>
            <button style={s.btn} disabled={loading}>{loading ? 'Verifying...' : 'Verify & Sign In'}</button>
            <button type="button" style={s.btnSecondary}
              onClick={() => { setStep('phone'); setCode(''); setDevCode(''); setError(''); }}>
              Change Phone
            </button>
            <div style={s.step}>Step 2 of 2</div>
          </form>
        )}

        {devCode && (
          <div style={s.devNote}>
            <strong>Your OTP code:</strong> <strong style={{ fontSize: '1.1rem' }}>{devCode}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
