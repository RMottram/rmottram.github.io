/* Try it: working copies of JuiceBox's Tools, Add New Session and Stats
   screens. The sums follow the app's own code: ToolsView for the
   calculators, CarItem.estimatedChargeKWh for the logging form's kWh
   estimate, and ChargingStatsView, StatsTrendChart and FuelSavings for
   Stats. UK units throughout (miles, p/kWh, p/litre), as the app uses in
   the UK. */
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

  // ---------------------------------------------------------------- Stats
  // A made-up charging history per car, about 18 months up to today, run
  // through the same figures and charts as the app's ChargingStatsView.
  var statsEl = document.getElementById('jd-stats');
  if (statsEl) {
    var sout = outputs(statsEl);
    var SVGNS = 'http://www.w3.org/2000/svg';
    var LITRES_PER_GALLON_UK = 4.546;
    var DAY = 86400000;

    var CARS = {
      polestar: { make: 'Polestar', model: '2', capacity: 78, usableNew: 75.9, eff: 3.6, home: 0.7, every: 4.6, seed: 11,
                  homeKw: 7.4, publicKw: [50, 150], publicPrice: [69, 79], health: 99.2, fade: 2.1 },
      tesla:    { make: 'Tesla', model: 'Model 3', capacity: 82, usableNew: 78.1, eff: 4.1, home: 0.5, every: 5.2, seed: 23,
                  homeKw: 7, publicKw: [120, 250], publicPrice: [42, 56], health: 98.6, fade: 1.6 },
      kia:      { make: 'Kia', model: 'EV6', capacity: 77.4, usableNew: 74.6, eff: 3.4, home: 0.85, every: 4.2, seed: 37,
                  homeKw: 7.4, publicKw: [50, 240], publicPrice: [65, 79], health: 99.5, fade: 1.8 },
      mg:       { make: 'MG', model: '4', capacity: 64, usableNew: 61.7, eff: 3.9, home: 0.6, every: 3.8, seed: 51,
                  homeKw: 7, publicKw: [50, 135], publicPrice: [59, 79], health: 98.9, fade: 2.4 }
    };

    // Seeded, so each car tells the same story on every visit
    function prng(seed) {
      return function () {
        seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function between(r, lo, hi) { return lo + r() * (hi - lo); }

    function makeSessions(car) {
      var r = prng(car.seed);
      var end = new Date(); end.setHours(23, 0, 0, 0);
      var t = end.getTime() - 560 * DAY;
      var list = [];
      var odo = 4000 + Math.round(r() * 6000);
      var first = t;
      while (t < end.getTime() - DAY) {
        var date = new Date(t);
        var home = r() < car.home;
        // Cold months cost range: January's efficiency is about a quarter below July's
        var season = Math.cos(2 * Math.PI * (date.getMonth() + date.getDate() / 31) / 12);
        var eff = car.eff * (1 - 0.12 * season) * between(r, 0.96, 1.04);
        var from = Math.round(home ? between(r, 22, 55) : between(r, 8, 35));
        var to = home ? (r() < 0.8 ? 80 : (r() < 0.6 ? 90 : 100)) : Math.round(between(r, 70, 86));
        var years = (t - first) / (365 * DAY);
        var health = car.health - car.fade * years + between(r, -0.5, 0.5);
        var usable = car.usableNew * health / 100;
        var losses = home ? 1.08 : 1.03;   // what the charger reports, over what reached the battery
        var kWh = Math.round(usable * (to - from) / 100 * losses * 100) / 100;
        var price = home ? (r() < 0.85 ? 7 : 24.5) : Math.round(between(r, car.publicPrice[0], car.publicPrice[1]));
        var speed = home ? car.homeKw : Math.round(between(r, car.publicKw[0], car.publicKw[1]));
        var hours = kWh / speed * (home ? 1 : 1.35);   // rapid chargers slow as the battery fills
        var miles = kWh / losses * eff;
        list.push({
          date: date, home: home, kWh: kWh, cost: kWh * price / 100, price: price, hours: hours,
          miles: miles, eff: eff, odometer: odo,
          // Only charges with a starting % measure the battery, about 3 in 5 here
          health: r() < 0.6 ? Math.round(health * 10) / 10 : null,
          usable: usable
        });
        odo += Math.round(miles);
        t += car.every * between(r, 0.45, 1.55) * DAY;
      }
      return list;
    }

    // ---- Formatting, en-GB like the app in the UK
    function fixed(v, d) { return v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }); }
    function gbp(v) { return (v < 0 ? '-£' : '£') + fixed(Math.abs(v), 2); }
    function gbpRounded(v) { return '£' + Math.round(v).toLocaleString('en-GB'); }
    function hm(hours) {
      var total = Math.floor(hours * 60);
      return Math.floor(total / 60) + 'h ' + (total % 60) + 'm';
    }
    function miles(v) { return Math.round(v).toLocaleString('en-GB') + ' mi'; }
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // ---- State
    var st = { car: 'polestar', category: 'usage', range: 12, fuelPeriod: 'year',
               petrolMpg: 42, petrolPrice: 145.9, dieselMpg: 50, dieselPrice: 151.9, pricesSet: false };
    var sessions = [];
    var cache = {};

    function sum(list, key) { return list.reduce(function (a, s) { return a + s[key]; }, 0); }

    function renderOverview() {
      var car = CARS[st.car];
      var n = sessions.length;
      var cost = sum(sessions, 'cost'), kWh = sum(sessions, 'kWh'), hours = sum(sessions, 'hours');
      var dist = sum(sessions, 'miles');
      var homeCount = sessions.filter(function (s) { return s.home; }).length;
      var measured = sessions.filter(function (s) { return s.health !== null; });
      var latest = measured.slice(-5);
      var usableNow = latest.reduce(function (a, s) { return a + s.usable; }, 0) / latest.length;
      var batteryKWh = sessions.reduce(function (a, s) { return a + s.kWh / (s.home ? 1.08 : 1.03); }, 0);
      var tracked = sessions[n - 1].odometer - sessions[0].odometer;

      sout('make', car.make);
      sout('model', car.model);
      sout('capacity', fixed(car.capacity, 1) + ' kWh');
      sout('usable', fixed(usableNow, 1) + ' kWh');
      sout('sessions', n.toLocaleString('en-GB'));
      sout('total-cost', gbp(cost));
      sout('energy', fixed(kWh, 2) + ' kWh');
      sout('total-kwh', fixed(kWh, 2));
      sout('avg-cost', gbp(cost / n));
      sout('charge-time', hm(hours));
      sout('avg-time', hm(hours / n));
      sout('home-count', homeCount + ' home');
      sout('public-count', (n - homeCount) + ' public');
      sout('miles-gained', miles(dist) + ' gained');
      sout('efficiency', fixed(dist / batteryKWh, 1) + ' mi/kWh');
      sout('ppm', fixed(cost / dist * 100, 1) + 'p/mi');
      sout('miles', miles(tracked));
    }

    // FuelSavings: the miles your charging bought, as fuel in a typical car
    function renderFuel() {
      var year = new Date().getFullYear();
      var list = st.fuelPeriod === 'year'
        ? sessions.filter(function (s) { return s.date.getFullYear() === year; })
        : sessions;
      var cost = sum(list, 'cost'), dist = sum(list, 'miles');
      function fuelCost(mpg, pence) { return dist / mpg * LITRES_PER_GALLON_UK * pence / 100; }
      [['petrol', st.petrolMpg, st.petrolPrice], ['diesel', st.dieselMpg, st.dieselPrice]].forEach(function (k) {
        var saved = fuelCost(k[1], k[2]) - cost;
        var tile = statsEl.querySelector('.jd-fuel-tile--' + k[0]);
        tile.classList.toggle('is-more', saved < 0);
        sout('vs-' + k[0], gbp(Math.abs(saved)));
        sout('vs-' + k[0] + '-note', saved < 0 ? 'more than ' + k[0] : 'saved');
        sout(k[0] + '-mpg', k[1] + ' mpg');
        sout(k[0] + '-price', fixed(k[2], 1) + 'p/litre');
      });
      var note = 'Your charging cost ' + gbp(cost) + ' for about ' + miles(dist) +
        ', at each car’s average efficiency. Compared with a ' + st.petrolMpg + ' mpg petrol car at ' +
        fixed(st.petrolPrice, 1) + 'p/litre and a ' + st.dieselMpg + ' mpg diesel car at ' + fixed(st.dieselPrice, 1) + 'p/litre.';
      if (!st.pricesSet) note += ' These are typical prices, so tap the sliders to set yours.';
      sout('fuel-note', note);
    }

    // ---- Charts

    // StatsTrendChart's grouping: by day, week or month, whichever keeps it to 40 points
    function periodStart(d, unit) {
      if (unit === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
      var s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (unit === 'week') s.setDate(s.getDate() - (s.getDay() + 6) % 7);   // weeks start on Monday
      return s;
    }
    function group(points, unit, total) {
      var map = {}, order = [];
      points.forEach(function (p) {
        var key = periodStart(p.date, unit).getTime();
        if (!map[key]) { map[key] = { date: new Date(key), sum: 0, count: 0 }; order.push(key); }
        map[key].sum += p.value; map[key].count += 1;
      });
      return order.sort(function (a, b) { return a - b; }).map(function (k) {
        var g = map[k];
        return { date: g.date, value: total ? g.sum : g.sum / g.count, count: g.count };
      });
    }
    function groupingUnit(points) {
      var units = ['day', 'week'];
      for (var i = 0; i < units.length; i++) {
        var seen = {};
        points.forEach(function (p) { seen[periodStart(p.date, units[i]).getTime()] = 1; });
        if (Object.keys(seen).length <= 40) return units[i];
      }
      return 'month';
    }
    function rangeStart() {
      if (!st.range) return null;
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - st.range);
      return d;
    }

    // Round tick steps of 1, 2, 2.5 or 5 at any scale
    function ticks(lo, hi, count) {
      var raw = (hi - lo) / count || 1;
      var mag = Math.pow(10, Math.floor(Math.log10(raw)));
      var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
      var out = [];
      for (var v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) out.push(+v.toFixed(6));
      return out;
    }

    function el(name, attrs, parent) {
      var n = document.createElementNS(SVGNS, name);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (parent) parent.appendChild(n);
      return n;
    }

    // Catmull-Rom through the points, as the app's smoothed lines
    function smooth(pts) {
      if (pts.length < 3) return 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
      var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += 'C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
      }
      return d;
    }

    var gradientId = 0;
    var W = 300, H = 150, X0 = 4, X1 = 266, Y0 = 8, Y1 = 126;

    function card(title, sub, pro) {
      var c = document.createElement('div');
      c.className = 'jd-card';
      c.innerHTML = '<div class="jd-card-title"></div><div class="jd-card-sub" aria-live="polite"></div>';
      c.firstChild.textContent = title;
      if (pro) c.firstChild.insertAdjacentHTML('beforeend', ' <span class="jd-pro">Pro</span>');
      c.children[1].textContent = sub;
      return c;
    }

    function emptyView(c, title, text) {
      var e = document.createElement('div');
      e.className = 'jd-empty';
      e.innerHTML = '<i class="fas fa-calendar-alt" aria-hidden="true"></i><b></b><span></span>';
      e.children[1].textContent = title;
      e.children[2].textContent = text;
      c.appendChild(e);
    }

    // A trend or monthly-total chart you can drag across, as StatsTrendChart
    function trendChart(o) {
      var c = card(o.title, o.subtitle, o.pro);
      var start = o.ranged ? rangeStart() : null;
      var raw = o.points.filter(function (p) { return !start || p.date >= start; });
      if (!raw.length) { emptyView(c, 'Nothing in This Period', 'Choose a longer range to see more.'); return c; }

      var unit = o.style === 'monthly' ? 'month' : groupingUnit(raw);
      var pts = group(raw, unit, o.style === 'monthly');
      var values = pts.map(function (p) { return p.value; });
      var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
      var ys;
      if (o.style === 'fitted') {
        var pad = Math.max((max - min) * 0.25, Math.abs(max) * 0.01);
        ys = ticks(min - pad, max + pad, 3);
      } else {
        ys = ticks(0, max * 1.08, 3);
      }
      var lo = ys[0], hi = ys[ys.length - 1];
      var slot = (X1 - X0) / pts.length;
      function x(i) { return o.style === 'monthly' ? X0 + slot * (i + 0.5) : (pts.length === 1 ? (X0 + X1) / 2 : X0 + (X1 - X0) * i / (pts.length - 1)); }
      function y(v) { return Y1 - (v - lo) / (hi - lo) * (Y1 - Y0); }

      var wrap = document.createElement('div');
      wrap.className = 'jd-chart';
      wrap.tabIndex = 0;
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', o.title + ' chart. Use the arrow keys to read each point.');
      wrap.style.setProperty('--c', o.color);
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, wrap);

      ys.forEach(function (v) {
        el('line', { x1: X0, x2: X1, y1: y(v), y2: y(v), class: 'jd-grid' }, svg);
        el('text', { x: X1 + 5, y: y(v) + 3, class: 'jd-axis' }, svg).textContent = o.axis ? o.axis(v) : v.toLocaleString('en-GB');
      });

      // Dates under the axis: days over a short span, months, or months with the year
      var span = pts[pts.length - 1].date - pts[0].date;
      var sameYear = pts[0].date.getFullYear() === pts[pts.length - 1].date.getFullYear();
      function label(d) {
        var mon = MONTHS[d.getMonth()].slice(0, 3);
        if (unit !== 'month' && span < 90 * DAY) return d.getDate() + ' ' + mon;
        return sameYear ? mon : mon + ' ' + String(d.getFullYear()).slice(2);
      }
      var labels = Math.min(4, pts.length);
      for (var k = 0; k < labels; k++) {
        var i = labels === 1 ? 0 : Math.round(k * (pts.length - 1) / (labels - 1));
        var anchor = k === 0 && labels > 1 ? 'start' : (k === labels - 1 && labels > 1 ? 'end' : 'middle');
        el('text', { x: o.style === 'monthly' ? x(i) : x(i), y: H - 6, class: 'jd-axis', 'text-anchor': anchor }, svg).textContent = label(pts[i].date);
      }

      if (o.style === 'monthly') {
        pts.forEach(function (p, i) {
          var w = Math.max(2, Math.min(18, slot * 0.62));
          el('rect', { x: x(i) - w / 2, y: y(p.value), width: w, height: Math.max(0, Y1 - y(p.value)), rx: Math.min(3, w / 2), class: 'jd-bar', 'data-i': i }, svg);
        });
      } else {
        var line = pts.map(function (p, i) { return [x(i), y(p.value)]; });
        if (o.style === 'trend') {
          var gid = 'jd-grad-' + (++gradientId);
          var grad = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg));
          el('stop', { offset: 0, class: 'jd-stop-top' }, grad);
          el('stop', { offset: 1, class: 'jd-stop-bottom' }, grad);
          el('path', { d: smooth(line) + 'L' + x(pts.length - 1) + ',' + Y1 + 'L' + x(0) + ',' + Y1 + 'Z', fill: 'url(#' + gid + ')' }, svg);
        }
        el('path', { d: smooth(line), class: 'jd-line' }, svg);
      }

      var rule = el('line', { y1: Y0 - 4, y2: Y1, class: 'jd-rule', visibility: 'hidden' }, svg);
      var dot = el('circle', { r: 3.6, class: 'jd-dot', visibility: 'hidden' }, svg);
      var sub = c.querySelector('.jd-card-sub');
      var selected = -1;

      function detail(p) {
        var date = unit === 'month' ? MONTHS[p.date.getMonth()] + ' ' + p.date.getFullYear()
          : (unit === 'week' ? 'Week of ' : '') + p.date.getDate() + ' ' + MONTHS[p.date.getMonth()] + ' ' + p.date.getFullYear();
        var avg = o.style !== 'monthly' && o.noun && p.count > 1;
        var parts = [date, (avg ? 'avg ' : '') + o.format(p.value)];
        if (o.noun && p.count > 1) parts.push(p.count + ' ' + o.noun + 's');
        return parts.join(' · ');
      }
      function select(i) {
        selected = i;
        svg.querySelectorAll('.jd-bar').forEach(function (b) { b.classList.toggle('is-dim', i >= 0 && +b.getAttribute('data-i') !== i); });
        if (i < 0) {
          rule.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden');
          sub.textContent = o.subtitle;
          return;
        }
        rule.setAttribute('x1', x(i)); rule.setAttribute('x2', x(i)); rule.setAttribute('visibility', 'visible');
        if (o.style !== 'monthly') {
          dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(pts[i].value)); dot.setAttribute('visibility', 'visible');
        }
        sub.textContent = detail(pts[i]);
      }
      function fromPointer(e) {
        var box = svg.getBoundingClientRect();
        var px = (e.clientX - box.left) / box.width * W;
        var i = o.style === 'monthly' ? Math.floor((px - X0) / slot) : Math.round((px - X0) / ((X1 - X0) / Math.max(1, pts.length - 1)));
        select(Math.max(0, Math.min(pts.length - 1, i)));
      }
      wrap.addEventListener('pointermove', fromPointer);
      wrap.addEventListener('pointerdown', fromPointer);
      wrap.addEventListener('pointerleave', function () { select(-1); });
      wrap.addEventListener('pointercancel', function () { select(-1); });
      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var step = e.key === 'ArrowRight' ? 1 : -1;
          select(selected < 0 ? (step > 0 ? 0 : pts.length - 1) : Math.max(0, Math.min(pts.length - 1, selected + step)));
        } else if (e.key === 'Escape') select(-1);
      });
      wrap.addEventListener('blur', function () { select(-1); });

      c.appendChild(wrap);
      return c;
    }

    // Home vs Public Charging: a ring of the sessions in range
    function homePublicChart() {
      var c = card('Home vs Public Charging', 'See where most of your sessions happen');
      var start = rangeStart();
      var list = sessions.filter(function (s) { return !start || s.date >= start; });
      if (!list.length) { emptyView(c, 'Nothing in This Period', 'Choose a longer range to see more.'); return c; }
      var home = list.filter(function (s) { return s.home; }).length, pub = list.length - home;
      var wrap = document.createElement('div');
      wrap.className = 'jd-ring';
      var svg = el('svg', { viewBox: '0 0 120 120', role: 'img', 'aria-label': home + ' home sessions and ' + pub + ' public' }, wrap);
      var r = 44, circ = 2 * Math.PI * r, homeLen = circ * home / list.length;
      // Home from twelve o'clock clockwise, then public on round to the top
      if (home) el('circle', { cx: 60, cy: 60, r: r, class: 'jd-ring-home', transform: 'rotate(-90 60 60)',
                               'stroke-dasharray': homeLen + ' ' + circ }, svg);
      if (pub) el('circle', { cx: 60, cy: 60, r: r, class: 'jd-ring-public', transform: 'rotate(-90 60 60)',
                              'stroke-dasharray': (circ - homeLen) + ' ' + circ, 'stroke-dashoffset': -homeLen }, svg);
      c.appendChild(wrap);
      c.insertAdjacentHTML('beforeend', '<div class="jd-legend"><span><i class="jd-key jd-key--home"></i>Home<b>' + home + '</b></span><span><i class="jd-key jd-key--public"></i>Public<b>' + pub + '</b></span></div>');
      return c;
    }

    // Total Cost Breakdown: home, public and both, in range
    function costBreakdownChart() {
      var c = card('Total Cost Breakdown', 'Compare home, public, and combined charging spend', true);
      var start = rangeStart();
      var list = sessions.filter(function (s) { return !start || s.date >= start; });
      if (!list.length) { emptyView(c, 'Nothing in This Period', 'Choose a longer range to see more.'); return c; }
      var home = sum(list.filter(function (s) { return s.home; }), 'cost');
      var pub = sum(list.filter(function (s) { return !s.home; }), 'cost');
      var bars = [['Home', home, 'var(--jb-green)'], ['Public', pub, 'var(--jb-ember)'], ['Total', home + pub, 'var(--jb-teal)']];
      var ys = ticks(0, (home + pub) * 1.08, 3), hi = ys[ys.length - 1];
      var wrap = document.createElement('div');
      wrap.className = 'jd-chart jd-chart--static';
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Home ' + gbp(home) + ', public ' + gbp(pub) + ', total ' + gbp(home + pub) }, wrap);
      var L = 38;
      ys.forEach(function (v) {
        var yy = Y1 - v / hi * (Y1 - Y0);
        el('line', { x1: L, x2: W - 4, y1: yy, y2: yy, class: 'jd-grid' }, svg);
        el('text', { x: L - 5, y: yy + 3, class: 'jd-axis', 'text-anchor': 'end' }, svg).textContent = gbpRounded(v);
      });
      var slot = (W - 4 - L) / 3;
      bars.forEach(function (b, i) {
        var h = b[1] / hi * (Y1 - Y0), w = slot * 0.55;
        var rect = el('rect', { x: L + slot * (i + 0.5) - w / 2, y: Y1 - h, width: w, height: h, rx: 4, class: 'jd-bar' }, svg);
        rect.style.fill = 'color-mix(in srgb, ' + b[2] + ' 60%, transparent)';
        el('text', { x: L + slot * (i + 0.5), y: H - 6, class: 'jd-axis', 'text-anchor': 'middle' }, svg).textContent = b[0];
      });
      c.appendChild(wrap);
      c.insertAdjacentHTML('beforeend', '<div class="jd-cost-row">' + bars.map(function (b) { return '<span>' + b[0] + '<b>' + gbp(b[1]) + '</b></span>'; }).join('') + '</div>');
      return c;
    }

    function renderCharts() {
      var host = statsEl.querySelector('[data-out="charts"]');
      host.textContent = '';
      statsEl.querySelector('[data-out="range-picker"]').hidden = st.category === 'battery';
      var pts = function (key) { return sessions.map(function (s) { return { date: s.date, value: s[key] }; }); };
      var cards;
      if (st.category === 'usage') {
        cards = [
          homePublicChart(),
          trendChart({ title: 'kWh Added Per Session', subtitle: 'Track how much energy each charging session added', pro: true, ranged: true,
                       points: pts('kWh'), style: 'trend', color: '#E0A800', noun: 'session',
                       format: function (v) { return fixed(v, 2) + ' kWh'; } }),
          trendChart({ title: 'Sessions per Month', subtitle: 'Monthly charging frequency over time', pro: true, ranged: true,
                       points: sessions.map(function (s) { return { date: s.date, value: 1 }; }), style: 'monthly', color: 'var(--jb-green)',
                       format: function (v) { return v === 1 ? '1 session' : v + ' sessions'; } }),
          trendChart({ title: 'Miles per kWh Over Time', subtitle: 'Running mi/kWh from your odometer readings', pro: true, ranged: true,
                       points: pts('eff'), style: 'trend', color: 'var(--jb-teal)', noun: 'session',
                       format: function (v) { return fixed(v, 1) + ' mi/kWh'; } })
        ];
      } else if (st.category === 'cost') {
        cards = [
          costBreakdownChart(),
          trendChart({ title: 'Cost Per Session', subtitle: 'Track how much each charging session cost', pro: true, ranged: true,
                       points: pts('cost'), style: 'trend', color: 'var(--jb-sage)', noun: 'session', format: gbp, axis: gbpRounded }),
          trendChart({ title: 'Monthly Spend', subtitle: 'Total charging cost per calendar month', pro: true, ranged: true,
                       points: pts('cost'), style: 'monthly', color: 'var(--jb-sage)', noun: 'session', format: gbp, axis: gbpRounded })
        ];
      } else {
        var measured = sessions.filter(function (s) { return s.health !== null; });
        cards = [
          trendChart({ title: 'Battery Health Over Time', subtitle: 'Estimated from sessions where you logged a starting %',
                       points: measured.map(function (s) { return { date: s.date, value: s.health }; }), style: 'fitted', color: 'var(--jb-ember)',
                       format: function (v) { return fixed(v, 1) + '%'; }, axis: function (v) { return v + '%'; } }),
          trendChart({ title: 'Usable Capacity Over Time', subtitle: 'Estimated usable kWh from sessions where you logged a starting %',
                       points: measured.map(function (s) { return { date: s.date, value: s.usable }; }), style: 'fitted', color: 'var(--jb-sky)',
                       format: function (v) { return fixed(v, 1) + ' kWh'; }, axis: function (v) { return fixed(v, 1); } })
        ];
      }
      cards.forEach(function (c) { host.appendChild(c); });
    }

    function loadCar() {
      sessions = cache[st.car] || (cache[st.car] = makeSessions(CARS[st.car]));
      renderOverview();
      renderFuel();
      renderCharts();
    }

    wireSegments(statsEl, function (groupName, value) {
      if (groupName === 'category') st.category = value;
      if (groupName === 'range') st.range = +value;
      renderCharts();
    });
    statsEl.addEventListener('change', function (e) {
      var key = e.target.getAttribute('data-key');
      if (key === 'car') { st.car = e.target.value; loadCar(); }
      if (key === 'fuelPeriod') { st.fuelPeriod = e.target.value; renderFuel(); }
    });
    statsEl.addEventListener('input', function (e) {
      var key = e.target.getAttribute('data-key');
      if (!/^(petrol|diesel)/.test(key || '')) return;
      st[key] = num(e.target.value);
      st.pricesSet = true;
      renderFuel();
    });
    statsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act="compare"]');
      if (!btn) return;
      var panel = statsEl.querySelector('[data-out="compare-panel"]');
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', String(!panel.hidden));
    });

    loadCar();
  }
})();
