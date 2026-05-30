// ============ Shared JS for أدوات التاجر ============

document.addEventListener('DOMContentLoaded', () => {
  // Cursor glow
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);
  document.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  });

  // Theme toggle — works for any page with #themeToggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const h = document.documentElement;
      const next = h.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      h.setAttribute('data-theme', next);
      localStorage.setItem('tajer-theme', next);
    });
  }

  // Mobile menu toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => navLinks.classList.toggle('mobile-open'));
  }

  // Nav scroll effect — adds .scrolled to nav.main-nav on inner pages
  const mainNav = document.querySelector('nav.main-nav');
  if (mainNav) {
    let rafPending = false;
    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        mainNav.classList.toggle('scrolled', window.scrollY > 40);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Scroll reveal — supports both .reveal and [data-reveal]
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, [data-reveal]').forEach(el => revealObs.observe(el));

  // Counter animation — Latin (English) numerals
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counters = entry.target.querySelectorAll('.counter');
        counters.forEach(counter => {
          if (counter.dataset.animated) return;
          counter.dataset.animated = 'true';
          const target = parseFloat(counter.dataset.target);
          const decimals = parseInt(counter.dataset.decimals || 0);
          const duration = 2000;
          const start = performance.now();
          function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = eased * target;
            counter.textContent = decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString('en-US');
            if (progress < 1) requestAnimationFrame(update);
          }
          requestAnimationFrame(update);
        });
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.counters-container, .stats-grid').forEach(el => counterObserver.observe(el));
});

// Copy to clipboard helper
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = button.innerHTML;
    button.innerHTML = 'تم النسخ ✓';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = orig;
      button.classList.remove('copied');
    }, 1800);
  });
}

// Format currency — Latin numerals with Arabic SAR symbol
function formatSAR(num) {
  return new Intl.NumberFormat('ar-SA-u-nu-latn', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

// Format number — Latin (English) numerals
function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}
