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
  input: { width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '1rem', outline: 'none', transition: 'border 0.2s' },
  btn: { width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' },
  success: { background: '#dcfce7', color: '#16a34a', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' },
  step: { color: '#888', fontSize: '0.85rem', textAlign: 'center', marginTop: '1.5rem' },
  devNote: { background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '0.75rem', marginTop: '1rem', fontSize: '0.8rem' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  async function handleSendOTP(e) {
    e.preventDefault();
    if (!phone || !name) return setError('Please enter your name and phone number');
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

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Your Name</label>
              <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Phone Number</label>
              <input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" type="tel" />
            </div>
            <button style={s.btn} disabled={loading}>{loading ? 'Sending...' : 'Send Verification Code'}</button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Enter 6-digit code sent to {phone}</label>
              <input style={{ ...s.input, letterSpacing: 8, textAlign: 'center', fontSize: '1.5rem' }}
                value={code} onChange={e => setCode(e.target.value)} placeholder="······" maxLength={6} autoFocus />
            </div>
            <button style={s.btn} disabled={loading}>{loading ? 'Verifying...' : 'Verify & Sign In'}</button>
            <button type="button" style={{ ...s.btn, background: '#e2e8f0', color: '#666', marginTop: 8 }}
              onClick={() => { setStep('phone'); setCode(''); setDevCode(''); }}>
              Change Phone
            </button>
          </form>
        )}

        {devCode && (
          <div style={s.devNote}>
            <strong>Dev Mode:</strong> Your OTP is <strong>{devCode}</strong> (Twilio not configured)
          </div>
        )}

        <div style={s.step}>{step === 'phone' ? 'Step 1 of 2' : 'Step 2 of 2'}</div>
      </div>
    </div>
  );
}
