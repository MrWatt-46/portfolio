/* ══════════════════════════════════════════════════════
   SCROLL.JS — GSAP ScrollTrigger camera journey
   Camera zooms from deep space → Sun as user scrolls
   Planets are revealed one-by-one along the way
══════════════════════════════════════════════════════ */

'use strict';

function initScroll() {
  var SS = window.SolarSystem;
  if (!SS || !SS.isReady) return;

  gsap.registerPlugin(ScrollTrigger);

  /* ── Camera travel bounds ─────────────── */
  var START_Z = 830;
  var END_Z   = 52;
  var START_Y = 80;
  var END_Y   = 18;

  /* ── DOM refs ─────────────────────────── */
  var spFill         = document.getElementById('sp-fill');
  var heroText       = document.getElementById('hero-text');
  var approachLabel  = document.getElementById('planet-approach-label');
  var approachIcon   = document.getElementById('approach-icon');
  var approachName   = document.getElementById('approach-name');
  var spStops        = document.querySelectorAll('.sp-stop');
  var canvas         = document.getElementById('solar-canvas');

  /* ── Milestones for sidebar stops ────── */
  var milestones = [0.00, 0.18, 0.40, 0.60, 0.78, 1.00];
  var approachTimeout = null;

  /* ── Main ScrollTrigger ───────────────── */
  ScrollTrigger.create({
    trigger:  '#scroll-spacer',
    start:    'top top',
    end:      'bottom top',
    scrub:    2.0,  // smoothing lag in seconds

    onUpdate: function (self) {
      var p = self.progress;
      SS.scrollProgress = p;

      /* Camera position */
      SS.camera.position.z = lerp(START_Z, END_Z, easeInOut(p));
      SS.camera.position.y = lerp(START_Y, END_Y, p);

      /* Scroll sidebar fill */
      if (spFill) spFill.style.height = (p * 100) + '%';

      /* Active milestone dot */
      var activeIdx = 0;
      milestones.forEach(function (m, i) {
        if (p >= m) activeIdx = i;
      });
      spStops.forEach(function (dot, i) {
        dot.classList.toggle('active', i === activeIdx);
      });

      /* Hero text fades out early in scroll */
      if (heroText) {
        if (p > 0.03) {
          heroText.style.opacity = Math.max(0, 1 - (p - 0.03) / 0.09).toString();
        } else {
          heroText.style.opacity = '1';
        }
      }

      /* Planet reveals */
      SS.planets.forEach(function (planet) {
        if (!planet.revealed && p >= planet.cfg.revealAt) {
          revealPlanet(planet);
        }
      });
    },
  });

  /* ── Mouse → raycaster coords ─────────── */
  window.addEventListener('mousemove', function (e) {
    if (SS.mouse) {
      SS.mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      SS.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
  });

  /* ── Reveal a planet ──────────────────── */
  function revealPlanet(planet) {
    planet.revealed = true;
    planet.group.visible = true;
    planet.group.scale.set(0.001, 0.001, 0.001);

    // Scale in with elastic bounce
    gsap.to(planet.group.scale, {
      x: 1, y: 1, z: 1,
      duration: 1.4,
      ease: 'elastic.out(1, 0.55)',
    });

    // Show approach label
    showApproach(planet.cfg.emoji, planet.cfg.label);
  }

  /* ── Approach label animation ─────────── */
  function showApproach(emoji, name) {
    if (approachTimeout) clearTimeout(approachTimeout);

    approachIcon.textContent = emoji;
    approachName.textContent = name;

    approachLabel.classList.remove('hidden');
    approachLabel.classList.add('visible');

    approachTimeout = setTimeout(function () {
      approachLabel.classList.remove('visible');
      setTimeout(function () {
        approachLabel.classList.add('hidden');
      }, 420);
    }, 2800);
  }

  /* ── Nav link → scroll to planet ──────── */
  document.querySelectorAll('[data-planet]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var id     = link.dataset.planet;
      var planet = SS.planets.find(function (p) { return p.cfg.id === id; });
      if (!planet) return;

      // Compute scroll position for this planet's revealAt threshold
      var spacer = document.getElementById('scroll-spacer');
      if (!spacer) return;
      var totalHeight = spacer.offsetHeight;
      var target = totalHeight * (planet.cfg.revealAt + 0.06); // slightly past reveal
      window.scrollTo({ top: target, behavior: 'smooth' });
    });
  });
}

/* ── Utility ────────────────────────── */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
