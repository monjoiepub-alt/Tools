/* Roadtrip Planner: the automatic day-by-day presentation. */
(RT => {
  'use strict';
  const { esc, sum, plural, fmtKm, fmtDur } = RT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const P = { i: 0, slides: [], timer: null, playing: true, map: null, raf: 0, token: 0, idleTimer: 0 };
  const DUR = { cover: 8000, overview: 11000, day: 14000, rest: 11000, budget: 12000, finale: 9000 };
  const ease = p => (p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

  const app = () => RT.app;
  const trip = () => app().trip();
  const money = (n, exact) => RT.money(n, trip().currency, exact);

  // ---------- Slides ----------
  function buildSlides(st) {
    return [
      { type: 'cover' },
      { type: 'overview' },
      ...st.days.map(d => ({ type: 'day', d })),
      { type: 'budget' },
      { type: 'finale' },
    ];
  }
  const slideMs = sl => sl.type === 'day' ? (sl.d.drives.length ? DUR.day : DUR.rest) : DUR[sl.type];

  function photos(t, max = 6) {
    return t.stops.map(s => RT.safeImg(s.image)).filter(Boolean).slice(0, max);
  }

  function coverHtml(t, st) {
    const pics = photos(t);
    return `
      <section class="p-center">
        <div class="p-eyebrow">🚐 A road trip${t.vehicle.name ? ` · ${esc(t.vehicle.name)}` : ''}</div>
        <h1 class="p-title">${esc(t.name)}</h1>
        ${t.subtitle ? `<p class="p-sub">${esc(t.subtitle)}</p>` : ''}
        <div class="p-chips light">
          <span>📅 ${esc(RT.dateRange(t, st.days.length))}</span>
          <span>🗓️ ${plural(st.days.length, 'day')}</span>
          <span>📍 ${plural(t.stops.length, 'stop')}</span>
          <span>🚗 ${fmtKm(st.km)}</span>
          <span>👥 ${plural(t.travelers, 'traveller')}</span>
        </div>
        ${pics.length ? `<div class="p-strip">${pics.map((p, k) => `<img src="${esc(p)}" alt="" style="--k:${k}" onerror="this.remove()">`).join('')}</div>` : ''}
      </section>`;
  }

  function overviewHtml(t, st) {
    return `
      <article class="p-card">
        <div class="p-eyebrow">The route</div>
        <h2>${plural(st.days.length, 'day')}, ${fmtKm(st.km)}</h2>
        <ol class="p-days">${st.days.map((d, k) => `
          <li style="--c:${d.color || 'var(--line-strong)'};--k:${k}">
            <span class="p-day-n">${d.day}</span>
            <span class="p-day-t">${esc(RT.dayTitle(t, d))}</span>
            <span class="p-day-km">${d.km ? fmtKm(d.km) : '🏕️'}</span>
          </li>`).join('')}</ol>
      </article>`;
  }

  function weatherBox(d) {
    const b = RT.wxBits(app().dayWeather(d));
    if (!b) return '';
    return `
      <div class="p-wx">
        <span class="p-wx-icon">${b.icon}</span>
        <div class="p-wx-main"><b>${b.hi}° <small>/ ${b.lo}°</small></b><span>${esc(b.label)}${b.rain > 0.2 ? ` · ${b.rain.toFixed(1)} mm` : ''}</span></div>
        <div class="p-wx-side"><span>${esc(b.sun)}</span><em>${esc(b.note)}</em></div>
      </div>`;
  }

  function dayHtml(t, st, d) {
    const s = t.stops;
    const main = s[d.main];
    const img = main && RT.safeImg(main.image);
    const f = RT.FUEL_TYPES[t.vehicle.fuelType];
    const fuelCost = sum(d.drives, v => RT.driveCost(t, v));
    const shown = d.stay != null && !d.visits.length ? [d.stay] : d.visits.filter(i => i > 0 || !d.drives.length);
    const featured = shown.length ? s[shown[shown.length - 1]] : main;
    const acts = featured ? featured.activities.map(a => a.trim()).filter(Boolean) : [];
    let lead = '';
    if (d.departure) lead = `Pack up, one last breakfast in ${esc(main.name)}, and time to head home.`;
    else if (d.stay != null && !d.visits.length) lead = `No driving today: a whole day to enjoy ${esc(s[d.stay].name)}.`;
    else if (featured?.description) lead = esc(featured.description);
    const stops = d.visits.length > 1 ? `<div class="p-via">${d.visits.map(i => `<span>${i + 1}. ${esc(s[i].name)}</span>`).join('')}</div>` : '';
    return `
      <article class="p-card" style="--c:${d.color || 'var(--accent)'}">
        ${img ? `<div class="p-hero"><img src="${esc(img)}" alt="" style="animation-duration:${slideMs({ type: 'day', d }) + 2000}ms" onerror="this.parentNode.remove()"></div>` : ''}
        <div class="p-eyebrow"><span class="p-daydot"></span>Day ${d.day} of ${st.days.length} · ${esc(RT.dayDate(t, d.day, { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
        <h2>${esc(RT.dayTitle(t, d))}</h2>
        ${d.drives.length ? `
          <div class="p-pills">
            <span><small>Drive</small><b>${fmtKm(d.km)}</b></span>
            <span><small>Time</small><b>${fmtDur(d.min)}</b></span>
            <span><small>${f.unit === 'kWh' ? 'Charging' : 'Fuel'}</small><b>${money(fuelCost)}</b></span>
          </div>` : ''}
        ${stops}
        ${weatherBox(d)}
        ${lead ? `<p class="p-lead">${lead}</p>` : ''}
        ${acts.length && !d.departure ? `<ul class="p-acts">${acts.map((a, k) => `<li style="animation-delay:${0.8 + k * 0.45}s">${esc(a)}</li>`).join('')}</ul>` : ''}
        <div class="p-foot">${d.sleep != null ? `🛏️ Tonight: <b>${esc(s[d.sleep].name)}</b>` : '🏁 End of the trip'}</div>
      </article>`;
  }

  function budgetHtml(t, st) {
    return `
      <article class="p-card">
        <div class="p-eyebrow">The budget</div>
        <div class="p-big">${money(st.total)}</div>
        <p class="p-lead">for ${plural(t.travelers, 'traveller')}: <b>${money(st.perPerson)}</b> each, about <b>${money(st.total / Math.max(1, st.days.length))}</b> per day.</p>
        ${st.total > 0 ? RT.barsHtml(st) : ''}
        <p class="p-note">${RT.FUEL_TYPES[t.vehicle.fuelType].icon} ${Math.round(st.fuelUnits)} ${RT.FUEL_TYPES[t.vehicle.fuelType].unit} at about ${money(st.avgPrice, true)} per ${RT.FUEL_TYPES[t.vehicle.fuelType].unit}${t.fuelPricing === 'auto' ? ' (local prices per country)' : ''}.</p>
      </article>`;
  }

  function finaleHtml(t, st) {
    const pics = photos(t, 8);
    return `
      <section class="p-center">
        ${pics.length ? `<div class="p-mosaic">${pics.map((p, k) => `<img src="${esc(p)}" alt="" style="--k:${k}" onerror="this.remove()">`).join('')}</div>` : ''}
        <h1 class="p-title">See you on the road!</h1>
        <div class="p-chips light">
          <span>🚗 ${fmtKm(st.km)}</span>
          <span>⏱️ ${fmtDur(st.min)} of driving</span>
          <span>📍 ${plural(t.stops.length, 'place')}</span>
          <span>🌙 ${plural(st.nights, 'night')}</span>
        </div>
      </section>`;
  }

  // ---------- Map ----------
  function carIcon() {
    return L.divIcon({ className: 'car-wrap', html: '<div class="car">🚐</div>', iconSize: [40, 40], iconAnchor: [20, 20] });
  }

  function cardPadding() {
    const card = $('#pStage .p-card');
    if (!card) return { paddingTopLeft: [80, 80], paddingBottomRight: [80, 140] };
    const r = card.getBoundingClientRect();
    return window.innerWidth > 860
      ? { paddingTopLeft: [r.right + 50, 70], paddingBottomRight: [70, 120] }
      : { paddingTopLeft: [30, 40], paddingBottomRight: [30, window.innerHeight - r.top + 20] };
  }

  function drawDrive(layer, v, color, weight = 5) {
    L.polyline(v.leg.coords, { color: '#fff', weight: weight + 4, opacity: .9, interactive: false, lineCap: 'round' }).addTo(layer);
    L.polyline(v.leg.coords, { color, weight, opacity: 1, interactive: false, lineCap: 'round', dashArray: v.leg.approx ? '8 10' : null }).addTo(layer);
  }

  function animateDrives(drives, color, ms, token) {
    const coords = drives.flatMap(v => v.leg.coords);
    if (coords.length < 2) return;
    const dist = [0];
    for (let k = 1; k < coords.length; k++) dist.push(dist[k - 1] + P.map.distance(coords[k - 1], coords[k]));
    const total = dist[dist.length - 1] || 1;
    const casing = L.polyline([], { color: '#fff', weight: 11, opacity: .95, interactive: false, lineCap: 'round' }).addTo(P.anim);
    const line = L.polyline([], { color, weight: 7, interactive: false, lineCap: 'round' }).addTo(P.anim);
    const car = L.marker(coords[0], { icon: carIcon(), interactive: false, zIndexOffset: 1000 }).addTo(P.anim);
    const t0 = performance.now();
    const step = now => {
      if (token !== P.token) return;
      const p = Math.min(1, (now - t0) / ms);
      const target = ease(p) * total;
      let k = 1;
      while (k < dist.length - 1 && dist[k] < target) k++;
      const a = coords[k - 1], b = coords[k];
      const seg = dist[k] - dist[k - 1] || 1;
      const f = Math.min(1, Math.max(0, (target - dist[k - 1]) / seg));
      const head = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const pts = [...coords.slice(0, k), head];
      line.setLatLngs(pts);
      casing.setLatLngs(pts);
      car.setLatLng(head);
      if (p < 1) P.raf = requestAnimationFrame(step);
    };
    P.raf = requestAnimationFrame(step);
  }

  function drawSlideMap(sl, st) {
    const t = trip(), s = t.stops;
    const token = P.token;
    cancelAnimationFrame(P.raf);
    P.done.clearLayers();
    P.anim.clearLayers();
    P.marks.clearLayers();
    document.body.dataset.slide = sl.type;

    const current = sl.type === 'day' ? sl.d.day : null;
    const showAll = ['overview', 'budget', 'finale'].includes(sl.type);
    st.days.forEach(d => {
      if (showAll || (current && d.day < current)) d.drives.forEach(v => drawDrive(P.done, v, d.color || '#e0562b', showAll ? 5 : 4));
    });
    if (sl.type === 'overview') {
      st.days.forEach(d => {
        if (!d.drives.length) return;
        const c = d.drives[0].leg.coords;
        const mid = c[Math.floor(c.length / 2)];
        L.marker(mid, { interactive: false, icon: L.divIcon({ className: 'day-label-wrap', html: `<span class="day-label" style="background:${d.color}">${d.day}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(P.done);
      });
    }

    // Stop pins: visited ones bright, future ones faded
    const lastVisited = current ? Math.max(-1, ...st.days.filter(d => d.day <= current).flatMap(d => d.visits)) : s.length - 1;
    s.forEach((x, i) => {
      const cls = [
        i === 0 ? 'start' : i === s.length - 1 ? 'end' : '',
        current && i > lastVisited ? 'dim' : '',
        current && i === sl.d.main ? 'current' : '',
      ].join(' ');
      L.marker([x.lat, x.lng], { icon: RT.pinIcon(x, i + 1, cls), interactive: false }).addTo(P.marks);
    });

    const pad = cardPadding();
    if (sl.type === 'day') {
      const d = sl.d;
      const pts = d.drives.flatMap(v => v.leg.coords);
      if (pts.length > 1) {
        P.map.flyToBounds(L.latLngBounds(pts), { ...pad, maxZoom: 11, duration: 1.8 });
        const start = () => { if (token === P.token) animateDrives(d.drives, d.color || '#e0562b', Math.min(6000, slideMs(sl) * 0.45), token); };
        let started = false;
        const go = () => { if (!started) { started = true; start(); } };
        P.map.once('moveend', go);
        setTimeout(go, 2300);
      } else if (s[d.main]) {
        P.map.flyTo([s[d.main].lat, s[d.main].lng], 11, { duration: 2 });
        setTimeout(() => {
          if (token !== P.token) return;
          const pt = P.map.project([s[d.main].lat, s[d.main].lng]);
          if (window.innerWidth > 860) P.map.panTo(P.map.unproject(pt.subtract([(pad.paddingTopLeft[0] - 70) / 2, 0])), { duration: 1 });
        }, 2100);
      }
    } else {
      const b = RT.fitBoundsOf();
      if (b.isValid()) {
        const centred = sl.type === 'cover' || sl.type === 'finale';
        P.map.flyToBounds(b, centred ? { padding: [60, 60], duration: 2 } : { ...pad, duration: 2 });
      }
    }
  }

  // ---------- Playback ----------
  function render(sl, st) {
    const t = trip();
    const html = { cover: coverHtml, overview: overviewHtml, budget: budgetHtml, finale: finaleHtml }[sl.type];
    return html ? html(t, st) : dayHtml(t, st, sl.d);
  }

  function showSlide(n) {
    P.i = Math.max(0, Math.min(n, P.slides.length - 1));
    P.token++;
    const st = app().stats();
    // Rebuild the slide from fresh data (weather may have arrived meanwhile)
    const base = P.slides[P.i];
    const sl = base.type === 'day' ? { type: 'day', d: st.days[base.d.day - 1] || base.d } : base;
    const stage = $('#pStage');
    stage.className = `p-stage p-${sl.type}`;
    stage.innerHTML = render(sl, st);
    void stage.offsetWidth;
    stage.classList.add('in');
    $('#pCount').textContent = `${P.i + 1} / ${P.slides.length}`;
    $$('#pDots button').forEach((b, k) => b.classList.toggle('on', k === P.i));
    drawSlideMap(sl, st);
    restartTimer();
  }

  function restartTimer() {
    clearTimeout(P.timer);
    const bar = $('#pProgress');
    bar.style.transition = 'none';
    bar.style.width = '0';
    $('#pPlay').textContent = P.playing ? '⏸' : '▶';
    $('#pPlay').title = P.playing ? 'Pause (space)' : 'Play (space)';
    if (!P.playing) return;
    const ms = slideMs(P.slides[P.i]);
    void bar.offsetWidth;
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = '100%';
    P.timer = setTimeout(() => {
      if (P.i < P.slides.length - 1) showSlide(P.i + 1);
      else { P.playing = false; restartTimer(); }
    }, ms);
  }

  function open() {
    const t = trip();
    if (!t.stops.length) { app().toast('Add some stops first 🙂'); return; }
    const st = app().stats();
    P.slides = buildSlides(st);
    P.playing = true;
    $('#present').hidden = false;
    document.body.classList.add('presenting');
    if (!P.map) {
      P.map = L.map('pMap', { zoomControl: false, attributionControl: true, zoomSnap: 0.1, keyboard: false });
      P.ghost = L.layerGroup().addTo(P.map);
      P.done = L.layerGroup().addTo(P.map);
      P.anim = L.layerGroup().addTo(P.map);
      P.marks = L.layerGroup().addTo(P.map);
      $('#pStyle').innerHTML = Object.entries(RT.MAP_STYLES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('');
    }
    $('#pStyle').value = t.showStyle;
    RT.setBase(P.map, t.showStyle);
    P.ghost.clearLayers();
    st.drives.forEach(v => L.polyline(v.leg.coords, { color: '#ffffff', weight: 3, opacity: .75, dashArray: '2 9', interactive: false, lineCap: 'round' }).addTo(P.ghost));
    $('#pDots').innerHTML = P.slides.map((sl, k) => `<button type="button" data-slide="${k}" title="${sl.type === 'day' ? `Day ${sl.d.day}` : sl.type}" aria-label="Slide ${k + 1}"></button>`).join('');
    document.documentElement.requestFullscreen?.().catch(() => {});
    wakeControls();
    setTimeout(() => {
      P.map.invalidateSize();
      const b = RT.fitBoundsOf();
      if (b.isValid()) P.map.fitBounds(b, { padding: [60, 60], animate: false });
      showSlide(0);
    }, 80);
  }

  function close() {
    clearTimeout(P.timer);
    cancelAnimationFrame(P.raf);
    P.token++;
    $('#present').hidden = true;
    document.body.classList.remove('presenting');
    delete document.body.dataset.slide;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  // Hide the controls when the mouse is still (cinema mode)
  function wakeControls() {
    $('#present').classList.remove('idle');
    clearTimeout(P.idleTimer);
    P.idleTimer = setTimeout(() => $('#present').classList.add('idle'), 3000);
  }

  $('#presentBtn').addEventListener('click', open);
  $('#pClose').addEventListener('click', close);
  $('#pPrev').addEventListener('click', () => showSlide(P.i - 1));
  $('#pNext').addEventListener('click', () => showSlide(P.i + 1));
  $('#pPlay').addEventListener('click', () => {
    P.playing = !P.playing;
    if (P.playing && P.i === P.slides.length - 1) showSlide(0); else restartTimer();
  });
  $('#pStyle').addEventListener('change', e => {
    RT.setBase(P.map, e.target.value);
    app().setShowStyle(e.target.value);
  });
  $('#pDots').addEventListener('click', e => { const b = e.target.closest('[data-slide]'); if (b) showSlide(+b.dataset.slide); });
  $('#present').addEventListener('pointermove', wakeControls);
  document.addEventListener('keydown', e => {
    if ($('#present').hidden || e.target.matches('select')) return;
    wakeControls();
    if (e.key === 'ArrowRight' || e.key === 'PageDown') showSlide(P.i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') showSlide(P.i - 1);
    else if (e.key === ' ') { e.preventDefault(); $('#pPlay').click(); }
    else if (e.key === 'Escape') close();
    else if (e.key === 'Home') showSlide(0);
    else if (e.key === 'End') showSlide(P.slides.length - 1);
  });
  window.addEventListener('resize', () => { if (P.map && !$('#present').hidden) P.map.invalidateSize(); });
})(window.RT);
