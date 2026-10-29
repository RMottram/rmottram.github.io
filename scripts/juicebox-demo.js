/* Try it: working copies of JuiceBox's Tools and Add New Session screens.
   The sums follow the app's own code: ToolsView for the calculators and
   CarItem.estimatedChargeKWh for the logging form's kWh estimate. UK units
   throughout (miles, p/kWh, p/litre), as the app uses in the UK. */
(function () {
  'use strict';

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function money(v) { return '£' + v.toFixed(2); }
  function trimNum(v) { return String(+v.toFixed(2)); }   // like Swift's %g for these sizes

  // Shared by both screens: write text into every [data-out] of a name
  function outputs(root) {
    return function (name, text) {
      root.querySelectorAll('[data-out="' + name + '"]').forEach(function (el) { el.textContent = text; });
    };
  }

  // Segmented controls: exactly one pressed button per group
  function wireSegments(root, onChange) {
    root.querySelectorAll('.jd-seg').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn || !seg.contains(btn)) return;
        seg.querySelectorAll('button').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        onChange(seg.getAttribute('data-seg'), btn.getAttribute('data-value'));
      });
    });
  }

  // ---------------------------------------------------------------- Tools
  var tools = document.getElementById('jd-tools');
  if (tools) {
    var out = outputs(tools);
    var s = { tool: 'time', fuel: 'electric', mode: 'journey' };
    var LITRES_PER_GALLON = 4.546;          // RegionHelper.litresPerGallon (UK)

    // Every input with the same data-key holds one value, as the app's
    // tools share one set of state between them
    function read() {
      tools.querySelectorAll('[data-key]').forEach(function (el) { s[el.getAttribute('data-key')] = num(el.value); });
    }
    tools.addEventListener('input', function (e) {
      var key = e.target.getAttribute('data-key');
      if (!key) return;
      tools.querySelectorAll('[data-key="' + key + '"]').forEach(function (el) {
        if (el !== e.target) el.value = e.target.value;
      });
      s[key] = num(e.target.value);
      render();
    });

    function duration(hours) {
      var total = Math.floor(hours * 60);   // Int(...) truncates, as in the app
      var h = Math.floor(total / 60), m = total % 60;
      if (h <= 0) return m + 'm';
      return m === 0 ? h + 'h' : h + 'h ' + m + 'm';
    }

    var HEAD = {
      time:    ['Estimated Time', 'Estimate how long a charge session will take from your current state of charge.', 'fa-clock'],
      cost:    ['Estimated Cost', 'Compare EV and fuel costs for journeys or top ups with the same calculation engine.', 'fa-pound-sign'],
      battery: ['Battery Level', 'Estimate how much your battery will deplete after a journey and how much range that will also equate to.', 'fa-battery-three-quarters']
    };

    function render() {
      var kWhNeeded = Math.max(0, s.capacity * ((s.target - s.current) / 100));
      var hours = s.speed > 0 ? s.capacity * (Math.max(0, s.target - s.current) / 100) / s.speed : 0;
      var price = s.price / 100;              // p/kWh typed, £/kWh underneath
      var fuelPerLitre = s.fuelPrice / 100;   // p/litre typed, £/litre underneath

      var cost;
      if (s.fuel === 'electric') {
        cost = s.mode === 'journey'
          ? (s.efficiency > 0 ? Math.max(0, s.miles * (price / s.efficiency)) : 0)
          : Math.max(0, kWhNeeded * price);
      } else {
        cost = s.mode === 'journey'
          ? (s.mpg > 0 ? Math.max(0, (s.miles / s.mpg) * LITRES_PER_GALLON * fuelPerLitre) : 0)
          : Math.max(0, (s.tank - s.fuelLevel) * fuelPerLitre);
      }

      var used = s.efficiency > 0 ? Math.max(0, s.miles / s.efficiency) : 0;
      var usedPct = s.capacity > 0 ? Math.max(0, used / s.capacity * 100) : 0;
      var ending = Math.max(0, s.current - usedPct);
      var energyLeft = s.capacity > 0 ? Math.max(0, s.capacity * ending / 100) : 0;
      var range = (s.capacity > 0 && s.efficiency > 0) ? Math.max(0, energyLeft * s.efficiency) : 0;

      // Header card, panels and the cost inputs on show
      var head = HEAD[s.tool];
      out('head-title', head[0]);
      out('head-sub', head[1]);
      out('summary-title', head[0]);
      out('mini-title', head[0]);
      tools.querySelector('[data-out="head-icon"]').className = 'fas ' + head[2];
      tools.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== s.tool; });
      tools.querySelectorAll('[data-show]').forEach(function (c) { c.hidden = c.getAttribute('data-show') !== s.fuel + '-' + s.mode; });
      out('refuel-label', s.fuel === 'electric' ? 'Charge Cost' : 'Refuel Cost');

      out('speed', Math.round(s.speed) + ' kW');
      out('target', Math.round(s.target) + '%');
      out('current', Math.round(s.current) + '%');
      out('kwh-needed', kWhNeeded.toFixed(2) + ' kWh');
      out('energy-used', used.toFixed(2) + ' kWh');
      out('battery-used', usedPct.toFixed(0) + '%');
      out('battery-left', ending.toFixed(0) + '%');
      out('energy-left', energyLeft.toFixed(2) + ' kWh');
      out('range', range.toFixed(0) + ' mi');

      // Result, description, warning and accent, as ToolsView's summary
      var result, summary, accent, warning = null;
      if (s.tool === 'time') {
        result = duration(hours);
        summary = kWhNeeded.toFixed(2) + ' kWh needed from ' + Math.round(s.current) + '% to ' + Math.round(s.target) + '% at ' + Math.round(s.speed) + ' kW.';
        accent = hours > 6 ? 'ember' : 'green';
        if (s.capacity <= 0) warning = 'Battery capacity must be greater than 0 kWh.';
        else if (s.target <= s.current) warning = 'Charge target must be higher than the current charge.';
      } else if (s.tool === 'cost') {
        result = money(cost);
        if (s.fuel === 'electric' && s.mode === 'journey') {
          summary = 'Based on ' + s.efficiency.toFixed(1) + ' mi/kWh, ' + s.price.toFixed(2) + 'p/kWh, and ' + Math.round(s.miles).toLocaleString('en-GB') + ' mi.';
          if (s.efficiency <= 0) warning = 'EV efficiency must be greater than 0.';
        } else if (s.fuel === 'electric') {
          summary = 'Based on ' + s.capacity.toFixed(1) + ' kWh battery and ' + kWhNeeded.toFixed(2) + ' kWh needed.';
          if (s.capacity <= 0) warning = 'Battery capacity must be greater than 0 kWh.';
        } else if (s.mode === 'journey') {
          summary = 'Based on ' + s.mpg.toFixed(1) + ' mpg, ' + s.fuelPrice.toFixed(2) + ' p/litre, and ' + Math.round(s.miles).toLocaleString('en-GB') + ' mi.';
          if (s.mpg <= 0) warning = 'MPG must be greater than 0.';
        } else {
          summary = 'Based on topping from ' + s.fuelLevel.toFixed(2) + 'L to ' + s.tank.toFixed(2) + 'L at ' + s.fuelPrice.toFixed(2) + ' p/litre.';
          if (s.tank <= s.fuelLevel) warning = 'Tank size must be greater than the current fuel level.';
        }
        var threshold = s.fuel === 'electric'
          ? (s.mode === 'refuel' ? (price > 0.5 ? 50 : 15) : 15)
          : (s.mode === 'journey' ? 30 : 60);
        accent = cost > threshold ? 'ember' : 'green';
      } else {
        result = ending.toFixed(0) + '%';
        summary = 'Using ' + used.toFixed(2) + ' kWh over ' + Math.round(s.miles).toLocaleString('en-GB') + ' mi at ' + s.efficiency.toFixed(1) + ' mi/kWh.';
        accent = ending <= 25 ? 'ember' : (ending <= 50 ? 'volt' : 'green');
        if (s.capacity <= 0) warning = 'Battery capacity must be greater than 0 kWh.';
        else if (s.efficiency <= 0) warning = 'EV efficiency must be greater than 0.';
        else if (s.current <= 0) warning = 'Current battery charge must be greater than 0%.';
      }
      out('result', result);
      out('mini-result', result);
      out('summary', summary);
      var warn = tools.querySelector('[data-out="warning"]');
      warn.hidden = !warning;
      warn.textContent = warning || '';
      tools.querySelector('[data-out="summary-card"]').setAttribute('data-accent', accent);
    }

    wireSegments(tools, function (group, value) { s[group] = value; render(); });

    // The compact result appears once the big one has scrolled out of view
    var card = tools.querySelector('[data-out="summary-card"]');
    var mini = tools.querySelector('[data-out="mini"]');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        mini.classList.toggle('is-shown', !entries[0].isIntersecting && entries[0].boundingClientRect.top < entries[0].rootBounds.top + 10);
      }, { root: tools.querySelector('.jd-scroll'), threshold: 0 }).observe(card);
    }

    read();
    render();
  }

  // ------------------------------------------------------- Add New Session
  var log = document.getElementById('jd-log');
  if (log) {
    var lout = outputs(log);
    var form = log.querySelector('[data-view="form"]');
    var saved = log.querySelector('[data-view="saved"]');
    var field = function (k) { return log.querySelector('[data-key="' + k + '"]'); };
    var where = 'home';

    // Item.homeChargingEfficiency / publicChargingEfficiency, and
    // Item.usableCapacityFraction for a car with no usable figure yet
    var EFFICIENCY = { home: 0.91, public: 0.95 };
    var USABLE_FRACTION = 0.94;
    var SOURCE_NOTE = {
      chargerApp: "The kWh your charger's app reported for the session.",
      chargerDisplay: 'The kWh shown on the charge point itself.',
      energyProvider: "The kWh from your electricity bill or supplier's app.",
      carDisplay: 'The kWh the car said it gained. Already excludes charging losses.'
    };

    // "Yesterday, 11:30 pm", as the app starts a home charge at off-peak
    function defaultStart() {
      var d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(23, 30, 0, 0);
      var pad = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function car() {
      var parts = field('car').value.split('|');
      return { capacity: num(parts[0]), name: parts[1] };
    }

    // CarItem.estimatedChargeKWh, rounded to 0.1 as NewSessionView shows it
    function estimate() {
      var from = field('from').value, to = field('to').value;
      if (from === '' || to === '') return null;
      var start = Math.round(num(from)), target = Math.round(num(to));
      if (start >= target) return null;
      var stored = (target - start) / 100 * car().capacity * USABLE_FRACTION;
      var kWh = field('source').value === 'carDisplay' ? stored : stored / EFFICIENCY[where];
      return kWh > 0 ? Math.round(kWh * 10) / 10 : null;
    }

    function render() {
      var est = estimate();
      var kWhText = field('kwh').value;
      var kWh = num(kWhText);
      var price = field('logPrice').value === '' ? null : num(field('logPrice').value);
      var speed = num(field('logSpeed').value);

      field('kwh').placeholder = est ? '≈ ' + trimNum(est) : 'Required';
      var estBtn = log.querySelector('[data-act="estimate"]');
      estBtn.hidden = !(est && kWhText === '');
      if (est) lout('estimate-label', 'Use estimate: ' + trimNum(est) + ' kWh for ' + Math.round(num(field('from').value)) + '% to ' + Math.round(num(field('to').value)) + '%');

      lout('log-speed', speed + ' kW');
      var source = field('source').value;
      lout('source-note', SOURCE_NOTE[source] + (source === 'carDisplay' ? '' : ' JuiceBox subtracts charging losses from this to work out what reached the battery.'));
      log.querySelector('[data-show-home]').hidden = where !== 'home';

      var cost = (kWh > 0 && price !== null) ? kWh * price / 100 : 0;
      lout('log-cost', money(cost));

      var to = num(field('to').value);
      log.querySelector('[data-act="save"]').disabled = !(kWh > 0 && price !== null && to > 0 && to <= 100);
    }

    function save() {
      var kWh = num(field('kwh').value);
      var price = num(field('logPrice').value);
      var speed = num(field('logSpeed').value);
      var started = field('started').value ? new Date(field('started').value) : new Date();
      var from = field('from').value;
      var to = Math.round(num(field('to').value));

      lout('saved-car', car().name);
      lout('saved-date', started.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
      log.querySelector('[data-out="saved-icon"]').className = 'fas ' + (where === 'home' ? 'fa-home' : 'fa-charging-station');
      lout('saved-battery', from === '' ? 'To ' + to + '%' : Math.round(num(from)) + '% to ' + to + '%');
      // The demo has no finish time, so the duration is the kWh at the charger's speed
      lout('saved-duration', speed > 0 ? (function (h) {
        var t = Math.round(h * 60), hh = Math.floor(t / 60), mm = t % 60;
        return hh ? hh + 'h ' + mm + 'm' : mm + 'm';
      })(kWh / speed) : '—');
      lout('saved-energy', kWh.toFixed(2) + ' kWh');
      lout('saved-cost', money(kWh * price / 100));
      lout('saved-time', started.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }));
      lout('saved-speed', speed + ' kW');
      lout('saved-rate', price.toFixed(2) + 'p/kWh');

      form.hidden = true;
      saved.hidden = false;
      log.querySelector('.jd-scroll').scrollTop = 0;
    }

    function reset() {
      field('started').value = defaultStart();
      field('from').value = '';
      field('to').value = '80';
      field('kwh').value = '';
      field('logPrice').value = '7';
      field('logSpeed').value = where === 'home' ? '7' : field('logSpeed').value;
      render();
    }

    log.addEventListener('input', render);
    log.addEventListener('change', render);
    log.addEventListener('click', function (e) {
      var rate = e.target.closest('[data-rate]');
      if (rate) { field('logPrice').value = rate.getAttribute('data-rate'); render(); return; }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var what = act.getAttribute('data-act');
      if (what === 'estimate') { var est = estimate(); if (est) field('kwh').value = est; render(); }
      else if (what === 'save') save();
      else if (what === 'reset') reset();
      else if (what === 'again') { saved.hidden = true; form.hidden = false; reset(); }
    });

    // Home chargers top out at 22 kW in the app; public ones go far higher
    wireSegments(log, function (group, value) {
      if (group !== 'where') return;
      where = value;
      var slider = field('logSpeed');
      if (where === 'home') {
        // Check before lowering max, which would clamp the value to 22 first
        if (num(slider.value) > 22) slider.value = 7;
        slider.max = 22;
      } else {
        slider.max = 350;
        if (num(slider.value) <= 22) slider.value = 50;
      }
      render();
    });

    field('started').value = defaultStart();
    render();
  }
})();
