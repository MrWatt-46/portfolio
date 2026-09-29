/* ══════════════════════════════════════════════════════
   HOVER.JS — Planet hover interaction
   Raycasting → show frosted-glass data card on hover
   Card stays open while mouse is on planet OR card
══════════════════════════════════════════════════════ */

'use strict';

function initHover() {
  var SS = window.SolarSystem;

  /* ── DOM refs ─────────────────────────── */
  var card        = document.getElementById('planet-card');
  var cardEmoji   = document.getElementById('card-emoji');
  var cardPName   = document.getElementById('card-planet-name');
  var cardTitle   = document.getElementById('card-title');
  var cardContent = document.getElementById('card-content');
  var closeBtn    = document.getElementById('card-close');
  var canvas      = document.getElementById('solar-canvas');

  /* ── State ────────────────────────────── */
  var activePlanetId   = null;
  var isCardVisible    = false;
  var isMouseOnCard    = false;
  var hideCardTimer    = null;
  var lastHoveredId    = null;
  var checkInterval    = null;

  /* ── Section titles ───────────────────── */
  var SECTION_TITLES = {
    about:     'About Me',
    skills:    'Skills',
    projects:  'Projects',
    education: 'Education',
  };

  /* ══════════════════════════════════════
     CARD VISIBILITY
  ══════════════════════════════════════ */
  function showCard(meshUserData) {
    var id      = meshUserData.id;
    var section = meshUserData.section;

    if (id === activePlanetId && isCardVisible) return; // already shown
    activePlanetId = id;
    isCardVisible  = true;

    // Populate
    cardEmoji.textContent  = meshUserData.emoji;
    cardPName.textContent  = meshUserData.label;
    cardTitle.textContent  = SECTION_TITLES[section] || section;
    cardContent.innerHTML  = buildContent(section);

    card.classList.add('visible');
    card.setAttribute('aria-hidden', 'false');
  }

  function hideCard() {
    isCardVisible  = false;
    activePlanetId = null;
    lastHoveredId  = null;
    card.classList.remove('visible');
    card.setAttribute('aria-hidden', 'true');
  }

  function scheduleHide() {
    hideCardTimer = setTimeout(function () {
      if (!isMouseOnCard) hideCard();
    }, 320);
  }

  function cancelHide() {
    if (hideCardTimer) clearTimeout(hideCardTimer);
  }

  /* ══════════════════════════════════════
     RAYCASTER POLL (every animation frame)
     We poll because Three.js runs its own loop
  ══════════════════════════════════════ */
  checkInterval = setInterval(function () {
    var hovered = SS.hoveredPlanet;

    if (hovered) {
      var id = hovered.userData.id;
      canvas.style.cursor = 'pointer';

      if (id !== lastHoveredId) {
        lastHoveredId = id;
        cancelHide();
        showCard(hovered.userData);
      }
    } else {
      canvas.style.cursor = 'default';

      if (lastHoveredId && !isMouseOnCard) {
        lastHoveredId = null;
        scheduleHide();
      }
    }
  }, 40); // ~25fps check is more than enough

  /* ══════════════════════════════════════
     CARD MOUSE EVENTS — keep card open
  ══════════════════════════════════════ */
  card.addEventListener('mouseenter', function () {
    isMouseOnCard = true;
    cancelHide();
  });

  card.addEventListener('mouseleave', function () {
    isMouseOnCard = false;
    if (!SS.hoveredPlanet) scheduleHide();
  });

  /* ══════════════════════════════════════
     CLOSE BUTTON & KEYBOARD
  ══════════════════════════════════════ */
  closeBtn.addEventListener('click', hideCard);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isCardVisible) hideCard();
  });

  /* ══════════════════════════════════════
     TOUCH SUPPORT — tap canvas to show card
  ══════════════════════════════════════ */
  canvas.addEventListener('click', function () {
    if (SS.hoveredPlanet) {
      showCard(SS.hoveredPlanet.userData);
    }
  });

  /* ══════════════════════════════════════
     CONTENT BUILDERS
  ══════════════════════════════════════ */
  function buildContent(section) {
    switch (section) {
      case 'about':     return buildAbout();
      case 'skills':    return buildSkills();
      case 'projects':  return buildProjects();
      case 'education': return buildEducation();
      default:          return '<p style="color:var(--text-muted)">No data yet.</p>';
    }
  }

  /* ── About ────────────────────────────── */
  function buildAbout() {
    var d = PORTFOLIO.about;
    var tags = (d.tags || []).map(function (t) {
      return '<span class="about-tag">' + esc(t) + '</span>';
    }).join('');

    return (
      '<p class="about-bio">' + esc(d.bio) + '</p>' +
      '<div class="about-tags">' + tags + '</div>'
    );
  }

  /* ── Skills ───────────────────────────── */
  function buildSkills() {
    var s = PORTFOLIO.skills;

    function group(label, items) {
      var chips = items.map(function (sk) {
        return '<span class="skill-chip">' + esc(sk) + '</span>';
      }).join('');
      return (
        '<div class="skills-group">' +
          '<div class="skills-group-label">' + label + '</div>' +
          '<div class="skills-chips">' + chips + '</div>' +
        '</div>'
      );
    }

    return (
      group('Frontend',  s.frontend  || []) +
      group('Backend',   s.backend   || []) +
      group('Tools',     s.tools     || [])
    );
  }

  /* ── Projects ─────────────────────────── */
  function buildProjects() {
    return (PORTFOLIO.projects || []).map(function (p) {
      var techTags = (p.tech || []).map(function (t) {
        return '<span class="project-tech-tag">' + esc(t) + '</span>';
      }).join('');

      var links = '';
      if (p.github && !p.github.startsWith('{')) {
        links += '<a href="' + esc(p.github) + '" target="_blank" class="project-link">↗ GitHub</a>';
      }
      if (p.live && !p.live.startsWith('{')) {
        links += '<a href="' + esc(p.live) + '" target="_blank" class="project-link">🌐 Live</a>';
      }

      return (
        '<div class="project-item">' +
          '<div class="project-title">' + esc(p.title) + '</div>' +
          '<div class="project-desc">'  + esc(p.description) + '</div>' +
          '<div class="project-tech">'  + techTags + '</div>' +
          '<div class="project-links">' + links + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ── Education ─────────────────────────── */
  function buildEducation() {
    return (PORTFOLIO.education || []).map(function (e) {
      var gpaStr = (e.gpa && !e.gpa.startsWith('{')) ? ' · GPA: ' + esc(e.gpa) : '';
      return (
        '<div class="edu-item">' +
          '<div class="edu-degree">'      + esc(e.degree)      + '</div>' +
          '<div class="edu-field">'       + esc(e.field)       + '</div>' +
          '<div class="edu-institution">' + esc(e.institution) + '</div>' +
          '<div class="edu-year">'        + esc(e.year) + gpaStr + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ── HTML escape utility ─────────────── */
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }
}
