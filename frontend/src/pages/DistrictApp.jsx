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

export default function DistrictApp({ user, onLogout }) {
  const today = new Date().toISOString().slice(0, 10);
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getDistrictSales(currentMonth).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentMonth]);

  const changeMonth = (dir) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <>
      <header className="app-header">
        <div>
          <h1>מחוז {user.district}</h1>
          <div className="user-info">מנהל מחוז · {user.name}</div>
        </div>
        <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)', fontSize: 13 }} onClick={onLogout}>יציאה</button>
      </header>

      <main className="main-content">
        <div className="month-nav">
          <button onClick={() => changeMonth(1)}>‹</button>
          <span>{monthLabel(currentMonth)}</span>
          <button onClick={() => changeMonth(-1)}>›</button>
        </div>

        {loading ? <div className="spinner" /> : data && (
          <>
            <div className="stat-grid">
              {CATEGORIES.map(({ key, label }) => (
                <div className="stat-box" key={key}>
                  <div className="label">{label}</div>
                  <div className="value">{fmtNum(data.totals?.[key])}</div>
                </div>
              ))}
              <div className="stat-box total">
                <div className="label">סה"כ מחוז {data.district}</div>
                <div className="value">₪{fmtNum(data.totals?.total)}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">👥 סוכנים — {data.agents?.length} סוכנים</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>סוכן</th>
                      <th>פנסיוני</th>
                      <th>פיננסים</th>
                      <th>סיכונים</th>
                      <th>אלמנטרי</th>
                      <th>סה"כ</th>
                      <th>עדכון</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agents?.map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.name}</strong></td>
                        <td>{fmtNum(a.pension)}</td>
                        <td>{fmtNum(a.finance)}</td>
                        <td>{fmtNum(a.risks)}</td>
                        <td>{fmtNum(a.elementary)}</td>
                        <td><strong style={{ color: 'var(--primary)' }}>{fmtNum(a.total)}</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                          {a.last_entry
                            ? a.last_entry === today
                              ? <span className="badge badge-green">היום</span>
                              : a.last_entry.split('-').reverse().join('/')
                            : <span className="badge badge-red">אין</span>
                          }
                        </td>
                      </tr>
                    ))}
                    <tr className="row-total">
                      <td>סה"כ</td>
                      {CATEGORIES.map(({ key }) => <td key={key}>{fmtNum(data.totals?.[key])}</td>)}
                      <td>{fmtNum(data.totals?.total)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
