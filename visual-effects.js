/* Presentation-only effects: scroll reveal + gentle pointer tilt. */
(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const selectors = {
    downly: '.download-card, .platform-item, .result-card, .history-grid > *, .step-card, .setting-row',
    amf: '.header, .content, .grid-area, .hasil-area, .contantdev, .card, .modal-box, .tool-btn',
    portfolio: '.term, .code, .win, .row, .actions .btn'
  };
  const path = location.pathname.toLowerCase();
  const mode = document.body.classList.contains('dark-mode') || document.querySelector('#formdownload')
    ? 'downly'
    : document.querySelector('#intro') ? 'amf' : 'portfolio';
  const selector = selectors[mode];
  const seen = new WeakSet();

  const prepare = (scope = document) => {
    scope.querySelectorAll?.(selector).forEach((el) => {
      if (el.dataset.fxPrepared) return;
      el.dataset.fxPrepared = '1';
      el.classList.add('fx-tilt');
      if (!el.classList.contains('reveal') && !reduce && 'IntersectionObserver' in window) {
        el.classList.add('fx-reveal');
        observer.observe(el);
      }
    });
  };

  let observer;
  if (!reduce && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('fx-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
    document.documentElement.classList.add('fx-ready');
  }

  prepare();

  if ('MutationObserver' in window) {
    const mutations = new MutationObserver((entries) => {
      entries.forEach((entry) => entry.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.matches?.(selector)) {
            const parent = node.parentElement;
            if (parent) prepare(parent);
          } else prepare(node);
        }
      }));
    });
    mutations.observe(document.body, { childList: true, subtree: true });
  }

  if (reduce || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', (event) => {
    const card = event.target.closest?.('.fx-tilt');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--fx-rx', `${(-y * 7).toFixed(2)}deg`);
    card.style.setProperty('--fx-ry', `${(x * 8).toFixed(2)}deg`);
  }, { passive: true });
  document.addEventListener('pointerout', (event) => {
    const card = event.target.closest?.('.fx-tilt');
    if (!card || card.contains(event.relatedTarget)) return;
    card.style.removeProperty('--fx-rx');
    card.style.removeProperty('--fx-ry');
  }, { passive: true });
})();
