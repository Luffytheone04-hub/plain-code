/* Plain v1.0.0 — Documentation Website JS */

/* ── Copy buttons ────────────────────────────────────────────────────────── */
function initCopyButtons() {
  document.querySelectorAll('.code-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.code-block');
      const pre   = block ? block.querySelector('pre') : null;
      if (!pre) return;

      const text = pre.innerText.trim();
      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });

  /* install-strip copy buttons */
  document.querySelectorAll('.install-cmd button').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.closest('.install-cmd');
      const text = cmd ? cmd.querySelector('code').innerText.trim() : '';
      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

/* ── Mobile menu ─────────────────────────────────────────────────────────── */
function initMobileMenu() {
  const toggle = document.getElementById('nav-hamburger');
  const menu   = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.querySelector('i').className = open
      ? 'fa-solid fa-xmark'
      : 'fa-solid fa-bars';
  });

  /* close on link click */
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', false);
      toggle.querySelector('i').className = 'fa-solid fa-bars';
    });
  });
}

/* ── FAQ accordion ───────────────────────────────────────────────────────── */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item    = btn.closest('.faq-item');
      const isOpen  = item.classList.contains('open');

      /* close all others */
      document.querySelectorAll('.faq-item.open').forEach(o => {
        if (o !== item) o.classList.remove('open');
      });

      item.classList.toggle('open', !isOpen);
    });
  });
}

/* ── Active nav link on scroll ───────────────────────────────────────────── */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a[href^="#"]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      links.forEach(a => {
        const active = a.getAttribute('href') === `#${id}`;
        a.style.color = active ? 'var(--text)' : '';
      });
    });
  }, { rootMargin: '-50% 0px -45% 0px' });

  sections.forEach(s => observer.observe(s));
}

/* ── Smooth scroll nav highlight on click ────────────────────────────────── */
function initNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ── Boot ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initMobileMenu();
  initFAQ();
  initScrollSpy();
  initNavLinks();
});
