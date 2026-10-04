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

// Public Bible V1: connect preserved/static pages to the current product record
const bibleNavStyle = document.createElement('style');
bibleNavStyle.textContent = '@media(max-width:930px){.menu-toggle{display:flex;flex-direction:column;gap:5px;justify-content:center;background:none;border:1px solid #657780;width:44px;height:44px;padding:10px;cursor:pointer}.menu-toggle span{display:block;height:2px;width:100%;background:#eee}.site-nav{display:none;position:absolute;top:100%;left:0;right:0;background:#0c141a;border-bottom:1px solid var(--line);padding:1rem;box-shadow:0 20px 30px #0009}.site-nav.open{display:flex;flex-direction:column;align-items:stretch;gap:0}.site-nav>a:not(.button){font-size:1rem;padding:.7rem}.site-nav .button{margin-top:.5rem}}';
if (!document.querySelector('link[href="/css/bible.css"]')) document.head.appendChild(bibleNavStyle);

// without rewriting their historical content.
const ensureBibleLink = (nav, beforeHref) => {
  if (!nav || nav.querySelector('a[href="/bible.html"]')) return;
  const link = document.createElement('a');
  link.href = '/bible.html';
  link.textContent = 'Project Bible';
  const before = beforeHref ? nav.querySelector(`a[href="${beforeHref}"]`) : null;
  if (before) nav.insertBefore(link, before);
  else nav.appendChild(link);
};
ensureBibleLink(document.querySelector('.site-nav'), '/history.html');
document.querySelectorAll('.site-footer nav').forEach(nav => ensureBibleLink(nav, '/history.html'));

const archiveIntro = document.querySelector('.archive-main .archive-intro');
if (archiveIntro && !document.querySelector('.bible-history-callout')) {
  const callout = document.createElement('p');
  callout.className = 'archive-intro bible-history-callout';
  callout.style.borderLeft = '2px solid #dbb883';
  callout.style.paddingLeft = '1rem';
  callout.innerHTML = 'Looking for the current product state? <a class="text-link" href="/bible.html">Open the Project Bible ↗</a>';
  archiveIntro.insertAdjacentElement('afterend', callout);
}
