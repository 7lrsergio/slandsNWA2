/*
 * Combined script for the SLANDS landing page
 * – mobile-safe video playback
 * – working mobile navigation
 * – portfolio carousel
 */

/* ============================================================
   HORIZONTAL SLIDER (unchanged)
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('slider');
  if (!slider) return;

  slider.addEventListener('wheel', (e) => {
    if (e.shiftKey) return;
    slider.scrollBy({ left: e.deltaY, behavior: 'smooth' });
    e.preventDefault();
  });
});

/* ============================================================
   TEXT REVEAL (unchanged)
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('.texts span');

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('visible', entry.isIntersecting);
      });
    },
    { rootMargin: '0px 0px -140px 0px' }
  );

  targets.forEach(t => observer.observe(t));
});

/* ============================================================
   MOBILE NAV MENU (unchanged)
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobileMenu');
  const close = document.querySelector('.mobile-close');

  if (!toggle || !menu || !close) return;

  const links = menu.querySelectorAll('a');

  const openMenu = () => {
    menu.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', openMenu);
  close.addEventListener('click', closeMenu);
  links.forEach(link => link.addEventListener('click', closeMenu));
});

/* ============================================================
   PORTFOLIO CAROUSEL
============================================================ */
class PortfolioCarousel {
  constructor() {
    this.cards = document.querySelectorAll('.portfolioCard');
    this.currentIndex = 0;

    // Detect mobile ONCE
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;

    this.init();
  }

  init() {
    this.initNavigation();
    this.initVideos();
  }

  initNavigation() {
    document.querySelector('.carousel-nav.prev')
      ?.addEventListener('click', () => this.go(this.currentIndex - 1));

    document.querySelector('.carousel-nav.next')
      ?.addEventListener('click', () => this.go(this.currentIndex + 1));
  }

  go(index) {
    if (index < 0) index = this.cards.length - 1;
    if (index >= this.cards.length) index = 0;

    this.cards[this.currentIndex].classList.remove('active');
    this.currentIndex = index;
    this.cards[this.currentIndex].classList.add('active');
  }

  /* ============================================================
     ONLY SECTION MODIFIED — VIDEO LOGIC
  ============================================================ */
  initVideos() {
    this.cards.forEach((card, index) => {
      const video = card.querySelector('.portfolioVid');
      const container = card.querySelector('.video-container');

      if (!video || !container) return;

      /* ---------- MOBILE ONLY ---------- */
      if (this.isMobile) {
        let overlay = container.querySelector('.video-overlay');

        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'video-overlay';
          overlay.innerHTML = `<span>Tap to play</span>`;
          container.appendChild(overlay);
        }

        overlay.style.pointerEvents = 'auto';

        overlay.addEventListener('click', () => {
          overlay.style.display = 'none';
          video.play();
        });

        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting || index !== this.currentIndex) {
              video.pause();
              video.currentTime = 0;
              overlay.style.display = '';
            }
          });
        }, { threshold: 0.6 });

        observer.observe(container);
        return; // 🚨 IMPORTANT: do NOT touch desktop logic
      }

      /* ---------- DESKTOP (ORIGINAL BEHAVIOR) ---------- */
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && index === this.currentIndex) {
            video.play();
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      }, { threshold: 0.6 });

      observer.observe(container);
    });
  }
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.portfolioCard')) {
    new PortfolioCarousel();
  }
});
