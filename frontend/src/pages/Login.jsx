import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api.login(mobile.trim());
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        </div>
        <h2>מערכת דיווח מכירות</h2>
        <p>הזן את מספר הנייד שלך להתחברות</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">מספר נייד</label>
            <input
              className="form-input"
              type="tel"
              placeholder="050-1234567"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading || !mobile}>
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}
