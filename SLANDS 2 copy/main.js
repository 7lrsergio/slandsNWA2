/*
 * main.js
 *
 * This script contains all non‑video behaviour for the SLANDS landing page.  It
 * wires up the horizontal slider, text reveal animation, portfolio carousel
 * (navigation, auto‑advance, progress bar and details toggling), services
 * modal and mobile navigation menu.  Video playback logic lives in
 * video.js to keep the responsibilities clear and to make it easy to swap
 * implementations or disable autoplay entirely.
 */

/* -------------------------------------------------------------------------
 * Horizontal slider support
 *
 * If you have an element with id="slider" that overflows horizontally,
 * scrolling the mouse wheel will move it left/right.  Holding the shift key
 * disables the behaviour so that you can still scroll vertically.
 */
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('slider');
  if (!slider) return;
  slider.addEventListener('wheel', (e) => {
    if (e.shiftKey) return;
    slider.scrollBy({ left: e.deltaY, behavior: 'smooth' });
    e.preventDefault();
  });
});

/* -------------------------------------------------------------------------
 * Text reveal animation
 *
 * Wraps text in elements with the `.texts` class in span tags and uses an
 * IntersectionObserver to reveal those spans when they enter the viewport.
 */
document.addEventListener('DOMContentLoaded', () => {
  const SPLIT_WORDS = false;
  const blocks = document.querySelectorAll('.texts');
  if (SPLIT_WORDS) {
    blocks.forEach((el) => {
      if (el.dataset.split === '1') return;
      const raw = el.textContent.trim();
      el.textContent = '';
      raw.split(/(\s+)/).forEach((t) => {
        if (t.trim() === '') {
          el.append(t);
        } else {
          const w = document.createElement('span');
          w.textContent = t;
          el.append(w);
        }
      });
      el.dataset.split = '1';
    });
  } else {
    // Ensure each `.texts` block has at least one span so our reveal works
    blocks.forEach((el) => {
      if (el.querySelector('span')) return;
      const wrapper = document.createElement('span');
      wrapper.textContent = el.textContent.trim();
      el.textContent = '';
      el.append(wrapper);
    });
  }
  const targets = SPLIT_WORDS
    ? document.querySelectorAll('.texts span')
    : document.querySelectorAll('.texts > span');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('visible', entry.isIntersecting);
      });
    }, {
      rootMargin: '0px 0px -140px 0px',
      threshold: 0
    });
    targets.forEach((node) => observer.observe(node));
  } else {
    const revealFallback = () => {
      const threshold = window.innerHeight - 140;
      targets.forEach((node) => {
        const { top } = node.getBoundingClientRect();
        node.classList.toggle('visible', top < threshold);
      });
    };
    window.addEventListener('scroll', revealFallback, { passive: true });
    window.addEventListener('resize', revealFallback);
    revealFallback();
  }
});

/* -------------------------------------------------------------------------
 * Portfolio carousel
 *
 * Handles slide navigation, progress bar, auto‑advance and toggling of
 * additional details.  Video autoplay is handled separately in video.js.
 */
class PortfolioCarousel {
  constructor() {
    this.currentIndex = 0;
    // Grab all of the cards up front.  These represent the slides in
    // the carousel.  Later on we will ensure the indicator buttons
    // reflect the same count so navigation stays in sync.
    this.cards = document.querySelectorAll('.portfolioCard');

    // Before capturing the indicator NodeList, check whether the
    // existing markup has provided enough buttons for each card.  If
    // there are fewer indicators than cards (e.g. you add a new
    // portfolioCard to the HTML without updating the indicators) the
    // carousel will fall out of sync and the auto‑advance logic can
    // feel "off by one".  To make the component resilient we create
    // any missing indicators here.
    const indicatorContainer = document.querySelector('.carousel-indicators');
    if (indicatorContainer && indicatorContainer.children.length < this.cards.length) {
      // Add additional indicator buttons until the counts match.
      const startingIndex = indicatorContainer.children.length;
      for (let i = startingIndex; i < this.cards.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'indicator';
        btn.dataset.index = i.toString();
        btn.setAttribute('aria-label', `Go to slide ${i + 1}`);
        // Include data-testid for testing consistency if the first indicators use it
        btn.setAttribute('data-testid', `indicator-${i}`);
        indicatorContainer.appendChild(btn);
      }
    }
    // Now capture all indicators (including any we may have just added).
    this.indicators = document.querySelectorAll('.indicator');

    this.progressFill = document.querySelector('.progress-fill');
    this.autoAdvanceInterval = null;
    this.progressInterval = null;
    this.autoAdvanceDelay = 9000;
    this.isPaused = false;
    if (this.cards.length) {
      this.init();
    }
  }
  init() {
    this.initNavigation();
    this.initDetailsToggle();
    this.startAutoAdvance();
    this.initHoverPause();
  }
  initNavigation() {
    const prevButton = document.querySelector('.carousel-nav.prev');
    const nextButton = document.querySelector('.carousel-nav.next');
    prevButton?.addEventListener('click', () => this.goToPrevious());
    nextButton?.addEventListener('click', () => this.goToNext());
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => this.goToSlide(index));
    });
  }
  initDetailsToggle() {
    this.cards.forEach((card) => {
      const textContainer = card.querySelector('.pTextContainer');
      const learnMoreBtn = card.querySelector('.learn-more-btn');
      const closeBtn = card.querySelector('.close-details-btn');
      if (!textContainer) return;
      const toggle = () => {
        const isOpen = textContainer.classList.contains('expanded');
        if (isOpen) {
          textContainer.classList.remove('expanded');
          this.resumeAutoAdvance();
        } else {
          textContainer.classList.add('expanded');
          this.pauseAutoAdvance();
        }
      };
      learnMoreBtn?.addEventListener('click', toggle);
      closeBtn?.addEventListener('click', toggle);
    });
  }
  initHoverPause() {
    const container = document.querySelector('.carousel-container');
    if (!container) return;
    container.addEventListener('mouseenter', () => {
      const currentCard = this.cards[this.currentIndex];
      const isExpanded = currentCard.querySelector('.pTextContainer')?.classList.contains('expanded');
      if (!isExpanded) this.tempPauseAutoAdvance();
    });
    container.addEventListener('mouseleave', () => {
      const currentCard = this.cards[this.currentIndex];
      const isExpanded = currentCard.querySelector('.pTextContainer')?.classList.contains('expanded');
      if (!isExpanded) this.resumeAutoAdvance();
    });
  }
  goToSlide(index) {
    if (!this.cards[this.currentIndex]) return;
    // collapse details on all cards when changing slide
    this.cards.forEach((card) => {
      card.querySelector('.pTextContainer')?.classList.remove('expanded');
    });
    this.cards[this.currentIndex].classList.remove('active');
    this.cards[this.currentIndex].classList.add('prev');
    setTimeout(() => {
      this.cards[this.currentIndex].classList.remove('prev');
    }, 600);
    this.currentIndex = index;
    this.cards[this.currentIndex].classList.add('active');
    this.indicators.forEach((ind) => ind.classList.remove('active'));
    this.indicators[this.currentIndex]?.classList.add('active');
    this.resetProgress();
    this.resumeAutoAdvance();
  }
  goToNext() {
    const nextIndex = (this.currentIndex + 1) % this.cards.length;
    this.goToSlide(nextIndex);
  }
  goToPrevious() {
    const prevIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
    this.goToSlide(prevIndex);
  }
  startAutoAdvance() {
    this.resetProgress();
    this.startProgress();
    this.autoAdvanceInterval = setInterval(() => {
      this.goToNext();
    }, this.autoAdvanceDelay);
  }
  pauseAutoAdvance() {
    this.isPaused = true;
    if (this.autoAdvanceInterval) {
      clearInterval(this.autoAdvanceInterval);
      this.autoAdvanceInterval = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
  tempPauseAutoAdvance() {
    if (this.autoAdvanceInterval) {
      clearInterval(this.autoAdvanceInterval);
      this.autoAdvanceInterval = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
  resumeAutoAdvance() {
    if (!this.isPaused) {
      this.pauseAutoAdvance();
      this.startAutoAdvance();
    }
    this.isPaused = false;
  }
  startProgress() {
    let progress = 0;
    const increment = 100 / (this.autoAdvanceDelay / 100);
    this.progressInterval = setInterval(() => {
      progress += increment;
      if (progress >= 100) progress = 100;
      if (this.progressFill) this.progressFill.style.width = progress + '%';
    }, 100);
  }
  resetProgress() {
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.progressFill) this.progressFill.style.width = '0%';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PortfolioCarousel();
});

/* -------------------------------------------------------------------------
 * Services modal
 *
 * Defines the content for each service card and builds a modal on demand
 * when a card is clicked.  The modal can be closed via the overlay or
 * close button.
 */
// const servicesData = {
//   1: {
//     tier: 'Tier 1',
//     name: 'Launch – Basic Website',
//     price: '$1,000 – $1,500',
//     tagline: 'Professional Digital Storefront',
//     summary: 'A one‑page site to get your business online quickly.',
//     description: [
//       'Banner & header featuring your logo and clean navigation',
//       'Services & pricing section to showcase your offerings',
//       'About section telling your story, values and what makes you different',
//       'Contact form wired directly to your inbox for instant enquiries',
//       'Clean footer with business details and social links',
//       'Mobile‑optimised and ready to expand as your business grows'
//     ],
//     upsells: [],
//     bestFor: [
//       { type: 'Start‑ups & Small Businesses', reason: 'Need a professional online presence quickly with predictable costs' },
//       { type: 'Freelancers & Consultants', reason: 'Showcase services and capture leads without a large initial investment' }
//     ]
//   },
//   2: {
//     tier: 'Tier 2',
//     name: 'Bost – Advanced Website + Maintenance',
//     price: '$2,000 setup + $100–250/mo',
//     tagline: 'Professional + Ongoing Protection',
//     summary: 'A premium website build coupled with continuous care and optimisation.',
//     description: [
//       'Custom website design and build, hosting and contact form integration',
//       'Regular backups, software/plugin updates and uptime monitoring',
//       'Broken link checks and minor content updates',
//       'Digital marketing assistance, security scans and site‑speed optimisation',
//       'SEO monitoring and upgrades',
//       '24/7 security monitoring and advanced security updates',
//       'Performance optimisation and specialised technical support',
//       'Custom development and regular software updates',
//       'Ongoing content creation to keep your site fresh'
//     ],
//     upsells: [],
//     bestFor: [
//       { type: 'Growing Businesses', reason: 'Need a robust site with proactive maintenance and marketing' },
//       { type: 'E‑commerce & Content‑Rich Sites', reason: 'Require frequent updates, security and performance tuning' }
//     ]
//   },
//   3: {
//     tier: 'Tier 4',
//     name: 'Automate – Custom Software / Automation',
//     price: '$5,000 – $10,000+',
//     tagline: 'Replace Repetitive Tasks',
//     summary: 'Bespoke software that streamlines your operations and scales with you.',
//     description: [
//       'Complete flexibility to adapt to your evolving business needs',
//       'Tailored integration with your existing tools to eliminate data silos',
//       'Precision fit: only the features you need, without unnecessary complexity',
//       'Scalable architecture that grows with your business',
//       'Automates repetitive tasks such as scheduling, inventory and order processing',
//       'Centralised management for unified operations and smarter decisions',
//       'Role‑optimised interfaces that reduce training time and cognitive load',
//       'Integrated communication tools for better collaboration and task tracking',
//       'Real‑time reporting and analytics for actionable insights',
//       'Personalised customer portals for self‑service ordering and information'
//     ],
//     upsells: [],
//     bestFor: [
//       { type: 'Established Companies', reason: 'Need to eliminate manual processes and improve efficiency' },
//       { type: 'Complex Workflows', reason: 'Require custom solutions that off‑the‑shelf software can’t provide' }
//     ]
//   },
//   4: {
//     tier: 'Tier 4',
//     name: 'Scale – AI Assistant / Chatbot',
//     price: '$2,000 – $5,000 + monthly',
//     tagline: 'Your Virtual Employee',
//     summary: 'An intelligent assistant that engages customers and saves you time.',
//     description: [
//       'Provides fast, 24/7 customer service so visitors never wait for help',
//       'Delivers personalised experiences by integrating with your CRM and marketing tools',
//       'Communicates in multiple languages to serve a global audience',
//       'Offers consistent answers and an empathetic tone across every interaction',
//       'Empowers customers with self‑service options and instant answers to FAQs',
//       'Proactively assists users by monitoring activity and offering suggestions',
//       'Supports conversations across web, email, social and messaging channels',
//       'Continuously learns from interactions to improve responses and collect feedback'
//     ],
//     upsells: [],
//     bestFor: [
//       { type: 'Customer‑Focused Brands', reason: 'Want to scale support without hiring more agents' },
//       { type: 'Global Businesses', reason: 'Need multilingual support and omnichannel engagement' }
//     ]
//   }
// };

// function buildModalContent(service) {
//   const header = `
//     <div class="services-section__modal-header">
//       <div class="services-section__modal-header-content">
//         <div class="services-section__modal-info">
//           <span class="services-section__modal-tier">${service.tier}</span>
//           <h3 class="services-section__modal-title">${service.name}</h3>
//           <p class="services-section__modal-price">${service.price}</p>
//           <p class="services-section__modal-description">${service.summary}</p>
//         </div>
//       </div>
//     </div>
//   `;
//   const featuresList = service.description.map((item) => {
//     return `<li class="services-section__feature">
//       <svg class="services-section__check-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
//       <span class="services-section__feature-text">${item}</span>
//     </li>`;
//   }).join('');
//   const upsells = service.upsells.map((text) => {
//     return `<div class="services-section__upsell"><p>${text}</p></div>`;
//   }).join('');
//   const bestFor = service.bestFor.map((item) => {
//     return `<div class="services-section__business-type">
//       <p class="services-section__business-name">${item.type}</p>
//       <p class="services-section__business-reason">${item.reason}</p>
//     </div>`;
//   }).join('');
//   const body = `
//     <div class="services-section__modal-body">
//       <div class="services-section__modal-section">
//         <div class="services-section__section-title"><div class="services-section__section-accent"></div>Key Benefits</div>
//         <ul class="services-section__features">${featuresList}</ul>
//       </div>

//       </div>
//       <div class="services-section__modal-section">
//         <div class="services-section__section-title"><div class="services-section__section-accent"></div>Best For</div>
//         <div class="services-section__best-for">${bestFor}</div>
//       </div>
//     </div>
//   `;
//   return header + body;
// }

// document.addEventListener('DOMContentLoaded', () => {
//   const modal = document.getElementById('services-modal');
//   const modalBody = document.getElementById('modal-body');
//   const closeBtn = document.getElementById('modal-close');
//   const overlay = modal?.querySelector('.services-section__modal-overlay');
//   const cards = document.querySelectorAll('.services-section__card');
//   if (!modal || !modalBody || !closeBtn || !overlay) return;
//   function openModal(serviceId, cardEl) {
//     const data = servicesData[serviceId];
//     if (!data) return;
//     modalBody.innerHTML = buildModalContent(data);
//     const iconContainer = cardEl.querySelector('.services-section__icon');
//     const modalIcon = modal.querySelector('#modal-service-icon');
//     if (iconContainer && modalIcon) {
//       modalIcon.innerHTML = iconContainer.innerHTML;
//     }
//     modal.classList.add('active');
//   }
//   function closeModal() {
//     modal.classList.remove('active');
//     modalBody.innerHTML = '';
//   }
//   cards.forEach((card) => {
//     const serviceId = parseInt(card.getAttribute('data-service'), 10);
//     card.addEventListener('click', () => openModal(serviceId, card));
//   });
//   closeBtn.addEventListener('click', closeModal);
//   overlay.addEventListener('click', closeModal);
// });

/* -------------------------------------------------------------------------
 * Mobile navigation menu
 *
 * Handles opening and closing the full screen menu on small screens.
 */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobileMenu');
  const closeBtn = document.querySelector('.mobile-close');
  if (!toggle || !menu || !closeBtn) return;
  const links = menu.querySelectorAll('a');
  function openMenu() {
    menu.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  toggle.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);
  links.forEach((link) => link.addEventListener('click', closeMenu));
});