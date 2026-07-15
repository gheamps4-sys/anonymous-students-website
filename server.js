const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// 🔒 LOGIN — CLEAN VERSION, NO INVALID CHARACTERS
const ADMIN_USER = 'admin26';
const ADMIN_PASS = 'Bolo2006';

function protectAdmin(req, res, next) {
  // Clean realm text — no emojis or special characters
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Login Required"');
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).send('<h2 style="color:white;text-align:center;">Please login</h2>');

  const [u,p] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  if(u === ADMIN_USER && p === ADMIN_PASS) next();
  else res.status(401).send('<h2 style="color:white;text-align:center;">Wrong login — try again</h2>');
}

// 📂 DATABASE
const genID = () => crypto.randomBytes(8).toString('hex');
const DB = path.join(__dirname, 'data.json');
const load = () => fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : [];
const save = d => fs.writeFileSync(DB, JSON.stringify(d, null, 2));

// 🔐 ADMIN — SHOW FULL MESSAGE + ID + DATE
app.get('/admin', protectAdmin, (req, res) => {
  const all = load();
  let idList = '';
  if(all.length === 0) idList = 'No messages yet.';
  else all.forEach((m,i) => {
    idList += `----------------------------------------\n`;
    idList += `Entry #${i+1}\n`;
    idList += `ID: ${m.id}\n`;
    idList += `Date/Time: ${new Date(m.time).toLocaleString()}\n`;
    idList += `Message: ${m.text}\n`;
    idList += `----------------------------------------\n\n`;
  });

  fs.readFile(path.join(__dirname, 'admin.html'), 'utf8', (e, html) => {
    res.send(html.replace('Loading...', idList));
  });
});

// SAVE REPLY
app.post('/reply', protectAdmin, (req, res) => {
  const all = load();
  const msg = all.find(m => m.id === req.body.msgId?.trim());
  if(msg) msg.replies.push({text: req.body.replyText.trim(), time: new Date().toLocaleString()});
  save(all);
  res.redirect('/admin');
});

// 🌐 PUBLIC PAGES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/check', (req, res) => res.sendFile(path.join(__dirname, 'check.html')));

// SUBMIT — ID IN BOX ONLY
app.post('/submit', (req, res) => {
  const text = req.body.message?.trim();
  if (!text) return res.send('<a href="/">← Go back</a>');
  const all = load();
  const newMsg = { id: genID(), text, time: new Date().toLocaleString(), replies: [] };
  all.unshift(newMsg); save(all);
  console.log(`✅ New ID: ${newMsg.id}`);
  res.send(`<script>localStorage.setItem('lastMsgId','${newMsg.id}');location.href='/';</script>`);
});

// CHECK REPLIES
app.post('/check-now', (req, res) => {
  const found = load().find(m => m.id === req.body.msgId?.trim());
  if (!found) return res.send('<h2 style="text-align:center;color:red;">Message not found</h2><p style="text-align:center;"><a href="/check">← Go back</a></p>');
  const replies = found.replies.length ? found.replies.map(r=>`<div style="padding:10px;background:#eee;margin:5px 0;">${r.text}<br><small>${new Date(r.time).toLocaleString()}</small></div>`).join('') : '<p>No replies yet</p>';
  res.send(`<h3>Your Message:</h3><p>${found.text}</p><hr><h3>Replies:</h3>${replies}<hr><p style="text-align:center;"><a href="/check">← Back</a></p>`);
});

// START
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Fixed — Admin works perfectly now`));
