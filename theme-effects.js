(() => {
  const cardSelector = '.research-card, .featured-publications .pub-item';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const initializePageTransitions = () => {
    if (reduceMotion.matches || 'CSSViewTransitionRule' in window) return;

    document.documentElement.classList.add('uses-page-transition-fallback');

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target.closest('header .nav-links a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;

      event.preventDefault();
      document.body.classList.add('is-page-leaving');
      window.setTimeout(() => window.location.assign(destination.href), 180);
    });

    window.addEventListener('pageshow', () => {
      document.body.classList.remove('is-page-leaving');
    });
  };

  const resetCard = (card) => {
    card.style.setProperty('--card-tilt-x', '0deg');
    card.style.setProperty('--card-tilt-y', '0deg');
    card.style.setProperty('--spotlight-x', '50%');
    card.style.setProperty('--spotlight-y', '50%');
    card.classList.remove('is-holographic-active');
  };

  const enhanceCard = (card) => {
    card.classList.add('is-holographic');

    if (reduceMotion.matches || !finePointer.matches) return;

    let animationFrame = 0;

    card.addEventListener('pointerenter', () => {
      card.classList.add('is-holographic-active');
    });

    card.addEventListener('pointermove', (event) => {
      if (animationFrame) cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const relativeX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const relativeY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        const tiltY = (relativeX - 0.5) * 7;
        const tiltX = (0.5 - relativeY) * 7;

        card.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`);
        card.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`);
        card.style.setProperty('--spotlight-x', `${(relativeX * 100).toFixed(1)}%`);
        card.style.setProperty('--spotlight-y', `${(relativeY * 100).toFixed(1)}%`);
      });
    });

    card.addEventListener('pointerleave', () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      resetCard(card);
    });
  };

  const initialize = () => {
    initializePageTransitions();
    document.querySelectorAll(cardSelector).forEach(enhanceCard);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
