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

})();
