(() => {
  const grid = document.getElementById('research-grid');
  const categoryFilter = document.getElementById('categoryFilter');
  const yearFilter = document.getElementById('yearFilter');
  const searchInput = document.getElementById('searchInput');
  const applyButton = document.getElementById('applyFilters');

  function applyFilters() {
    if (!grid || !categoryFilter || !yearFilter || !searchInput) return;

    const category = categoryFilter.value.toLowerCase();
    const year = yearFilter.value;
    const query = searchInput.value.toLowerCase().trim();
    const cards = Array.from(grid.querySelectorAll('.research-card'));
    let visibleCount = 0;

    cards.forEach((card) => {
      const tags = Array.from(card.querySelectorAll('.tag')).map((tag) =>
        tag.textContent.toLowerCase().trim().replace(/^#/, '')
      );
      const show =
        (category === 'all' || tags.includes(category)) &&
        (year === 'all' || tags.includes(year)) &&
        (!query || card.textContent.toLowerCase().includes(query));

      card.hidden = !show;
      if (show) visibleCount += 1;
    });

    let emptyNote = document.getElementById('no-result-note');
    if (visibleCount === 0) {
      if (!emptyNote) {
        emptyNote = document.createElement('p');
        emptyNote.id = 'no-result-note';
        emptyNote.className = 'filter-empty-note';
        emptyNote.textContent = 'No projects match the current filters.';
        grid.insertAdjacentElement('afterend', emptyNote);
      }
    } else if (emptyNote) {
      emptyNote.remove();
    }
  }

  if (applyButton) applyButton.addEventListener('click', applyFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
  if (yearFilter) yearFilter.addEventListener('change', applyFilters);
  if (searchInput) searchInput.addEventListener('input', applyFilters);
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
