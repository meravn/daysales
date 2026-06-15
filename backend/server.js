const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

const sessions = {};
function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/sid=([^;]+)/);
  const sid = match ? match[1] : null;

  req.session = sid && sessions[sid] ? sessions[sid] : {};
  req.sessionId = sid;

  req.session.save = () => {
    const newSid = sid || generateId();
    sessions[newSid] = req.session;
    res.setHeader('Set-Cookie', `sid=${newSid}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=2592000`);
  };

  req.session.destroy = () => {
    if (sid) delete sessions[sid];
    res.setHeader('Set-Cookie', 'sid=; Path=/; Max-Age=0');
  };

  const origJson = res.json.bind(res);
  res.json = (data) => {
    if (req.session.userId) req.session.save();
    return origJson(data);
  };

  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/admin', require('./routes/admin'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

init().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
