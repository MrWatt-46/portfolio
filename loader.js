/* ══════════════════════════════════════════════════════
   LOADER.JS
   Terminal counter animation → Welcome → circle wipe → reveal
══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Config ──────────────────────────── */
  const COUNTER_MS = 2300; // total time to count 0→100
  const HOLD_MS = 380;  // pause after reaching 100%
  const WELCOME_MS = 650;  // how long "Welcome" is shown
  const WIPE_MS = 870;  // circle wipe duration (must match CSS)

  /* ── DOM refs ────────────────────────── */
  const elLoader   = document.getElementById('loader');
  const elCounter  = document.getElementById('loader-counter');
  const elCircle   = document.getElementById('loader-circle');
  const elContent  = document.querySelector('.loader-content');
  const elWelcome  = document.getElementById('loader-welcome');
  const elOverlay  = document.getElementById('loader-overlay');
  const elNavbar   = document.getElementById('navbar');
  const elHeroText = document.getElementById('hero-text');
  const elScrollPB = document.getElementById('scroll-progress-bar');

  /* ── State ───────────────────────────── */
  let startTime = null;
  let rafId     = null;

  /* ── Easing ──────────────────────────── */
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /* ── Phase 1: Count 0 → 100 ──────────── */
  function tick(timestamp) {
    if (!startTime) startTime = timestamp;

    const elapsed  = timestamp - startTime;
    const raw      = Math.min(elapsed / COUNTER_MS, 1);
    const eased    = easeInOutQuad(raw);
    const value    = Math.floor(eased * 100);

    elCounter.textContent = String(value).padStart(2, '0');
    if (elCircle) {
      const circumference = 465;
      const offset = circumference - (value / 100) * circumference;
      elCircle.style.strokeDashoffset = offset;
    }

    if (raw < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      // Snap to 100
      elCounter.textContent = '100';
      if (elCircle) elCircle.style.strokeDashoffset = '0';
      setTimeout(phaseWelcome, HOLD_MS);
    }
  }

  /* ── Phase 2: Show "Welcome" ─────────── */
  function phaseWelcome() {
    // Fade out counter block
    elContent.classList.add('fade-out');

    // Slide in welcome text (CSS transition)
    setTimeout(() => {
      elWelcome.classList.add('show');
    }, 120);

    // Begin wipe after welcome is shown
    setTimeout(phaseWipe, WELCOME_MS);
  }

  /* ── Phase 3: Circle wipe ────────────── */
  function phaseWipe() {
    elOverlay.classList.add('expanding');
    setTimeout(phaseReveal, WIPE_MS - 60);
  }

  /* ── Phase 4: Reveal main site ───────── */
  function phaseReveal() {
    // Dismiss loader
    elLoader.classList.add('done');

    // Populate dynamic data
    if (typeof PORTFOLIO !== 'undefined') {
      applyData();
    }

    // Show UI with stagger
    setTimeout(() => {
      elNavbar.classList.remove('hidden');
      elNavbar.classList.add('visible');
    }, 80);

    setTimeout(() => {
      elHeroText.classList.remove('hidden');
      elHeroText.classList.add('visible');
      elScrollPB.classList.add('visible');
    }, 200);

    // Init Three.js + GSAP
    setTimeout(() => {
      if (typeof initSolarSystem === 'function') initSolarSystem();
      if (typeof initScroll === 'function') initScroll();
      if (typeof initHover === 'function') initHover();
    }, 60);
  }

  /* ── Apply PORTFOLIO data to HTML ────── */
  function applyData() {
    const p = PORTFOLIO;

    // Nav logo & resume
    const navLogo = document.getElementById('nav-logo');
    if (navLogo && p.initials) navLogo.textContent = p.initials;

    const navResume = document.getElementById('nav-resume');
    if (navResume && p.resume) navResume.href = p.resume;

    // Hero
    const heroName = document.getElementById('hero-name');
    const heroTitle = document.getElementById('hero-title');
    if (heroName && p.name) heroName.textContent = p.name;
    if (heroTitle && p.title) heroTitle.textContent = p.title;

    // Contact section
    const contactMsg = document.getElementById('contact-msg');
    const contactName = document.getElementById('contact-name');
    const contactEmail = document.getElementById('contact-email-btn');
    const contactGH = document.getElementById('contact-github-btn');
    const contactLI = document.getElementById('contact-linkedin-btn');

    if (contactMsg && p.contactMessage) contactMsg.textContent = p.contactMessage;
    if (contactName && p.name) contactName.textContent = p.name;
    if (contactEmail && p.email) contactEmail.href = 'mailto:' + p.email;
    if (contactGH && p.github) contactGH.href = p.github;
    if (contactLI && p.linkedin) contactLI.href = p.linkedin;

    // Page title
    if (p.name && !p.name.startsWith('{')) {
      document.title = p.name + ' — Portfolio';
    }
  }

  /* ── Boot ────────────────────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    // Small pause so browser paints the loader first
    setTimeout(() => requestAnimationFrame(tick), 250);
  });

}());
