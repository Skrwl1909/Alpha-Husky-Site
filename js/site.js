const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  navigation?.classList.toggle('open', open);
});
navigation?.addEventListener('click', event => {
  if (event.target.closest('a')) {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open menu');
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    navigation?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.focus();
  }
});
const copyButton = document.querySelector('[data-copy-mint]');
copyButton?.addEventListener('click', async () => {
  const mint = document.getElementById('official-mint').textContent;
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(mint);
    status.textContent = 'Mint copied.';
  } catch {
    status.textContent = 'Select and copy the mint shown above.';
  }
});
