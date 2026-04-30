const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'public', 'data.json');
const IMAGES_DIR = path.join(__dirname, 'public', 'images');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const storage = multer.diskStorage({
  destination: IMAGES_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다'));
  },
  limits: { fileSize: 15 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/api/items', (req, res) => res.json(readData()));

app.post('/api/items', upload.single('image'), (req, res) => {
  const data = readData();
  const maxNum = data.reduce((m, i) => Math.max(m, Number(i.number) || 0), 0);
  const item = {
    id: Date.now().toString(),
    number: maxNum + 1,
    name: req.body.name,
    image: req.file ? `/images/${req.file.filename}` : null,
    tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    description: req.body.description || '',
    status: req.body.status || '개발중',
    date: req.body.date || new Date().toISOString().split('T')[0],
    note: req.body.note || '',
  };
  data.push(item);
  writeData(data);
  res.json(item);
});

app.put('/api/items/:id', upload.single('image'), (req, res) => {
  const data = readData();
  const idx = data.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '아이템 없음' });

  const prev = data[idx];
  if (req.file && prev.image) {
    const old = path.join(__dirname, 'public', prev.image);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  data[idx] = {
    ...prev,
    name: req.body.name || prev.name,
    tags: req.body.tags !== undefined ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : prev.tags,
    description: req.body.description !== undefined ? req.body.description : prev.description,
    status: req.body.status || prev.status,
    date: req.body.date || prev.date,
    note: req.body.note !== undefined ? req.body.note : prev.note,
    number: req.body.number ? parseInt(req.body.number) : prev.number,
    image: req.file ? `/images/${req.file.filename}` : prev.image,
  };

  writeData(data);
  res.json(data[idx]);
});

app.delete('/api/items/:id', (req, res) => {
  let data = readData();
  const item = data.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: '아이템 없음' });

  if (item.image) {
    const imgPath = path.join(__dirname, 'public', item.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  writeData(data.filter(i => i.id !== req.params.id));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log('\n🎩 드똘 도감 서버 시작!\n');
  console.log('  카탈로그: http://localhost:' + PORT);
  console.log('  관리자:   http://localhost:' + PORT + '/admin');
  console.log('\n배포:  npm run deploy\n');
});
