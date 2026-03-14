import React, { useState } from 'react';

const SLIDES = [
  {
    icon: '💸',
    title: 'Record a Loan',
    description: "Track any money you lend or borrow with friends or family. Enter the amount, due date, and a note — done in seconds.",
  },
  {
    icon: '✍️',
    title: 'Borrower Signs Digitally',
    description: "The borrower receives an SMS and signs the loan agreement digitally. Both parties have a signed record they can download as PDF.",
  },
  {
    icon: '🔔',
    title: 'Auto Reminders Handle the Rest',
    description: "Settlr automatically sends SMS reminders 3 days before, on, and after the due date. No awkward follow-ups needed.",
  },
];

export default function Onboarding({ onClose }) {
  const [slide, setSlide] = useState(0);

  function handleNext() {
    if (slide < SLIDES.length - 1) {
      setSlide(s => s + 1);
    } else {
      localStorage.setItem('loanpal_onboarded', '1');
      onClose();
    }
  }

  function handleBack() {
    setSlide(s => s - 1);
  }

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '2.5rem 2rem',
        maxWidth: 380,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Slide indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '2rem' }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: i === slide ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === slide ? '#667eea' : '#e2e8f0',
              transition: 'width 0.3s ease',
            }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{
          fontSize: '3.5rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea22, #764ba222)',
          borderRadius: '50%',
          width: 90,
          height: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.2rem',
        }}>
          {current.icon}
        </div>

        {/* Title */}
        <div style={{
          fontSize: '1.3rem',
          fontWeight: 800,
          color: '#1a1a2e',
          marginBottom: '0.75rem',
        }}>
          {current.title}
        </div>

        {/* Description */}
        <div style={{
          color: '#666',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
          minHeight: 70,
        }}>
          {current.description}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {slide > 0 && (
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: '0.8rem',
                background: '#e2e8f0',
                border: 'none',
                borderRadius: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#555',
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              flex: 2,
              padding: '0.8rem',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: '#fff',
            }}
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
