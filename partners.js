(() => {
  const menuButton = document.getElementById('menu-toggle');
  const navigation = document.querySelector('.nav-links');

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('active');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const typeFilter = document.getElementById('typeFilter');
  const regionFilter = document.getElementById('regionFilter');
  const collabFilter = document.getElementById('collabFilter');
  const searchInput = document.getElementById('searchInput');
  const applyButton = document.getElementById('applyFilters');
  const resetButton = document.getElementById('resetFilters');
  const list = document.getElementById('partners-list');

  const controls = [typeFilter, regionFilter, collabFilter, searchInput, applyButton, resetButton];
  if (!list || controls.some((control) => !control)) return;

  const cards = Array.from(list.querySelectorAll('.person-card'));
  const normalize = (value) => (value || '').toLowerCase().trim();

  function applyFilters() {
    const type = typeFilter.value;
    const region = regionFilter.value;
    const collaboration = collabFilter.value;
    const query = normalize(searchInput.value);
    let visibleCount = 0;

    cards.forEach((card) => {
      const collaborationTags = (card.dataset.collab || '').split(/\s+/);
      const show =
        (type === 'all' || card.dataset.type === type) &&
        (region === 'all' || card.dataset.region === region) &&
        (collaboration === 'all' || collaborationTags.includes(collaboration)) &&
        (!query || normalize(card.textContent).includes(query));

      card.hidden = !show;
      if (show) visibleCount += 1;
    });

    let emptyNote = document.getElementById('no-result-note');
    if (visibleCount === 0) {
      if (!emptyNote) {
        emptyNote = document.createElement('p');
        emptyNote.id = 'no-result-note';
        emptyNote.className = 'filter-empty-note';
        emptyNote.textContent = 'No partners match the current filters.';
        list.insertAdjacentElement('afterend', emptyNote);
      }
    } else if (emptyNote) {
      emptyNote.remove();
    }
  }

  applyButton.addEventListener('click', applyFilters);
  resetButton.addEventListener('click', () => {
    typeFilter.value = 'all';
    regionFilter.value = 'all';
    collabFilter.value = 'all';
    searchInput.value = '';
    applyFilters();
  });
  searchInput.addEventListener('input', applyFilters);
  applyFilters();
})();
