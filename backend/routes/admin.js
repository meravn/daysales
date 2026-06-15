const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage() });

function requireManagement(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'לא מחובר' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'management') return res.status(403).json({ error: 'אין הרשאה' });
  req.user = user;
  next();
}

// Import users from Excel
router.post('/import', requireManagement, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'לא הועלה קובץ' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const insert = db.prepare(`
    INSERT INTO users (name, mobile, email, id_number, district, role)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(mobile) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      id_number = excluded.id_number,
      district = excluded.district,
      role = excluded.role
  `);

  const roleMap = {
    'סוכן': 'agent',
    'מנהל מחוז': 'district_manager',
    'הנהלה': 'management',
    'agent': 'agent',
    'district_manager': 'district_manager',
    'management': 'management',
  };

  let imported = 0;
  let errors = [];

  const importAll = db.transaction(() => {
    for (const row of rows) {
      const name = row['שם'] || row['name'];
      const mobile = String(row['נייד'] || row['mobile'] || '').trim();
      const email = row['מייל'] || row['email'] || '';
      const id_number = String(row['תעודת זהות'] || row['id_number'] || '');
      const district = row['מחוז'] || row['district'] || '';
      const roleRaw = row['תפקיד'] || row['role'] || 'סוכן';
      const role = roleMap[roleRaw] || 'agent';

      if (!name || !mobile) {
        errors.push(`שורה ללא שם או נייד: ${JSON.stringify(row)}`);
        continue;
      }

      try {
        insert.run(name, mobile, email, id_number, district, role);
        imported++;
      } catch (e) {
        errors.push(`שגיאה בייבוא ${name}: ${e.message}`);
      }
    }
  });

  importAll();
  res.json({ imported, errors });
});

// List all users
router.get('/users', requireManagement, (req, res) => {
  const users = db.prepare(
    'SELECT id, name, mobile, email, id_number, district, role FROM users ORDER BY district, name'
  ).all();
  res.json({ users });
});

// Delete user
router.delete('/users/:id', requireManagement, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Get all districts
router.get('/districts', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'לא מחובר' });
  const districts = db.prepare(
    "SELECT DISTINCT district FROM users WHERE district IS NOT NULL AND district != '' ORDER BY district"
  ).all().map(r => r.district);
  res.json({ districts });
});

module.exports = router;
