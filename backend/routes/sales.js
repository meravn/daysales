const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'לא מחובר' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'משתמש לא נמצא' });
  req.user = user;
  next();
}

// Submit / update today's sales
router.post('/', requireAuth, (req, res) => {
  const { date, pension, finance, risks, elementary } = req.body;
  if (!date) return res.status(400).json({ error: 'נדרש תאריך' });

  db.prepare(`
    INSERT INTO sales (user_id, date, pension, finance, risks, elementary, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(user_id, date) DO UPDATE SET
      pension = excluded.pension,
      finance = excluded.finance,
      risks = excluded.risks,
      elementary = excluded.elementary,
      updated_at = datetime('now','localtime')
  `).run(req.user.id, date, pension || 0, finance || 0, risks || 0, elementary || 0);

  res.json({ ok: true });
});

// My sales - daily entry + monthly totals
router.get('/my', requireAuth, (req, res) => {
  const { month } = req.query; // YYYY-MM
  const prefix = month || new Date().toISOString().slice(0, 7);

  const daily = db.prepare(`
    SELECT date, pension, finance, risks, elementary,
           pension + finance + risks + elementary AS total
    FROM sales
    WHERE user_id = ? AND date LIKE ?
    ORDER BY date DESC
  `).all(req.user.id, `${prefix}%`);

  const monthly = db.prepare(`
    SELECT
      SUM(pension) AS pension,
      SUM(finance) AS finance,
      SUM(risks) AS risks,
      SUM(elementary) AS elementary,
      SUM(pension + finance + risks + elementary) AS total
    FROM sales
    WHERE user_id = ? AND date LIKE ?
  `).get(req.user.id, `${prefix}%`);

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = db.prepare(
    'SELECT * FROM sales WHERE user_id = ? AND date = ?'
  ).get(req.user.id, today);

  res.json({ daily, monthly, todayRow });
});

// District view - for district_manager
router.get('/district', requireAuth, (req, res) => {
  if (req.user.role !== 'district_manager' && req.user.role !== 'management') {
    return res.status(403).json({ error: 'אין הרשאה' });
  }
  const { month, district } = req.query;
  const prefix = month || new Date().toISOString().slice(0, 7);
  const targetDistrict = district || req.user.district;

  const agents = db.prepare(`
    SELECT u.id, u.name, u.mobile,
      COALESCE(SUM(s.pension),0) AS pension,
      COALESCE(SUM(s.finance),0) AS finance,
      COALESCE(SUM(s.risks),0) AS risks,
      COALESCE(SUM(s.elementary),0) AS elementary,
      COALESCE(SUM(s.pension + s.finance + s.risks + s.elementary),0) AS total,
      MAX(s.date) AS last_entry
    FROM users u
    LEFT JOIN sales s ON s.user_id = u.id AND s.date LIKE ?
    WHERE u.district = ? AND u.role = 'agent'
    GROUP BY u.id
    ORDER BY total DESC
  `).all(`${prefix}%`, targetDistrict);

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(s.pension),0) AS pension,
      COALESCE(SUM(s.finance),0) AS finance,
      COALESCE(SUM(s.risks),0) AS risks,
      COALESCE(SUM(s.elementary),0) AS elementary,
      COALESCE(SUM(s.pension + s.finance + s.risks + s.elementary),0) AS total
    FROM users u
    LEFT JOIN sales s ON s.user_id = u.id AND s.date LIKE ?
    WHERE u.district = ? AND u.role = 'agent'
  `).get(`${prefix}%`, targetDistrict);

  res.json({ agents, totals, district: targetDistrict });
});

// Management view - all districts
router.get('/management', requireAuth, (req, res) => {
  if (req.user.role !== 'management') return res.status(403).json({ error: 'אין הרשאה' });

  const { month } = req.query;
  const prefix = month || new Date().toISOString().slice(0, 7);

  const districts = db.prepare(`
    SELECT u.district,
      COUNT(DISTINCT u.id) AS agent_count,
      COALESCE(SUM(s.pension),0) AS pension,
      COALESCE(SUM(s.finance),0) AS finance,
      COALESCE(SUM(s.risks),0) AS risks,
      COALESCE(SUM(s.elementary),0) AS elementary,
      COALESCE(SUM(s.pension + s.finance + s.risks + s.elementary),0) AS total
    FROM users u
    LEFT JOIN sales s ON s.user_id = u.id AND s.date LIKE ?
    WHERE u.role = 'agent'
    GROUP BY u.district
    ORDER BY total DESC
  `).all(`${prefix}%`);

  const grand = db.prepare(`
    SELECT
      COALESCE(SUM(s.pension),0) AS pension,
      COALESCE(SUM(s.finance),0) AS finance,
      COALESCE(SUM(s.risks),0) AS risks,
      COALESCE(SUM(s.elementary),0) AS elementary,
      COALESCE(SUM(s.pension + s.finance + s.risks + s.elementary),0) AS total,
      COUNT(DISTINCT u.id) AS agent_count
    FROM users u
    LEFT JOIN sales s ON s.user_id = u.id AND s.date LIKE ?
    WHERE u.role = 'agent'
  `).get(`${prefix}%`);

  // Today's missing entries
  const today = new Date().toISOString().slice(0, 10);
  const missing = db.prepare(`
    SELECT COUNT(*) AS count FROM users u
    LEFT JOIN sales s ON s.user_id = u.id AND s.date = ?
    WHERE u.role = 'agent' AND s.id IS NULL
  `).get(today);

  res.json({ districts, grand, missing: missing.count });
});

module.exports = router;
