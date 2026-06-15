const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: 'נדרש מספר נייד' });

  const clean = mobile.replace(/\D/g, '');
  const user = db.prepare(
    'SELECT id, name, mobile, email, district, role FROM users WHERE REPLACE(mobile, \'-\', \'\') = ? OR mobile = ?'
  ).get(clean, mobile);

  if (!user) return res.status(401).json({ error: 'מספר נייד לא נמצא במערכת' });

  req.session.userId = user.id;
  res.json({ user });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'לא מחובר' });
  const user = db.prepare(
    'SELECT id, name, mobile, email, district, role FROM users WHERE id = ?'
  ).get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'משתמש לא נמצא' });
  res.json({ user });
});

module.exports = router;
