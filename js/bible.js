(() => {
  const search = document.querySelector('[data-bible-search]');
  const buttons = [...document.querySelectorAll('[data-bible-filter]')];
  const cards = [...document.querySelectorAll('[data-bible-card]')];
  const result = document.querySelector('[data-bible-result]');
  if (!cards.length) return;

  let active = 'ALL';
  const normal = value => (value || '').toLowerCase().normalize('NFKD');

  const apply = () => {
    const query = normal(search?.value.trim());
    let visible = 0;
    cards.forEach(card => {
      const statusMatch = active === 'ALL' || card.dataset.status === active;
      const searchMatch = !query || normal(card.dataset.search).includes(query);
      const show = statusMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (result) result.textContent = `${visible} of ${cards.length} systems shown`;
  };

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
      const id = link.getAttribute('href');
      const target = id && document.querySelector(id);
      if (target) target.classList.add('dossier-flash');
      window.setTimeout(() => target?.classList.remove('dossier-flash'), 900);
    });
  });

  apply();
})();
