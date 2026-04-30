let allItems = [];
let activeTag = null;

const TAG_CLASS = {
  '모자': 'tag-모자',
  '자수': 'tag-자수',
  '한정판': 'tag-한정판',
  '프로토타입': 'tag-프로토타입',
  '콜라보': 'tag-콜라보',
  '시즌': 'tag-시즌',
  '잡종': 'tag-잡종',
};

function tagClass(tag) {
  for (const key in TAG_CLASS) {
    if (tag.includes(key)) return TAG_CLASS[key];
  }
  return 'tag-default';
}

function pad(n) { return String(n).padStart(3, '0'); }

async function load() {
  try {
    const res = await fetch('/data.json?t=' + Date.now());
    allItems = await res.json();
    buildFilterBar();
    render(allItems);
  } catch (e) {
    console.error('데이터 로드 실패', e);
  }
}

function buildFilterBar() {
  const tags = [...new Set(allItems.flatMap(i => i.tags || []))].sort();
  const bar = document.getElementById('filterBar');
  bar.innerHTML = [
    `<button class="filter-tag active" data-tag="">전체 (${allItems.length})</button>`,
    ...tags.map(t => {
      const count = allItems.filter(i => (i.tags || []).includes(t)).length;
      return `<button class="filter-tag" data-tag="${t}">${t} (${count})</button>`;
    })
  ].join('');

  bar.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTag = btn.dataset.tag || null;
      filter();
    });
  });
}

function filter() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  let items = allItems;
  if (activeTag) items = items.filter(i => (i.tags || []).includes(activeTag));
  if (q) items = items.filter(i =>
    i.name.toLowerCase().includes(q) ||
    (i.description || '').toLowerCase().includes(q)
  );
  render(items);
}

function render(items) {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('headerCount');

  count.textContent = `총 ${allItems.length}개`;

  if (!items.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = items.map(item => {
    const num = pad(item.number || '?');
    const tags = (item.tags || []).slice(0, 2)
      .map(t => `<span class="tag ${tagClass(t)}">${t}</span>`).join('');
    const img = item.image
      ? `<img src="${item.image}" alt="${item.name}" loading="lazy">`
      : `<div class="card-placeholder">🎩</div>`;
    const status = item.status
      ? `<div class="status-badge status-${item.status}">${item.status}</div>` : '';

    return `<div class="card" onclick="openModal('${item.id}')">
      <div class="card-image-wrap">${img}</div>
      <div class="card-body">
        <div class="card-number">No.${num}</div>
        <div class="card-name">${item.name}</div>
        <div class="card-tags">${tags}</div>
        ${status}
      </div>
    </div>`;
  }).join('');
}

function openModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  const num = pad(item.number || '?');
  const tags = (item.tags || []).map(t => `<span class="tag ${tagClass(t)}">${t}</span>`).join('');
  const img = item.image
    ? `<img src="${item.image}" alt="${item.name}">`
    : `<div class="modal-img-placeholder">🎩</div>`;
  const status = item.status
    ? `<div class="status-badge status-${item.status}">${item.status}</div>` : '';

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-img-wrap">${img}</div>
    <div class="modal-info">
      <div class="modal-number">No.${num}</div>
      <div class="modal-name">${item.name}</div>
      <div class="modal-tags">${tags}${status}</div>
      ${item.description ? `<p class="modal-desc">${item.description}</p>` : ''}
      ${item.date ? `<div class="modal-date">${item.date}</div>` : ''}
    </div>`;

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('search').addEventListener('input', filter);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

load();
