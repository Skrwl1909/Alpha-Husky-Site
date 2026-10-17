(() => {
  const search = document.querySelector('[data-bible-search]');
  const buttons = [...document.querySelectorAll('[data-bible-filter]')];
  const cards = [...document.querySelectorAll('[data-bible-card]')];
  const dossiers = [...document.querySelectorAll('.dossier[id]')];
  const result = document.querySelector('[data-bible-result]');
  if (!cards.length) return;

  let active = 'ALL';
  const normalize = (value) => String(value || '')
    .toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l').trim();

  const entries = cards.map(card => {
    const target = card.querySelector('[data-dossier-jump]')?.getAttribute('href') || '';
    const id = target.startsWith('#') ? target.slice(1) : '';
    const dossier = id ? document.getElementById(id) : null;
    return { card, id, searchable: normalize(
      (card.dataset.search || card.textContent || '') + ' ' + (dossier?.textContent || '')
    ) };
  });

  function apply() {
    const terms = normalize(search?.value).split(/\s+/).filter(Boolean);
    const matched = new Set();
    let visible = 0;
    entries.forEach(({card, id, searchable}) => {
      const statusMatch = active === 'ALL' || card.dataset.status === active;
      const queryMatch = terms.every(term => searchable.includes(term));
      const show = statusMatch && queryMatch;
      card.hidden = !show;
      if (show) {
        visible++;
        if (id) matched.add(id);
      }
    });
    dossiers.forEach(dossier => {
      dossier.hidden = !matched.has(dossier.id);
    });
    if (result) result.textContent = visible
      ? String(visible) + ' of ' + String(cards.length) + ' systems shown — matching dossiers below'
      : 'No matching systems. Try another keyword or select All.';
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      active = button.dataset.bibleFilter || 'ALL';
      buttons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      apply();
    });
  });
  search?.addEventListener('input', apply);

  document.querySelectorAll('[data-dossier-jump]').forEach(link => {
    link.addEventListener('click', () => {
      const hash = link.getAttribute('href');
      const target = hash && document.querySelector(hash);
      if (target && !target.hidden) target.classList.add('dossier-flash');
      window.setTimeout(() => target?.classList.remove('dossier-flash'), 900);
    });
  });
  apply();
})();
