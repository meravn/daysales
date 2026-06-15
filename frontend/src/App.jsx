import { useState, useEffect } from 'react';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import AgentApp from './pages/AgentApp.jsx';
import DistrictApp from './pages/DistrictApp.jsx';
import ManagementApp from './pages/ManagementApp.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(d => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ marginTop: '40vh' }} />;

  if (!user) return <Login onLogin={setUser} />;

  const onLogout = () => api.logout().then(() => setUser(null)).catch(() => setUser(null));

  if (user.role === 'management') return <ManagementApp user={user} onLogout={onLogout} />;
  if (user.role === 'district_manager') return <DistrictApp user={user} onLogout={onLogout} />;
  return <AgentApp user={user} onLogout={onLogout} />;
}
