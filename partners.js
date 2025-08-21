// Mobile nav toggle（与站点保持一致）
const menuBtn = document.getElementById('menu-toggle');
const nav = document.querySelector('.nav-links');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open');
  });
}

// 简单筛选与搜索
const $ = (id) => document.getElementById(id);
const typeFilter   = $('typeFilter');
const regionFilter = $('regionFilter');
const collabFilter = $('collabFilter');
const searchInput  = $('searchInput');
const applyBtn     = $('applyFilters');
const resetBtn     = $('resetFilters');
const cards        = Array.from(document.querySelectorAll('#partners-grid .research-card'));

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function applyFilters() {
  const t = typeFilter.value;
  const r = regionFilter.value;
  const c = collabFilter.value;
  const q = normalize(searchInput.value);

  let visibleCount = 0;

  cards.forEach(card => {
    const type   = card.dataset.type;
    const region = card.dataset.region;
    const collab = card.dataset.collab || '';
    const text   = normalize(card.innerText);

    const passType   = (t === 'all') || type === t;
    const passRegion = (r === 'all') || region === r;
    const passCollab = (c === 'all') || collab.split(/\s+/).includes(c);
    const passSearch = !q || text.includes(q);

    const show = passType && passRegion && passCollab && passSearch;
    card.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });

  // 为空时给点反馈
  const grid = document.getElementById('partners-grid');
  let emptyNote = document.getElementById('no-result-note');
  if (!visibleCount) {
    if (!emptyNote) {
      emptyNote = document.createElement('div');
      emptyNote.id = 'no-result-note';
      emptyNote.style.margin = '1rem 0';
      emptyNote.style.opacity = '.75';
      emptyNote.textContent = 'No partners match current filters.';
      grid.after(emptyNote);
    }
  } else if (emptyNote) {
    emptyNote.remove();
  }
}

function resetFilters() {
  typeFilter.value   = 'all';
  regionFilter.value = 'all';
  collabFilter.value = 'all';
  searchInput.value  = '';
  applyFilters();
}

applyBtn.addEventListener('click', applyFilters);
resetBtn.addEventListener('click', resetFilters);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyFilters();
});

// 初次渲染
applyFilters();
