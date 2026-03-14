import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewLoan from './pages/NewLoan';
import LoanDetail from './pages/LoanDetail';
import Analytics from './pages/Analytics';
import Upgrade from './pages/Upgrade';
import Profile from './pages/Profile';
import Onboarding from './components/Onboarding';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function OnboardingWrapper({ children }) {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !localStorage.getItem('loanpal_onboarded')) {
      setShowOnboarding(true);
    }
  }, [user]);

  return (
    <>
      {children}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  function login(userData, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <OnboardingWrapper>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/new-loan" element={<PrivateRoute><NewLoan /></PrivateRoute>} />
            <Route path="/loan/:id" element={<LoanDetail />} />
            <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
            <Route path="/upgrade" element={<PrivateRoute><Upgrade /></PrivateRoute>} />
            <Route path="/profile/:phone" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </OnboardingWrapper>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
