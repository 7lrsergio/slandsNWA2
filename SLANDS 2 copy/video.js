/*
 * video.js
 *
 * This module handles video playback for the portfolio carousel.
 * It separates all video‑specific logic from the rest of the page so
 * that other behaviours (navigation, auto‑advance, modals, etc.) can
 * be managed independently in main.js.  Videos will only play when
 * their card is active and sufficiently visible in the viewport.  On
 * mobile devices an overlay invites the user to tap to play, and
 * videos automatically pause and reset when they leave view or the
 * active slide changes.
 */

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.portfolioCard');
  if (!cards.length) return;
  // Detect a narrow viewport once to toggle mobile behaviour
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  // Helper to get the current active card index based on the `.active` class
  function getCurrentIndex() {
    const active = document.querySelector('.portfolioCard.active');
    return active ? Array.from(cards).indexOf(active) : 0;
  }
  cards.forEach((card, index) => {
    const video = card.querySelector('.portfolioVid');
    const container = card.querySelector('.video-container');
    if (!video || !container) return;
    if (isMobile) {
      // On mobile we overlay a tap target to start playback.  When the
      // card or overlay leaves the viewport or the slide is no longer
      // active, we pause and reset the video and restore the overlay.
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
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const currentIndex = getCurrentIndex();
          // Pause and reset if this card is not active or not in view
          if (!entry.isIntersecting || index !== currentIndex) {
            video.pause();
            video.currentTime = 0;
            overlay.style.display = '';
          }
        });
      }, { threshold: 0.6 });
      observer.observe(container);
      return;
    }
    // Desktop behaviour: play when visible and current slide, otherwise
    // pause and reset to the beginning
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const currentIndex = getCurrentIndex();
        if (entry.isIntersecting && index === currentIndex) {
          video.play();
        } else {
          video.pause();
          video.currentTime = 0;
        }
      });
    }, { threshold: 0.6 });
    observer.observe(container);
  });
});