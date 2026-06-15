import { useState, useEffect, useRef } from 'react';
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

export default function ManagementApp({ user, onLogout }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState('overview');
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importMsg, setImportMsg] = useState('');
  const [importErr, setImportErr] = useState('');
  const [users, setUsers] = useState([]);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    api.getManagementSales(currentMonth).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentMonth]);
  useEffect(() => { api.getDistricts().then(d => setDistricts(d.districts)).catch(() => {}); }, []);

  const loadDistrict = (district) => {
    setSelectedDistrict(district);
    api.getDistrictSales(currentMonth, district).then(d => setDistrictData(d)).catch(() => {});
  };

  const loadUsers = () => {
    api.getUsers().then(d => setUsers(d.users)).catch(() => {});
  };

  const changeMonth = (dir) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportMsg(''); setImportErr('');
    try {
      const res = await api.importUsers(file);
      setImportMsg(`יובאו ${res.imported} משתמשים בהצלחה`);
      if (res.errors?.length) setImportErr(res.errors.join('\n'));
      loadUsers();
    } catch (err) { setImportErr(err.message); }
    fileRef.current.value = '';
  };

  const roleLabel = { agent: 'סוכן', district_manager: 'מנהל מחוז', management: 'הנהלה' };

  return (
    <>
      <header className="app-header">
        <div>
          <h1>הנהלה — מבט ארצי</h1>
          <div className="user-info">{user.name}</div>
        </div>
        <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)', fontSize: 13 }} onClick={onLogout}>יציאה</button>
      </header>

      <main className="main-content content-with-nav">
        {tab === 'overview' && (
          <>
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
                      <div className="value">{fmtNum(data.grand?.[key])}</div>
                    </div>
                  ))}
                  <div className="stat-box total">
                    <div className="label">סה"כ ארצי</div>
                    <div className="value">₪{fmtNum(data.grand?.total)}</div>
                  </div>
                </div>

                {data.missing > 0 && (
                  <div className="alert alert-warning">
                    ⚠️ {data.missing} סוכנים לא דיווחו היום
                  </div>
                )}

                <div className="card">
                  <div className="card-title">🗺️ לפי מחוז</div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>מחוז</th><th>סוכנים</th><th>פנסיוני</th><th>פיננסים</th><th>סיכונים</th><th>אלמנטרי</th><th>סה"כ</th></tr>
                      </thead>
                      <tbody>
                        {data.districts?.map(d => (
                          <tr key={d.district} style={{ cursor: 'pointer' }} onClick={() => { loadDistrict(d.district); setTab('district'); }}>
                            <td><strong style={{ color: 'var(--primary)' }}>{d.district}</strong></td>
                            <td>{d.agent_count}</td>
                            <td>{fmtNum(d.pension)}</td>
                            <td>{fmtNum(d.finance)}</td>
                            <td>{fmtNum(d.risks)}</td>
                            <td>{fmtNum(d.elementary)}</td>
                            <td><strong>{fmtNum(d.total)}</strong></td>
                          </tr>
                        ))}
                        <tr className="row-total">
                          <td>סה"כ</td>
                          <td>{data.grand?.agent_count}</td>
                          {CATEGORIES.map(({ key }) => <td key={key}>{fmtNum(data.grand?.[key])}</td>)}
                          <td>{fmtNum(data.grand?.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'district' && (
          <>
            <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => setTab('overview')}>← חזרה</button>

            <div className="district-chips">
              {districts.map(d => (
                <button key={d} className={`district-chip ${selectedDistrict === d ? 'active' : ''}`} onClick={() => loadDistrict(d)}>{d}</button>
              ))}
            </div>

            {districtData && (
              <>
                <div className="stat-grid">
                  {CATEGORIES.map(({ key, label }) => (
                    <div className="stat-box" key={key}>
                      <div className="label">{label}</div>
                      <div className="value">{fmtNum(districtData.totals?.[key])}</div>
                    </div>
                  ))}
                  <div className="stat-box total">
                    <div className="label">סה"כ מחוז {districtData.district}</div>
                    <div className="value">₪{fmtNum(districtData.totals?.total)}</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">👥 {districtData.agents?.length} סוכנים</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>סוכן</th><th>פנסיוני</th><th>פיננסים</th><th>סיכונים</th><th>אלמנטרי</th><th>סה"כ</th><th>עדכון</th></tr></thead>
                      <tbody>
                        {districtData.agents?.map(a => (
                          <tr key={a.id}>
                            <td><strong>{a.name}</strong></td>
                            <td>{fmtNum(a.pension)}</td>
                            <td>{fmtNum(a.finance)}</td>
                            <td>{fmtNum(a.risks)}</td>
                            <td>{fmtNum(a.elementary)}</td>
                            <td><strong style={{ color: 'var(--primary)' }}>{fmtNum(a.total)}</strong></td>
                            <td style={{ fontSize: 12 }}>
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
                          {CATEGORIES.map(({ key }) => <td key={key}>{fmtNum(districtData.totals?.[key])}</td>)}
                          <td>{fmtNum(districtData.totals?.total)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="card">
              <div className="card-title">📤 ייבוא משתמשים מ-Excel</div>
              <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 16 }}>
                קובץ Excel עם עמודות: <strong>שם, נייד, מייל, תעודת זהות, מחוז, תפקיד</strong><br/>
                תפקיד: סוכן / מנהל מחוז / הנהלה
              </p>
              {importMsg && <div className="alert alert-success">{importMsg}</div>}
              {importErr && <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap' }}>{importErr}</div>}
              <div className="upload-zone" onClick={() => fileRef.current.click()}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <p>לחץ לבחירת קובץ Excel</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span>👤 משתמשים ({users.length})</span>
                <button className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }} onClick={loadUsers}>רענן</button>
              </div>
              {users.length === 0 ? (
                <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '20px 0' }}>אין משתמשים. יבא מ-Excel.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>שם</th><th>נייד</th><th>מחוז</th><th>תפקיד</th><th></th></tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td style={{ direction: 'ltr' }}>{u.mobile}</td>
                          <td>{u.district}</td>
                          <td><span className={`badge ${u.role === 'management' ? 'badge-blue' : u.role === 'district_manager' ? 'badge-yellow' : 'badge-green'}`}>{roleLabel[u.role]}</span></td>
                          <td><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16 }} onClick={() => { if(confirm(`למחוק את ${u.name}?`)) api.deleteUser(u.id).then(loadUsers); }}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          סקירה ארצית
        </button>
        <button className={`nav-item ${tab === 'district' ? 'active' : ''}`} onClick={() => { setTab('district'); if (!selectedDistrict && districts[0]) loadDistrict(districts[0]); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          מחוזות
        </button>
        <button className={`nav-item ${tab === 'users' ? 'active' : ''}`} onClick={() => { setTab('users'); loadUsers(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/></svg>
          ניהול משתמשים
        </button>
      </nav>
    </>
  );
}
