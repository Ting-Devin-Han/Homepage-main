(() => {
    const grid = document.getElementById('research-grid');
    const allCards = Array.from(grid.querySelectorAll('.research-card'));
  
    document.getElementById('applyFilters').addEventListener('click', () => {
      const category = document.getElementById('categoryFilter').value.toLowerCase();
      const year = document.getElementById('yearFilter').value;
      const type = document.getElementById('typeFilter').value.toLowerCase();
      const keyword = document.getElementById('searchInput').value.toLowerCase();
  
      // Filter cards from the full original list, not the currently displayed cards
      const filteredCards = allCards.filter(card => {
        const tags = Array.from(card.querySelectorAll('.tags .tag'))
          .map(tag => tag.textContent.toLowerCase());
  
        // Extract year, category, and type
        const cardYear = tags.find(t => /^\d{4}$/.test(t.replace('#','')));
        // const cardCategory = tags.find(t => ['#ai:cv', '#healthcare', '#education'].includes(t));
        const validCategories = [
            '#ai:cv',
            '#ai:nlp',
            '#ai:llm',
            '#ai:time series model',
            '#ai:ml',
            '#ai:hci',
            '#ai:rl',
            '#healthcare',
            '#wearable',
            '#biochemistry',
            '#material science',
            '#cultural heritage conservation',
            '#archeaology',
            '#education',
            '#additive manufacturing'
          ];
          
        const categoryMatch = category === 'all' || 
            tags.some(t => validCategories.includes(t) && t.includes(category));
          
        const cardType = tags.find(t => ['#journal', '#conference', '#workshop'].includes(t));
  
        // Extract title and description text
        const title = card.querySelector('.project-title').textContent.toLowerCase();
        const description = card.querySelector('.project-description').textContent.toLowerCase();
  
        // Filters: true if filter is 'all' or matches card attribute
        // const categoryMatch = category === 'all' || (cardCategory && cardCategory.includes(category));
        const yearMatch = year === 'all' || (cardYear && cardYear.includes(year));
        const typeMatch = type === 'all' || (cardType && cardType.includes(type));
        const keywordMatch = !keyword || title.includes(keyword) || description.includes(keyword);
  
        return categoryMatch && yearMatch && typeMatch && keywordMatch;
      });
  
      // Sort filtered cards by year descending (newest first)
      filteredCards.sort((a, b) => {
        const getYear = card => {
          const tags = Array.from(card.querySelectorAll('.tags .tag'));
          for (const tag of tags) {
            const txt = tag.textContent.replace('#', '');
            if (/^\d{4}$/.test(txt)) return parseInt(txt);
          }
          return 0;
        };
        return getYear(b) - getYear(a);
      });
  
      // Clear grid and append filtered cards
      grid.innerHTML = '';
      filteredCards.forEach(card => grid.appendChild(card));
    });
  })();
  
  const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.querySelector(".nav-links");

menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});
  