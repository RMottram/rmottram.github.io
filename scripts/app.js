// app.js — shared behaviour for app landing pages
(function () {
  // Animate-on-scroll
  if (window.AOS) {
    AOS.init({ once: true, duration: 650, easing: 'ease-out-cubic' });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var answer = item.querySelector('.faq-a');
      var isOpen = item.classList.toggle('open');
      answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : null;
    });
  });

  // ---- Light/dark toggle ----
  // Only runs on pages carrying the button. The saved choice is applied
  // pre-paint by an inline script in the head; this keeps the icon, the
  // browser chrome and localStorage in step from then on.
  var themeToggle = document.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    var root = document.documentElement;
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    function isDark() {
      var set = root.getAttribute('data-theme');
      return set ? set === 'dark' : systemDark.matches;
    }

    function syncToggle() {
      var dark = isDark();
      var icon = themeToggle.querySelector('i');
      if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
      themeToggle.setAttribute('aria-pressed', String(dark));
      themeToggle.title = dark ? 'Switch to light' : 'Switch to dark';
      // Keep the address bar in step with the canvas.
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
        m.setAttribute('content', dark ? '#1A2E23' : '#F2F0EB');
        m.removeAttribute('media');
      });
    }

    themeToggle.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('jb-theme', next); } catch (e) { /* private mode */ }
      syncToggle();
    });

    // Follow the system while the visitor has not chosen a side.
    systemDark.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) syncToggle();
    });

    syncToggle();
  }

  // Current year in footer
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // ---- Screenshot carousel auto-scroll + manual controls ----
  document.querySelectorAll('.shots--carousel').forEach(function (shots) {
    // Wrap in a relative container and inject prev/next buttons
    var wrapper = document.createElement('div');
    wrapper.className = 'shots-wrapper shots-wrapper--carousel';
    shots.parentNode.insertBefore(wrapper, shots);
    wrapper.appendChild(shots);

    var prev = document.createElement('button');
    prev.className = 'shots-btn shots-btn--prev';
    prev.setAttribute('aria-label', 'Previous screenshot');
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';

    var next = document.createElement('button');
    next.className = 'shots-btn shots-btn--next';
    next.setAttribute('aria-label', 'Next screenshot');
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';

    wrapper.appendChild(prev);
    wrapper.appendChild(next);

    var INTERVAL = 2000;    // ms between auto-scrolls
    var RESUME_DELAY = 2000; // ms after interaction before resuming
    var paused = false;
    var resumeTimer = null;

    function pause() {
      paused = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { paused = false; }, RESUME_DELAY);
    }

    // Advance by a full page of shots, so each move reveals an entirely
    // new set rather than sliding along by one. Measured at call time so
    // it stays correct after images load and across breakpoints.
    function step() {
      var first = shots.querySelector('img');
      if (!first) return shots.clientWidth;
      var gap = parseFloat(getComputedStyle(shots).columnGap) || 0;
      var unit = first.getBoundingClientRect().width + gap;
      // how many fit in the visible track (1 at the mobile breakpoint)
      var perView = Math.max(1, Math.round((shots.clientWidth + gap) / unit));
      return unit * perView;
    }

    // Auto-scroll: advance one page, loop back to start at the end.
    // Skipped under reduced-motion; the buttons below still work.
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var autoTimer = setInterval(function () {
      if (paused || reduceMotion) return;
      var maxScroll = shots.scrollWidth - shots.clientWidth;
      if (shots.scrollLeft >= maxScroll - 1) {
        shots.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        shots.scrollBy({ left: step(), behavior: 'smooth' });
      }
    }, INTERVAL);

    // Manual buttons
    prev.addEventListener('click', function () {
      pause();
      shots.scrollBy({ left: -step(), behavior: 'smooth' });
    });
    next.addEventListener('click', function () {
      pause();
      shots.scrollBy({ left: step(), behavior: 'smooth' });
    });

    // Pause on hover / touch
    wrapper.addEventListener('mouseenter', pause);
    wrapper.addEventListener('touchstart', pause, { passive: true });
  });

  // ---- Screenshot gallery: filters + prev/next paging ----
  document.querySelectorAll('.gallery').forEach(function (gallery) {
    var track = gallery.querySelector('.gallery-track');
    var items = Array.prototype.slice.call(gallery.querySelectorAll('.gallery-item'));
    var filters = gallery.querySelectorAll('.gallery-filter');
    var prev = gallery.querySelector('.gallery-btn--prev');
    var next = gallery.querySelector('.gallery-btn--next');
    if (!track) return;

    // Hide a button at its end of the strip, or both when nothing overflows
    function updateButtons() {
      var maxScroll = track.scrollWidth - track.clientWidth;
      var canPrev = track.scrollLeft > 1;
      var canNext = track.scrollLeft < maxScroll - 1;
      if (prev) prev.disabled = !canPrev;
      if (next) next.disabled = !canNext;
      // The viewport's classes drive the edge fades
      track.parentNode.classList.toggle('can-prev', canPrev);
      track.parentNode.classList.toggle('can-next', canNext);
    }

    // A page is as many whole screens as are fully on show
    function step() {
      var first = items.filter(function (item) { return !item.hidden; })[0];
      if (!first) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var unit = first.getBoundingClientRect().width + gap;
      return unit * Math.max(1, Math.floor((track.clientWidth + gap) / unit));
    }

    filters.forEach(function (button) {
      button.addEventListener('click', function () {
        var tag = button.getAttribute('data-filter');
        filters.forEach(function (other) {
          var on = other === button;
          other.classList.toggle('is-active', on);
          other.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        items.forEach(function (item) {
          var tags = (item.getAttribute('data-tags') || '').split(' ');
          item.hidden = tag !== 'all' && tags.indexOf(tag) === -1;
        });
        track.scrollTo({ left: 0 });
        updateButtons();
      });
    });

    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    window.addEventListener('load', updateButtons);
    updateButtons();
  });

})();
