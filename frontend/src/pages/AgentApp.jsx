import { useState, useEffect } from 'react';
import { api } from '../api.js';

const CATEGORIES = [
  { key: 'pension', label: 'פנסיוני' },
  { key: 'finance', label: 'פיננסים' },
  { key: 'risks', label: 'סיכונים' },
  { key: 'elementary', label: 'אלמנטרי' },
];

function fmtNum(n) { return n ? Number(n).toLocaleString('he-IL') : '0'; }

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${months[+m - 1]} ${y}`;
}

export default function AgentApp({ user, onLogout }) {
  const [tab, setTab] = useState('entry');
  const today = new Date().toISOString().slice(0, 10);
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7));
  const [form, setForm] = useState({ pension: '', finance: '', risks: '', elementary: '' });
  const [salesData, setSalesData] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    api.getMySales(currentMonth).then(d => {
      setSalesData(d);
      if (d.todayRow && tab === 'entry') {
        setForm({
          pension: d.todayRow.pension || '',
          finance: d.todayRow.finance || '',
          risks: d.todayRow.risks || '',
          elementary: d.todayRow.elementary || '',
        });
      }
    }).catch(() => {});
  };

  useEffect(() => { loadData(); }, [currentMonth]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setError('');
    try {
      await api.submitSales({ date: today, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, +v || 0])) });
      setMsg('הנתונים נשמרו בהצלחה!');
      loadData();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const changeMonth = (dir) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <>
      <header className="app-header">
        <div>
          <h1>מערכת מכירות</h1>
          <div className="user-info">{user.name} · {user.district}</div>
        </div>
        <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)', fontSize: 13 }} onClick={onLogout}>יציאה</button>
      </header>

      <main className="main-content content-with-nav">
        {tab === 'entry' && (
          <div className="card">
            <div className="card-title">📝 דיווח יומי — {today.split('-').reverse().join('/')}</div>
            {msg && <div className="alert alert-success">{msg}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              {CATEGORIES.map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
                {saving ? 'שומר...' : '💾 שמור דיווח'}
              </button>
            </form>
          </div>
        )}

        {tab === 'history' && (
          <>
            <div className="month-nav">
              <button onClick={() => changeMonth(1)}>‹</button>
              <span>{monthLabel(currentMonth)}</span>
              <button onClick={() => changeMonth(-1)}>›</button>
            </div>

            {salesData && (
              <>
                <div className="stat-grid">
                  {CATEGORIES.map(({ key, label }) => (
                    <div className="stat-box" key={key}>
                      <div className="label">{label}</div>
                      <div className="value">{fmtNum(salesData.monthly?.[key])}</div>
                    </div>
                  ))}
                  <div className="stat-box total">
                    <div className="label">סה"כ חודשי</div>
                    <div className="value">₪{fmtNum(salesData.monthly?.total)}</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">📅 פירוט יומי</div>
                  {salesData.daily?.length === 0 ? (
                    <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '20px 0' }}>אין רשומות לחודש זה</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>תאריך</th><th>פנסיוני</th><th>פיננסים</th><th>סיכונים</th><th>אלמנטרי</th><th>סה"כ</th></tr>
                        </thead>
                        <tbody>
                          {salesData.daily?.map(row => (
                            <tr key={row.date}>
                              <td>{row.date.split('-').reverse().join('/')}</td>
                              <td>{fmtNum(row.pension)}</td>
                              <td>{fmtNum(row.finance)}</td>
                              <td>{fmtNum(row.risks)}</td>
                              <td>{fmtNum(row.elementary)}</td>
                              <td><strong>{fmtNum(row.total)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${tab === 'entry' ? 'active' : ''}`} onClick={() => setTab('entry')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          דיווח יומי
        </button>
        <button className={`nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => { setTab('history'); loadData(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          היסטוריה
        </button>
      </nav>
    </>
  );
}
