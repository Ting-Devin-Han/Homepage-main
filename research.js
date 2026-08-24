(() => {
  const normalize = (value) => (value || '').toLowerCase().trim();
  const yearFilter = document.getElementById('yearFilter');
  const typeFilter = document.getElementById('typeFilter');
  const searchInput = document.getElementById('searchInput');
  const applyButton = document.getElementById('applyFilters');
  const resetButton = document.getElementById('resetFilters');
  const filterPanel = document.getElementById('filter-panel');
  const yearSections = Array.from(document.querySelectorAll('.container[data-year]'));

  function applyFilters() {
    if (!yearFilter || !typeFilter || !searchInput) return;

    const selectedYear = yearFilter.value;
    const selectedType = normalize(typeFilter.value);
    const query = normalize(searchInput.value);
    let visibleItems = 0;

    yearSections.forEach((section) => {
      const matchesYear = selectedYear === 'all' || section.dataset.year === selectedYear;
      const cards = Array.from(section.querySelectorAll('.research-card'));
      const supplementalItems = Array.from(section.children).filter((child) =>
        child.classList.contains('pub-item')
      );

      cards.forEach((card) => {
        const tags = Array.from(card.querySelectorAll('.tag')).map((tag) =>
          normalize(tag.textContent).replace(/^#/, '')
        );
        const matchesType = selectedType === 'all' || tags.includes(selectedType);
        const matchesQuery = !query || normalize(card.textContent).includes(query);
        const show = matchesYear && matchesType && matchesQuery;

        card.hidden = !show;
        if (show) visibleItems += 1;
      });

      supplementalItems.forEach((item) => {
        const matchesQuery = !query || normalize(item.textContent).includes(query);
        const show = matchesYear && selectedType === 'all' && matchesQuery;

        item.hidden = !show;
        if (show) visibleItems += 1;
      });

      section.hidden = !matchesYear || !section.querySelector('.research-card:not([hidden]), .pub-item:not([hidden])');
    });

    let emptyNote = document.getElementById('no-result-note');
    if (visibleItems === 0 && filterPanel) {
      if (!emptyNote) {
        emptyNote = document.createElement('p');
        emptyNote.id = 'no-result-note';
        emptyNote.className = 'filter-empty-note';
        emptyNote.textContent = 'No publications match the current filters.';
        filterPanel.insertAdjacentElement('afterend', emptyNote);
      }
    } else if (emptyNote) {
      emptyNote.remove();
    }
  }

  if (applyButton) applyButton.addEventListener('click', applyFilters);
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      yearFilter.value = 'all';
      typeFilter.value = 'all';
      searchInput.value = '';
      applyFilters();
    });
  }
  if (yearFilter) yearFilter.addEventListener('change', applyFilters);
  if (typeFilter) typeFilter.addEventListener('change', applyFilters);
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchInput.value = '';
        applyFilters();
      }
    });
  }

  applyFilters();

  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }
})();
