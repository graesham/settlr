import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  async function fetchCount() {
    try {
      const data = await api.getNotificationCount();
      setCount(data.count);
    } catch {}
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen(!open);
    if (!open) fetchNotifications();
  }

  async function handleMarkAll() {
    try {
      await api.markAllRead();
      setNotifications([]);
      setCount(0);
    } catch {}
  }

  async function handleMarkOne(id) {
    try {
      await api.markRead(id);
      setNotifications(n => n.filter(x => x.id !== id));
      setCount(c => Math.max(0, c - 1));
    } catch {}
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          background: open ? '#667eea22' : '#e2e8f0',
          border: 'none',
          borderRadius: 10,
          padding: '0.55rem 0.75rem',
          cursor: 'pointer',
          fontSize: '1.1rem',
          lineHeight: 1,
        }}
        title="Notifications"
      >
        {'\uD83D\uDD14'}
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#dc2626',
            color: '#fff',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: '0.65rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: 320,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.9rem 1rem',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.88rem' }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.88rem' }}>No new notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    background: '#fff',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: '#333', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 3 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  <button
                    onClick={() => handleMarkOne(n.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ccc',
                      fontSize: '0.85rem',
                      padding: '0 4px',
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    title="Dismiss"
                  >
                    x
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
