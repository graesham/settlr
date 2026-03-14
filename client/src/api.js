const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  sendOTP: (phone, name) => request('/auth/send-otp', { method: 'POST', body: { phone, name } }),
  verifyOTP: (phone, code, name) => request('/auth/verify-otp', { method: 'POST', body: { phone, code, name } }),

  // Loans
  getLoans: () => request('/loans'),
  getLoan: (id) => request(`/loans/${id}`),
  createLoan: (data) => request('/loans', { method: 'POST', body: data }),
  acceptLoan: (id, signature) => request(`/loans/${id}/accept`, { method: 'PATCH', body: { signature } }),
  declineLoan: (id) => request(`/loans/${id}/decline`, { method: 'PATCH' }),
  markPaid: (id) => request(`/loans/${id}/paid`, { method: 'PATCH' }),
  createRequest: (data) => request('/loans/request', { method: 'POST', body: data }),

  // Credit
  getCreditScore: (phone) => request(`/credit/${encodeURIComponent(phone)}`),
  getMyCreditScore: () => request('/credit/me/score'),

  // Payments
  getPayments: (loanId) => request(`/loans/${loanId}/payments`),
  addPayment: (loanId, data) => request(`/loans/${loanId}/payments`, { method: 'POST', body: data }),

  // Activities
  getActivities: (loanId) => request(`/loans/${loanId}/activities`),

  // Notifications
  getNotifications: () => request('/notifications'),
  getNotificationCount: () => request('/notifications/count'),
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Analytics
  getPlatformAnalytics: () => request('/analytics/platform'),
  getMyAnalytics: () => request('/analytics/me'),

  // Profile
  getProfile: (phone) => request(`/profile/${encodeURIComponent(phone)}`),
};
