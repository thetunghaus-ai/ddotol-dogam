let items = [];
let selectedFile = null;

async function loadItems() {
  const res = await fetch('/api/items');
  items = await res.json();
  renderList(items);
  document.getElementById('countBadge').textContent = items.length;
}

function pad(n) { return String(n).padStart(3, '0'); }

function renderList(list) {
  const el = document.getElementById('itemList');
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#555;font-size:13px">아직 아이템이 없어요</div>';
    return;
  }
  el.innerHTML = list.map(item => {
    const thumb = item.image
      ? `<div class="item-thumb"><img src="${item.image}" alt=""></div>`
      : `<div class="item-thumb">🎩</div>`;
    const tags = (item.tags || []).map(t => `<span class="item-tag">${t}</span>`).join('');
    return `<div class="item-row" id="row-${item.id}">
      ${thumb}
      <div class="item-info">
        <div class="item-num">No.${pad(item.number || '?')}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-tags">${tags}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-edit" onclick="editItem('${item.id}')">수정</button>
        <button class="btn btn-danger" onclick="deleteItem('${item.id}', '${item.name.replace(/'/g, "\\'")}')">삭제</button>
      </div>
    </div>`;
  }).join('');
}

async function submitForm(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '저장 중...';

  const fd = new FormData();
  fd.append('name', document.getElementById('name').value.trim());
  fd.append('tags', document.getElementById('tags').value);
  fd.append('description', document.getElementById('description').value.trim());
  fd.append('status', document.getElementById('status').value);
  fd.append('date', document.getElementById('date').value);
  fd.append('note', document.getElementById('note').value.trim());
  if (selectedFile) fd.append('image', selectedFile);

  const editId = document.getElementById('editId').value;
  const url = editId ? `/api/items/${editId}` : '/api/items';
  const method = editId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, body: fd });
    if (!res.ok) throw new Error(await res.text());
    toast(editId ? '✓ 수정됐어요' : '✓ 추가됐어요', 'success');
    resetForm();
    await loadItems();
  } catch (err) {
    toast('오류: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = document.getElementById('editId').value ? '저장하기' : '추가하기';
  }
}

function editItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('editId').value = id;
  document.getElementById('name').value = item.name;
  document.getElementById('tags').value = (item.tags || []).join(', ');
  document.getElementById('description').value = item.description || '';
  document.getElementById('status').value = item.status || '개발중';
  document.getElementById('date').value = item.date || '';
  document.getElementById('note').value = item.note || '';
  selectedFile = null;

  if (item.image) {
    document.getElementById('imagePreview').src = item.image;
    document.getElementById('imagePreview').style.display = 'block';
    document.getElementById('imagePlaceholder').style.display = 'none';
  } else {
    clearImagePreview();
  }

  document.getElementById('formTitle').textContent = `수정: ${item.name}`;
  document.getElementById('submitBtn').textContent = '저장하기';
  document.getElementById('cancelBtn').style.display = 'inline-flex';

  document.querySelector('.form-panel').scrollTop = 0;
  document.getElementById('name').focus();
}

async function deleteItem(id, name) {
  if (!confirm(`"${name}" 을 삭제할까요?`)) return;
  try {
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    toast('삭제됐어요', 'success');
    await loadItems();
  } catch {
    toast('삭제 실패', 'error');
  }
}

function resetForm() {
  document.getElementById('editId').value = '';
  document.getElementById('itemForm').reset();
  selectedFile = null;
  clearImagePreview();
  document.getElementById('formTitle').textContent = '새 아이템 추가';
  document.getElementById('submitBtn').textContent = '추가하기';
  document.getElementById('cancelBtn').style.display = 'none';
}

function clearImagePreview() {
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imagePlaceholder').style.display = 'flex';
}

function addTag(tag) {
  const el = document.getElementById('tags');
  const tags = el.value.split(',').map(t => t.trim()).filter(Boolean);
  if (!tags.includes(tag)) {
    tags.push(tag);
    el.value = tags.join(', ');
  }
}

// Image input handler
document.getElementById('imageInput').addEventListener('change', function () {
  if (this.files[0]) setImageFile(this.files[0]);
});

// Drag & drop
const drop = document.getElementById('imageDrop');
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
drop.addEventListener('drop', e => {
  e.preventDefault();
  drop.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) setImageFile(e.dataTransfer.files[0]);
});

function setImageFile(file) {
  if (!file.type.startsWith('image/')) return toast('이미지 파일만 가능해요', 'error');
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('imagePreview').src = ev.target.result;
    document.getElementById('imagePreview').style.display = 'block';
    document.getElementById('imagePlaceholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// List search
document.getElementById('listSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(q) ||
    (i.tags || []).some(t => t.toLowerCase().includes(q))
  );
  renderList(filtered);
});

// Deploy modal
function showDeploy() {
  document.getElementById('deployOverlay').style.display = 'flex';
}
function hideDeploy() {
  document.getElementById('deployOverlay').style.display = 'none';
  document.getElementById('copyConfirm').style.display = 'none';
}
function copyDeploy() {
  const cmd = document.getElementById('deployCmd').textContent;
  navigator.clipboard.writeText(cmd).then(() => {
    document.getElementById('copyConfirm').style.display = 'block';
  });
}

// Toast
let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// Set today's date as default
document.getElementById('date').value = new Date().toISOString().split('T')[0];

loadItems();
