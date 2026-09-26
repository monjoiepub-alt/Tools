/* Roadtrip Planner: the editor (map, stops, plan, costs, trip settings). */
(RT => {
  'use strict';
  const { esc, num, sum, plural, fmtKm, fmtDur } = RT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const STORE_KEY = 'roadtrip.trips.v1';
  const ACTIVE_KEY = 'roadtrip.active.v1';
  const TAB_KEY = 'roadtrip.tab.v1';

  // ---------- State ----------
  let trips = RT.readJSON(STORE_KEY, null);
  if (!Array.isArray(trips) || !trips.length) trips = [RT.sampleTrip()];
  trips = trips.map(RT.normalizeTrip);
  let activeId = RT.readJSON(ACTIVE_KEY, trips[0].id);
  if (!trips.some(t => t.id === activeId)) activeId = trips[0].id;
  const trip = () => trips.find(t => t.id === activeId);

  let legs = [];          // legs[i] = the drive arriving at stop i
  let returnLeg = null;   // last stop → first stop (round trips)
  let routeGen = 0;
  let routing = false;
  const openStops = new Set();
  const weather = {};     // "lat,lng|date" → weather | 'loading' | null

  const stats = () => RT.computeStats(trip(), legs, returnLeg);
  const money = (n, exact) => RT.money(n, trip().currency, exact);
  const fuel = () => RT.FUEL_TYPES[trip().vehicle.fuelType];

  let saveTimer;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 300); };
  function flushSave() {
    clearTimeout(saveTimer);
    RT.writeJSON(STORE_KEY, trips);
    RT.writeJSON(ACTIVE_KEY, activeId);
  }
  window.addEventListener('beforeunload', flushSave);

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  // ---------- Weather helpers (shared with the presentation) ----------
  const wxKey = (s, iso) => `${s.lat.toFixed(2)},${s.lng.toFixed(2)}|${iso}`;
  function dayWeather(d) {
    const t = trip();
    const s = t.stops[d.where];
    return s ? weather[wxKey(s, RT.dayISO(t, d.day))] : null;
  }
  RT.wxBits = w => {
    if (!w || w === 'loading') return null;
    const [icon, label] = RT.WEATHER[w.code] || ['🌡️', 'Weather'];
    let sun;
    if (w.daylight >= 86000) sun = '☀️ Midnight sun: 24 h of daylight';
    else if (w.daylight <= 600) sun = '🌑 Polar night';
    else sun = `🌅 ${RT.timeOf(w.sunrise)} · 🌇 ${RT.timeOf(w.sunset)}`;
    const note = w.kind === 'forecast' ? 'Forecast'
      : w.kind === 'past' ? 'Measured weather'
        : `Typical weather (same day in ${w.basedOn.slice(0, 4)})`;
    return { icon, label, hi: Math.round(w.tmax), lo: Math.round(w.tmin), rain: w.rain, sun, note, kind: w.kind };
  };
  function wxChip(d) {
    const w = dayWeather(d);
    if (w === 'loading') return '<span class="wx-chip loading">…</span>';
    const b = RT.wxBits(w);
    if (!b) return '';
    return `<span class="wx-chip" title="${esc(`${b.label} · ${b.note}`)}">${b.icon} ${b.hi}° <small>/ ${b.lo}°</small>${b.kind === 'typical' ? '<sup>*</sup>' : ''}</span>`;
  }

  let wxTimer;
  const scheduleWeather = () => { clearTimeout(wxTimer); wxTimer = setTimeout(loadWeather, 1000); };
  async function loadWeather() {
    const t = trip();
    const st = stats();
    if (st.days.length > 60) return;
    const jobs = [];
    st.days.forEach(d => {
      const s = t.stops[d.where];
      if (!s) return;
      const iso = RT.dayISO(t, d.day);
      const k = wxKey(s, iso);
      if (k in weather) return;
      weather[k] = 'loading';
      jobs.push(() => RT.weatherFor(s.lat, s.lng, iso).then(w => { weather[k] = w; }).catch(() => { delete weather[k]; }));
    });
    if (!jobs.length) return;
    renderDerived();
    let i = 0;
    const worker = async () => { while (i < jobs.length) { await jobs[i++](); renderDerived(); } };
    await Promise.all([worker(), worker(), worker()]);
  }

  // ---------- Map ----------
  function tileLayers(key) {
    return RT.MAP_STYLES[key].layers.map(l => L.tileLayer(l.url, {
      attribution: l.attr, subdomains: l.subdomains || 'abc', maxZoom: l.maxZoom || 19,
      maxNativeZoom: l.maxNativeZoom, className: l.className || '',
    }));
  }
  RT.setBase = (m, key) => {
    (m._rtBase || []).forEach(l => m.removeLayer(l));
    m._rtBase = tileLayers(key);
    m._rtBase.forEach(l => l.addTo(m));
    m.getContainer().dataset.style = key;
  };

  RT.pinIcon = (stop, n, cls = '') => {
    const img = RT.safeImg(stop.image);
    const inner = img
      ? `<div class="pin photo ${cls}"><img src="${esc(img)}" alt="" loading="lazy" onerror="this.parentNode.classList.remove('photo');this.remove()"><b>${n}</b></div>`
      : `<div class="pin ${cls}"><b>${n}</b></div>`;
    return L.divIcon({ className: 'pin-wrap', html: inner, iconSize: [52, 52], iconAnchor: [26, 26], popupAnchor: [0, -24] });
  };

  const map = L.map('map', { zoomControl: false, worldCopyJump: true }).setView([62, 25], 5);
  L.control.zoom({ position: 'topleft' }).addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const markerLayer = L.layerGroup().addTo(map);

  const StyleSwitch = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const div = L.DomUtil.create('div', 'style-switch');
      div.innerHTML = Object.entries(RT.MAP_STYLES).map(([k, v]) =>
        `<button type="button" data-style="${k}" title="${v.label} map"><span>${v.icon}</span><em>${v.label}</em></button>`).join('');
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      div.addEventListener('click', e => {
        const b = e.target.closest('[data-style]');
        if (!b) return;
        trip().mapStyle = b.dataset.style;
        applyMapStyle();
        save();
      });
      return div;
    },
  });
  new StyleSwitch().addTo(map);

  const FitButton = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const b = L.DomUtil.create('button', 'fit-btn');
      b.type = 'button';
      b.title = 'Show the whole route';
      b.textContent = '⤢';
      L.DomEvent.disableClickPropagation(b);
      b.addEventListener('click', () => fitMap());
      return b;
    },
  });
  new FitButton().addTo(map);

  function applyMapStyle() {
    const key = trip().mapStyle;
    RT.setBase(map, key);
    $$('.style-switch [data-style]').forEach(b => b.classList.toggle('on', b.dataset.style === key));
  }

  function renderMarkers() {
    markerLayer.clearLayers();
    const t = trip(), st = stats();
    t.stops.forEach((stop, i) => {
      const cls = i === 0 ? 'start' : i === t.stops.length - 1 ? 'end' : '';
      const m = L.marker([stop.lat, stop.lng], { draggable: true, icon: RT.pinIcon(stop, i + 1, cls), title: stop.name, riseOnHover: true });
      const img = RT.safeImg(stop.image);
      const day = st.arrivals[i];
      m.bindPopup(`
        <div class="pop">
          ${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ''}
          <div class="pop-body">
            <small>${RT.flag(stop.country)} Day ${day} · ${esc(RT.dayDate(t, day))}${stop.nights ? ` · ${plural(stop.nights, 'night')}` : ''}</small>
            <h4>${i + 1}. ${esc(stop.name)}</h4>
            ${stop.description ? `<p>${esc(stop.description.length > 160 ? stop.description.slice(0, 157) + '…' : stop.description)}</p>` : ''}
            <button type="button" class="small" data-edit="${stop.id}">✎ Edit this stop</button>
          </div>
        </div>`, { maxWidth: 280, minWidth: 240, className: 'pop-wrap' });
      m.on('dragend', e => {
        const p = e.target.getLatLng();
        stop.lat = +p.lat.toFixed(5);
        stop.lng = +p.lng.toFixed(5);
        stop.country = '';
        queueEnrich(stop);
        save();
        renderStops();
        computeRoutes();
      });
      markerLayer.addLayer(m);
    });
  }
  map.getContainer().addEventListener('click', e => {
    const b = e.target.closest('[data-edit]');
    if (b) { map.closePopup(); focusStop(b.dataset.edit); }
  });

  function renderRoute() {
    routeLayer.clearLayers();
    const st = stats();
    st.days.forEach(d => d.drives.forEach(v => {
      const color = d.color || '#6b7280';
      L.polyline(v.leg.coords, { color: '#ffffff', weight: 9, opacity: .9, interactive: false, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
      L.polyline(v.leg.coords, { color, weight: 5, opacity: 1, dashArray: v.leg.approx ? '8 10' : null, lineCap: 'round', lineJoin: 'round' })
        .bindTooltip(`<b>Day ${d.day}</b> · ${esc(v.from.name)} → ${esc(v.to.name)}<br>${v.leg.approx ? '~' : ''}${fmtKm(v.leg.km)} · ${fmtDur(v.leg.min)}`, { sticky: true })
        .addTo(routeLayer);
    }));
  }

  function fitMap(m = map, opts = {}) {
    const s = trip().stops;
    if (!s.length) return;
    if (s.length === 1) { m.setView([s[0].lat, s[0].lng], 9); return; }
    const pts = [...s.map(x => [x.lat, x.lng]), ...legs.filter(Boolean).flatMap(l => l.coords)];
    m.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [60, 70], paddingBottomRight: [60, m === map ? 130 : 60], ...opts });
  }
  RT.fitBoundsOf = () => {
    const s = trip().stops;
    return L.latLngBounds([...s.map(x => [x.lat, x.lng]), ...legs.filter(Boolean).flatMap(l => l.coords), ...(returnLeg ? returnLeg.coords : [])]);
  };

  // ---------- Routing ----------
  async function computeRoutes() {
    const gen = ++routeGen;
    const t = trip();
    const s = t.stops;
    legs = new Array(s.length).fill(null);
    returnLeg = null;
    const pairs = [];
    for (let i = 1; i < s.length; i++) pairs.push([i, s[i - 1], s[i]]);
    if (t.roundTrip && s.length > 1) pairs.push(['return', s[s.length - 1], s[0]]);
    const assign = (k, l) => { if (k === 'return') returnLeg = l; else legs[k] = l; };
    const todo = [];
    for (const [k, a, b] of pairs) {
      const hit = RT.cachedLeg(a, b);
      if (hit) assign(k, hit);
      else { assign(k, RT.straightLeg(a, b)); todo.push([k, a, b]); }
    }
    routing = todo.length > 0;
    renderDerived();
    for (const [k, a, b] of todo) {
      const leg = await RT.fetchLeg(a, b);
      if (gen !== routeGen) return;
      assign(k, leg);
      renderDerived();
    }
    routing = false;
    renderDerived();
    scheduleWeather();
  }

  // ---------- Wikipedia enrichment & country detection ----------
  let enrichChain = Promise.resolve();
  const queueEnrich = (stop, opts) => (enrichChain = enrichChain.then(() => enrichStop(stop, opts)).catch(() => {}));

  async function enrichStop(stop, { force = false } = {}) {
    let changedSomething = false;
    if (!stop.country) {
      try {
        const r = await RT.reversePlace(stop.lat, stop.lng);
        if (r.country) { stop.country = r.country; changedSomething = true; }
        if (!stop.wikiTitle && r.wikiTitle) stop.wikiTitle = r.wikiTitle;
      } catch { /* offline: try again next time */ }
    }
    if (force || !stop.enriched) {
      try {
        const info = await RT.wikiInfo(stop);
        stop.enriched = true;
        if (info) {
          if (info.image && (force || !stop.image)) stop.image = info.image;
          if (!stop.description.trim()) stop.description = info.description;
          else if (force && info.description && info.description !== stop.description
            && confirm(`Replace the description of “${stop.name}” with the one from Wikipedia?\n\n${info.description}`)) stop.description = info.description;
          stop.wikiUrl = info.url;
          changedSomething = true;
          if (force) toast(`✨ Updated “${stop.name}” from Wikipedia`);
        } else if (force) toast(`No Wikipedia article found near “${stop.name}” 😕`);
      } catch {
        if (force) toast('Could not reach Wikipedia. Check your connection.');
      }
    }
    if (!changedSomething) return;
    save();
    if (!trip().stops.includes(stop)) return;
    renderMarkers();
    if (!$('#stopList').contains(document.activeElement)) renderStops();
    renderDerived();
  }

  // ---------- Pick on map ----------
  let picking = false;
  function setPicking(on) {
    picking = on;
    document.body.classList.toggle('picking', on);
    $('#pickHint').hidden = !on;
  }
  $('#pickBtn').addEventListener('click', () => setPicking(!picking));
  $('#pickCancel').addEventListener('click', () => setPicking(false));
  map.on('click', async e => {
    if (!picking) return;
    setPicking(false);
    const lat = +e.latlng.lat.toFixed(5), lng = +e.latlng.lng.toFixed(5);
    let place = { name: '', country: '', wikiTitle: '' };
    try { place = await RT.reversePlace(lat, lng); } catch { /* keep defaults */ }
    addStop({ ...place, name: place.name || `Stop ${trip().stops.length + 1}`, lat, lng });
  });

  // ---------- Place search ----------
  let searchTimer, searchId = 0, results = [];
  $('#placeSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 3) { $('#searchResults').innerHTML = ''; return; }
    searchTimer = setTimeout(() => searchPlaces(q), 450);
  });
  $('#placeSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(searchTimer); const q = e.target.value.trim(); if (q) searchPlaces(q); }
    if (e.key === 'Escape') { e.target.value = ''; $('#searchResults').innerHTML = ''; }
  });
  async function searchPlaces(q) {
    const id = ++searchId;
    const box = $('#searchResults');
    box.innerHTML = '<div class="muted">Searching…</div>';
    try {
      const r = await RT.searchPlaces(q);
      if (id !== searchId) return;
      results = r;
      box.innerHTML = r.length
        ? r.map((p, i) => `<button type="button" class="result" data-result="${i}"><strong>${RT.flag(p.country)} ${esc(p.name)}</strong><small>${esc(p.detail)}</small></button>`).join('')
        : '<div class="muted">No places found. Try another spelling, or use “Pick on map”.</div>';
    } catch {
      if (id === searchId) box.innerHTML = '<div class="muted">Search failed. Check your internet connection, or use “Pick on map”.</div>';
    }
  }
  $('#searchResults').addEventListener('click', e => {
    const b = e.target.closest('[data-result]');
    if (!b) return;
    const p = results[+b.dataset.result];
    addStop({ name: p.name, lat: p.lat, lng: p.lng, country: p.country, wikiTitle: p.wikiTitle });
    $('#placeSearch').value = '';
    $('#searchResults').innerHTML = '';
  });

  function addStop(data) {
    const t = trip();
    const stop = RT.normalizeStop({ nights: 1, ...data });
    t.stops.push(stop);
    openStops.add(stop.id);
    stopsChanged();
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), 7), { duration: .8 });
    requestAnimationFrame(() => focusStop(stop.id));
    toast(`Added “${stop.name}”: looking for a photo…`);
    queueEnrich(stop);
  }

  function focusStop(id) {
    setTab('stops');
    openStops.add(id);
    renderStops();
    const li = $(`.stop-card[data-id="${id}"]`);
    if (li) {
      li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      li.classList.add('flash');
      setTimeout(() => li.classList.remove('flash'), 1300);
    }
  }

  // ---------- Tabs ----------
  function setTab(name) {
    $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    RT.writeJSON(TAB_KEY, name);
  }
  $$('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // ---------- Cost rows ----------
  function costRowsHtml(costs, owner) {
    return costs.map((c, i) => `
      <div class="cost-row" data-i="${i}">
        <select data-cf="category" aria-label="Category">${Object.entries(RT.CATS).map(([k, v]) => `<option value="${k}"${k === c.category ? ' selected' : ''}>${v.icon} ${v.label}</option>`).join('')}</select>
        <input data-cf="label" value="${esc(c.label)}" placeholder="What for?" aria-label="Description">
        <input type="number" min="0" step="any" data-cf="amount" value="${c.amount || ''}" placeholder="0" aria-label="Amount">
        <button type="button" class="icon" data-act="del-cost" title="Remove">✕</button>
      </div>`).join('') + `<button type="button" class="small ghost" data-act="add-cost">＋ Add ${owner === 'trip' ? 'a trip' : 'a'} cost</button>`;
  }
  const ownerCosts = owner => owner === 'trip' ? trip().extraCosts : trip().stops.find(s => s.id === owner)?.costs;

  // ---------- Trip form ----------
  const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

  $('#currencySelect').innerHTML = Object.keys(RT.CURRENCIES).map(c => `<option value="${c}">${c}</option>`).join('');
  $('#showStyleSelect').innerHTML = Object.entries(RT.MAP_STYLES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('');

  function renderTripForm() {
    const t = trip();
    $$('#tripForm [data-t]').forEach(el => {
      const v = getPath(t, el.dataset.t);
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = el.value === v;
      else el.value = v ?? '';
    });
    $('#tripForm .cost-rows[data-owner="trip"]').innerHTML = costRowsHtml(t.extraCosts, 'trip');
    renderFuelPricing();
  }

  function renderFuelPricing() {
    const t = trip(), f = fuel();
    const auto = t.fuelPricing === 'auto';
    $('#consLabel').textContent = `Use (${f.unit} per 100 km)`;
    $('#consHint').textContent = f.hint;
    $('#manualPriceLabel').textContent = auto
      ? `Price for countries without data (${t.currency} per ${f.unit})`
      : `Price (${t.currency} per ${f.unit})`;
    const box = $('#countryPrices');
    if (!auto) { box.innerHTML = ''; return; }
    const countries = RT.tripCountries(t);
    if (!countries.length) {
      box.innerHTML = '<p class="hint">Add stops and the countries appear here with their local prices.</p>';
      return;
    }
    box.innerHTML = `
      <table class="price-table">
        <thead><tr><th>Country</th><th class="r">Average</th><th class="r">Your price</th></tr></thead>
        <tbody>${countries.map(c => {
          const row = RT.COUNTRY_FUEL[c];
          const eur = row?.[f.col + 1];
          const avg = eur != null ? RT.convert(eur, t.currency) : null;
          const own = t.priceOverrides[c];
          return `<tr>
            <td>${RT.flag(c)} ${esc(row?.[0] || c.toUpperCase())}</td>
            <td class="r">${avg != null ? RT.money(avg, t.currency, true) : '<span class="muted">no data</span>'}</td>
            <td class="r"><input type="number" min="0" step="0.01" data-override="${c}" value="${own ?? ''}" placeholder="${avg != null ? avg.toFixed(2) : t.vehicle.fuelPrice}" aria-label="Your price in ${esc(row?.[0] || c)}"></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <p class="hint">📊 National averages (${RT.PRICES_UPDATED} estimates)${t.currency !== 'EUR' ? `, converted with ${RT.ratesLive ? 'today’s' : 'approximate'} exchange rates` : ''}. Prices change often: type the real pump price in “Your price” if you know it. Drives that cross a border use the average of both countries.</p>`;
  }

  $('#tripForm').addEventListener('input', e => {
    const el = e.target;
    const t = trip();
    if (el.dataset.override) {
      const c = el.dataset.override;
      if (el.value.trim() === '') delete t.priceOverrides[c];
      else t.priceOverrides[c] = Math.max(0, num(el.value, 0));
      changed();
      return;
    }
    const p = el.dataset.t;
    if (!p) return;
    if (el.type === 'radio' && !el.checked) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (p === 'travelers') v = Math.max(1, Math.round(num(v, 1)));
    if (p === 'vehicle.consumption' || p === 'vehicle.fuelPrice') v = Math.max(0, num(v, 0));
    if (p === 'currency' && v !== t.currency) convertAmounts(t, t.currency, v);
    setPath(t, p, v);
    if (p === 'name') renderTripSelect();
    if (p === 'roundTrip') computeRoutes();
    if (p === 'startDate') scheduleWeather();
    if (['vehicle.fuelType', 'currency', 'fuelPricing'].includes(p)) renderFuelPricing();
    changed();
  });

  /** Changing the currency converts every amount, so 100 € becomes ¥16,500 instead of ¥100. */
  function convertAmounts(t, from, to) {
    const f = (RT.rates[to] ?? 1) / (RT.rates[from] ?? 1);
    const conv = x => Math.round(x * f * 100) / 100;
    [...t.extraCosts, ...t.stops.flatMap(s => s.costs)].forEach(c => { c.amount = conv(c.amount); });
    Object.keys(t.priceOverrides).forEach(k => { t.priceOverrides[k] = conv(t.priceOverrides[k]); });
    t.vehicle.fuelPrice = conv(t.vehicle.fuelPrice);
    $$('#tripForm [data-t="vehicle.fuelPrice"]').forEach(el => { el.value = t.vehicle.fuelPrice; });
    $('#tripForm .cost-rows[data-owner="trip"]').innerHTML = costRowsHtml(t.extraCosts, 'trip');
    renderStops();
    toast(`💱 Converted all amounts from ${from} to ${to}`);
  }

  // ---------- Stops list ----------
  function stopCardHtml(s, i, n) {
    const open = openStops.has(s.id);
    const img = RT.safeImg(s.image);
    return `
      <li class="stop-card${open ? ' open' : ''}" data-id="${s.id}">
        <div class="stop-head">
          <div class="thumb${img ? ' has-img' : ''}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="num">${i + 1}</span></div>
          <div class="stop-title">
            <input class="stop-name" data-f="name" value="${esc(s.name)}" aria-label="Stop name">
            <div class="stop-meta"></div>
          </div>
          <div class="stop-tools">
            <button type="button" class="icon" data-act="up" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="icon" data-act="down" title="Move down" ${i === n - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="icon" data-act="toggle" title="${open ? 'Close' : 'Edit details'}" aria-expanded="${open}">${open ? '▴' : '✎'}</button>
          </div>
        </div>
        <div class="stop-body"${open ? '' : ' hidden'}>
          <div class="row2">
            <label>Nights here<input type="number" min="0" step="1" data-f="nights" value="${s.nights}"></label>
            <label>Photo link<input type="url" data-f="image" value="${esc(s.image)}" placeholder="https://…"></label>
          </div>
          ${img ? `<figure class="photo-preview"><img src="${esc(img)}" alt="" onerror="this.parentNode.remove()">${s.wikiUrl ? `<figcaption>Photo &amp; text: <a href="${esc(s.wikiUrl)}" target="_blank" rel="noopener">Wikipedia</a></figcaption>` : ''}</figure>` : ''}
          <button type="button" class="small wiki-btn" data-act="wiki">✨ Get photo &amp; description from Wikipedia</button>
          <label>Description<textarea rows="3" data-f="description" placeholder="What is this place about? Why do we go?">${esc(s.description)}</textarea></label>
          <label>Things to do <small>(one per line)</small><textarea rows="4" data-f="activities" placeholder="Hike to the viewpoint&#10;Swim in the lake">${esc(s.activities.join('\n'))}</textarea></label>
          <div class="cost-block">
            <div class="cost-title">💶 Costs at this stop</div>
            <div class="cost-rows" data-owner="${s.id}">${costRowsHtml(s.costs, s.id)}</div>
          </div>
          <div class="stop-foot">
            <span class="coords">${RT.flag(s.country)} ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</span>
            <button type="button" class="danger small" data-act="del">🗑️ Delete stop</button>
          </div>
        </div>
      </li>`;
  }

  function renderStops() {
    const s = trip().stops;
    $('#stopList').innerHTML = s.length
      ? s.map((x, i) => stopCardHtml(x, i, s.length)).join('')
      : '<li class="empty">🧭 No stops yet.<br>Search for a place above, or press “📍 Pick on map”.</li>';
    updateStopMetas();
  }

  function updateStopMetas() {
    const t = trip(), st = stats();
    $$('#stopList .stop-card').forEach((li, i) => {
      const s = t.stops[i];
      if (!s) return;
      const parts = [`${RT.flag(s.country)} Day ${st.arrivals[i]}`];
      const dd = RT.dayDate(t, st.arrivals[i]);
      if (dd) parts.push(dd);
      if (legs[i]) parts.push(`🚗 ${legs[i].approx ? '~' : ''}${fmtKm(legs[i].km)}`);
      parts.push(s.nights ? `🛏️ ${plural(s.nights, 'night')}` : '☕ visit');
      $('.stop-meta', li).textContent = parts.join(' · ');
    });
  }

  $('#stopList').addEventListener('input', e => {
    const el = e.target;
    const f = el.dataset.f;
    if (!f) return;
    const s = trip().stops.find(x => x.id === el.closest('.stop-card')?.dataset.id);
    if (!s) return;
    if (f === 'nights') s.nights = Math.max(0, Math.round(num(el.value, 0)));
    else if (f === 'activities') s.activities = el.value.split('\n');
    else s[f] = el.value;
    if (f === 'name' || f === 'image') renderMarkers();
    if (f === 'image' && !el.value) s.enriched = true; // don't re-add a photo the user removed
    if (f === 'nights') scheduleWeather();
    changed();
  });

  document.addEventListener('input', e => {
    const el = e.target;
    const f = el.dataset.cf;
    if (!f) return;
    const costs = ownerCosts(el.closest('.cost-rows').dataset.owner);
    const c = costs?.[+el.closest('.cost-row').dataset.i];
    if (!c) return;
    c[f] = f === 'amount' ? Math.max(0, num(el.value, 0)) : el.value;
    changed();
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const t = trip();
    const li = b.closest('.stop-card');
    const s = li && t.stops.find(x => x.id === li.dataset.id);
    const idx = s ? t.stops.indexOf(s) : -1;
    switch (act) {
      case 'up':
      case 'down': {
        const j = idx + (act === 'up' ? -1 : 1);
        if (j < 0 || j >= t.stops.length) return;
        [t.stops[idx], t.stops[j]] = [t.stops[j], t.stops[idx]];
        stopsChanged();
        break;
      }
      case 'toggle':
        if (openStops.has(s.id)) openStops.delete(s.id); else openStops.add(s.id);
        renderStops();
        break;
      case 'del':
        if (confirm(`Delete the stop “${s.name}”?`)) {
          t.stops.splice(idx, 1);
          openStops.delete(s.id);
          stopsChanged();
        }
        break;
      case 'wiki':
        b.disabled = true;
        b.textContent = '✨ Searching Wikipedia…';
        queueEnrich(s, { force: true }).then(() => { b.disabled = false; });
        break;
      case 'add-cost':
      case 'del-cost': {
        const box = b.closest('.cost-rows');
        const costs = ownerCosts(box.dataset.owner);
        if (act === 'add-cost') costs.push({ category: box.dataset.owner === 'trip' ? 'transport' : 'stay', label: '', amount: 0 });
        else costs.splice(+b.closest('.cost-row').dataset.i, 1);
        box.innerHTML = costRowsHtml(costs, box.dataset.owner);
        if (act === 'add-cost') $$('input[data-cf="label"]', box).at(-1)?.focus();
        changed();
        break;
      }
    }
  });

  $('#enrichAll').addEventListener('click', () => {
    const missing = trip().stops.filter(s => !RT.safeImg(s.image) || !s.description.trim());
    if (!missing.length) { toast('All stops already have a photo and a description 👍'); return; }
    toast(`✨ Looking up ${plural(missing.length, 'stop')} on Wikipedia…`);
    missing.forEach(s => { s.enriched = false; queueEnrich(s); });
  });

  // ---------- Plan (day by day) ----------
  const gmapsLeg = (a, b) => `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=driving`;
  function gmapsTrip(stops) {
    if (stops.length < 2) return '';
    const [o, ...rest] = stops;
    const d = rest.pop();
    const w = rest.slice(0, 9).map(x => `${x.lat},${x.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}${w ? `&waypoints=${encodeURIComponent(w)}` : ''}&travelmode=driving`;
  }
  RT.dateRange = (t, days) => {
    if (!days) return '';
    const o = { day: 'numeric', month: 'short', year: 'numeric' };
    return days > 1 ? `${RT.dayDate(t, 1, o)} – ${RT.dayDate(t, days, o)}` : RT.dayDate(t, 1, o);
  };

  function driveHtml(t, v) {
    return `
      <div class="drive">
        <div class="drive-line"><b>🚗 ${esc(v.from.name)} → ${esc(v.to.name)}</b></div>
        <div class="drive-facts">
          <span>${v.leg.approx ? '~' : ''}${fmtKm(v.leg.km)}</span><span>⏱️ ${fmtDur(v.leg.min)}</span>
          <span>${fuel().icon} ${money(RT.driveCost(t, v))}</span>
          <a href="${gmapsLeg(v.from, v.to)}" target="_blank" rel="noopener">Directions ↗</a>
        </div>
      </div>`;
  }

  function visitHtml(s, i, rest) {
    const img = RT.safeImg(s.image);
    const acts = s.activities.map(a => a.trim()).filter(Boolean);
    return `
      <div class="visit">
        ${img ? `<img class="visit-img" src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
        <div class="visit-body">
          <h4><span class="num">${i + 1}</span>${esc(s.name)} ${RT.flag(s.country)}</h4>
          ${!rest && s.description ? `<p>${esc(s.description)}</p>` : ''}
          ${acts.length ? `<div class="acts-title">${rest ? 'Ideas for today' : 'Things to do'}</div><ul class="acts">${acts.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>`;
  }

  function renderPlan() {
    const t = trip(), st = stats(), el = $('#itinerary');
    if (!t.stops.length) { el.innerHTML = '<p class="empty">🗓️ Add some stops and your day-by-day plan appears here.</p>'; return; }
    const route = [...t.stops, ...(returnLeg ? [t.stops[0]] : [])];
    const anyTypical = st.days.some(d => dayWeather(d)?.kind === 'typical');
    let html = `
      <div class="plan-head">
        <h2>${esc(t.name)}</h2>
        ${t.subtitle ? `<p class="sub">${esc(t.subtitle)}</p>` : ''}
        <div class="chips">
          <span>📅 ${esc(RT.dateRange(t, st.days.length))}</span>
          <span>🗓️ ${plural(st.days.length, 'day')}</span>
          <span>🚗 ${st.approx ? '~' : ''}${fmtKm(st.km)}</span>
          <span>💶 ${money(st.total)}</span>
        </div>
        ${route.length > 1 ? `<a class="gmaps" href="${gmapsTrip(route)}" target="_blank" rel="noopener">Open the whole route in Google Maps ↗</a>` : ''}
      </div>`;
    st.days.forEach(d => {
      const s = t.stops;
      const dayCost = sum(d.drives, v => RT.driveCost(t, v)) + sum(d.visits, i => RT.stopCost(s[i]));
      let body = d.drives.map(v => driveHtml(t, v)).join('');
      body += d.visits.map(i => visitHtml(s[i], i, false)).join('');
      if (d.stay != null && !d.visits.length) body += `<p class="rest">🏕️ No driving today: a whole day to enjoy ${esc(s[d.stay].name)}.</p>` + visitHtml(s[d.stay], d.stay, true);
      if (d.departure) body += `<p class="rest">🧳 Pack up, last breakfast in ${esc(s[s.length - 1].name)}, and head home.</p>`;
      html += `
        <article class="day" style="--day:${d.color || 'var(--line-strong)'}">
          <header class="day-top">
            <span class="day-badge">Day ${d.day}</span>
            <span class="day-date">${esc(RT.dayDate(t, d.day, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
            ${wxChip(d)}
          </header>
          <h3 class="day-title">${esc(RT.dayTitle(t, d))}</h3>
          ${d.km ? `<div class="day-sum">${fmtKm(d.km)} · ${fmtDur(d.min)} driving</div>` : ''}
          ${body}
          <footer class="day-foot">
            ${d.sleep != null ? `<span>🛏️ Tonight: <b>${esc(s[d.sleep].name)}</b></span>` : '<span>🏁 End of the trip</span>'}
            ${dayCost ? `<span>💶 ${money(dayCost)}</span>` : ''}
          </footer>
        </article>`;
    });
    if (anyTypical) html += '<p class="hint">* Typical weather = what it was on the same day last year. Real forecasts appear 2 weeks before each day.</p>';
    el.innerHTML = html;
  }

  // ---------- Costs ----------
  function barsHtml(st) {
    const t = trip(), f = fuel();
    const rows = [
      { icon: f.icon, label: f.unit === 'kWh' ? 'Charging' : 'Fuel', amount: st.fuelCost },
      ...Object.entries(RT.CATS).map(([k, v]) => ({ icon: v.icon, label: v.label, amount: st.byCat[k] })),
    ].filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount);
    const max = Math.max(1, ...rows.map(r => r.amount));
    return `<div class="bars" role="list">${rows.map(r => {
      const pct = st.total ? Math.round(r.amount / st.total * 100) : 0;
      return `<div class="bar-row" role="listitem" tabindex="0" data-tip="${esc(`${r.label}: ${RT.money(r.amount, t.currency)} (${pct}% of the budget)`)}">
        <span class="bar-label">${r.icon} ${esc(r.label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(r.amount / max * 100).toFixed(1)}%"></div></div>
        <span class="amt">${RT.money(r.amount, t.currency)}</span></div>`;
    }).join('')}</div>`;
  }
  RT.barsHtml = barsHtml;

  function renderCosts() {
    const t = trip(), st = stats(), f = fuel(), el = $('#costs');
    const kpi = (label, value, cls = '') => `<div class="kpi ${cls}"><div class="k-label">${label}</div><div class="k-value">${value}</div></div>`;
    const countries = RT.tripCountries(t);
    el.innerHTML = `
      <div class="kpis">
        ${kpi(`Total budget for ${plural(t.travelers, 'traveller')}`, money(st.total), 'big')}
        ${kpi('Per person', money(st.perPerson))}
        ${kpi('Per day', st.days.length ? money(st.total / st.days.length) : '—')}
        ${kpi('Distance', `${st.approx ? '~' : ''}${fmtKm(st.km)}`)}
        ${kpi('Driving time', fmtDur(st.min))}
        ${kpi(`${f.unit === 'kWh' ? 'Energy' : 'Fuel'} needed`, `${st.fuelUnits.toFixed(0)} ${f.unit}`)}
        ${kpi(`${f.unit === 'kWh' ? 'Charging' : 'Fuel'} cost`, `${money(st.fuelCost)}<small> · avg ${money(st.avgPrice, true)}/${f.unit}</small>`)}
      </div>
      ${t.fuelPricing === 'auto' && countries.length ? `
      <h3 class="section">${f.icon} ${f.label} prices along the way</h3>
      <div class="price-chips">${countries.map(c => {
        const p = RT.countryPrice(t, c);
        const tag = { yours: 'your price', average: 'average', fallback: 'your default' }[p.source];
        return `<span class="price-chip">${RT.flag(c)} <b>${money(p.price, true)}</b>/${f.unit} <small>${tag}</small></span>`;
      }).join('')}</div>` : ''}
      <h3 class="section">Where the money goes</h3>
      ${st.total > 0 ? barsHtml(st) : '<p class="muted">No costs yet. Add costs in the Trip tab and on each stop.</p>'}
      ${st.days.length ? `
      <h3 class="section">Day by day</h3>
      <table class="cost-table">
        <thead><tr><th>Day</th><th class="r">km</th><th class="r">${f.icon}</th><th class="r">Other</th></tr></thead>
        <tbody>${st.days.map(d => {
          const fc = sum(d.drives, v => RT.driveCost(t, v));
          const oc = sum(d.visits, i => RT.stopCost(t.stops[i]));
          return `<tr><td><span class="dot" style="background:${d.color || 'transparent'}"></span>Day ${d.day} <small class="muted">${esc(RT.dayDate(t, d.day))}</small></td>
            <td class="r">${d.km ? Math.round(d.km) : '–'}</td><td class="r">${fc ? money(fc) : '–'}</td><td class="r">${oc ? money(oc) : '–'}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr><th>Total</th><th class="r">${Math.round(st.km)}</th><th class="r">${money(st.fuelCost)}</th><th class="r">${money(st.other - sum(t.extraCosts, c => c.amount))}</th></tr></tfoot>
      </table>
      ${t.extraCosts.length ? `<p class="hint">+ ${money(sum(t.extraCosts, c => c.amount))} trip-wide costs (${t.extraCosts.map(c => esc(c.label || RT.CATS[c.category].label)).join(', ')}).</p>` : ''}` : ''}
      ${st.approx ? '<p class="hint">~ = estimated distance (road route not loaded yet). It updates by itself.</p>' : ''}`;
  }

  // Bar tooltips
  const tip = $('#tip');
  document.addEventListener('pointerover', e => {
    const r = e.target.closest('[data-tip]');
    if (!r) { tip.hidden = true; return; }
    tip.textContent = r.dataset.tip;
    tip.hidden = false;
  });
  document.addEventListener('pointermove', e => {
    if (tip.hidden) return;
    tip.style.left = `${Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${e.clientY + 16}px`;
  });

  // ---------- Stats bar ----------
  function renderStatsBar() {
    const t = trip(), st = stats();
    const bar = $('#statsBar');
    if (!t.stops.length) { bar.innerHTML = '<span class="stat">Add your first stop to start planning ✨</span>'; return; }
    bar.innerHTML = `
      <span class="stat"><small>Distance</small><b>${st.approx ? '~' : ''}${fmtKm(st.km)}</b></span>
      <span class="stat"><small>Driving</small><b>${fmtDur(st.min)}</b></span>
      <span class="stat"><small>Days</small><b>${st.days.length}</b></span>
      <span class="stat"><small>${fuel().label}</small><b>${money(st.fuelCost)}</b></span>
      <span class="stat"><small>Total</small><b>${money(st.total)}</b></span>
      <span class="stat"><small>Each</small><b>${money(st.perPerson)}</b></span>
      ${routing ? '<span class="stat busy">🛣️ calculating roads…</span>' : ''}`;
  }

  // ---------- Render orchestration ----------
  let frame = 0;
  function renderDerived() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      renderStatsBar();
      updateStopMetas();
      renderPlan();
      renderCosts();
      renderRoute();
      if (!$('#tripForm').contains(document.activeElement)) renderFuelPricing();
    });
  }
  function changed() { save(); renderDerived(); }
  function stopsChanged() { save(); renderStops(); renderMarkers(); computeRoutes(); renderFuelPricing(); }

  function renderTripSelect() {
    $('#tripSelect').innerHTML = trips.map(t => `<option value="${t.id}"${t.id === activeId ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  }

  function loadTrip(id) {
    activeId = id;
    openStops.clear();
    renderTripSelect();
    renderTripForm();
    renderStops();
    applyMapStyle();
    renderMarkers();
    computeRoutes().then(() => fitMap());
    fitMap();
    flushSave();
    trip().stops.forEach(s => { if (!s.enriched || !s.country) queueEnrich(s); });
  }

  // ---------- Trip management ----------
  function addTrip(t, msg) {
    trips.push(t);
    loadTrip(t.id);
    if (msg) toast(msg);
  }
  $('#tripSelect').addEventListener('change', e => loadTrip(e.target.value));
  $('#newTrip').addEventListener('click', () => {
    addTrip(RT.blankTrip(trip()), 'New trip created: give it a name!');
    setTab('trip');
    $('#tripForm [data-t="name"]').select();
  });
  const closeMenu = () => $('#moreMenu').removeAttribute('open');
  document.addEventListener('click', e => { if (!e.target.closest('#moreMenu')) closeMenu(); });

  $('#dupTrip').addEventListener('click', () => {
    closeMenu();
    const copy = JSON.parse(JSON.stringify(trip()));
    copy.id = RT.uid();
    copy.name += ' (copy)';
    copy.stops.forEach(s => { s.id = RT.uid(); });
    addTrip(RT.normalizeTrip(copy), 'Trip duplicated');
  });
  $('#sampleBtn').addEventListener('click', () => { closeMenu(); addTrip(RT.sampleTrip(), 'Example trip added'); setTab('plan'); });
  $('#delTrip').addEventListener('click', () => {
    closeMenu();
    if (!confirm(`Delete the trip “${trip().name}”? This cannot be undone.\n(Tip: export it first if you want a backup.)`)) return;
    const cur = trip();
    trips = trips.filter(t => t !== cur);
    if (!trips.length) trips.push(RT.blankTrip(cur));
    loadTrip(trips[0].id);
    toast('Trip deleted');
  });

  const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'roadtrip';
  $('#exportBtn').addEventListener('click', () => {
    closeMenu();
    const t = trip();
    const blob = new Blob([JSON.stringify({ app: 'roadtrip-planner', version: 2, trip: t }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${slug(t.name)}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#importBtn').addEventListener('click', () => { closeMenu(); $('#importFile').click(); });
  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : data.trips || [data.trip || data];
      list.forEach(t => trips.push(RT.normalizeTrip({ ...t, id: RT.uid() })));
      loadTrip(trips[trips.length - 1].id);
      toast(`Imported ${plural(list.length, 'trip')}`);
    } catch {
      toast('Could not read that file 😕');
    }
  });

  function encodeTrip(t) {
    const bytes = new TextEncoder().encode(JSON.stringify({ ...t, id: undefined }));
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeTrip(s) {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
  }
  $('#shareBtn').addEventListener('click', async () => {
    closeMenu();
    const url = `${location.origin}${location.pathname}#trip=${encodeTrip(trip())}`;
    try { await navigator.clipboard.writeText(url); toast('Share link copied! 🔗'); } catch { prompt('Copy this link:', url); }
  });
  $('#printBtn').addEventListener('click', () => { closeMenu(); window.print(); });

  // ---------- API for the presentation ----------
  RT.app = {
    trip, stats, dayWeather, fitMap, toast,
    legs: () => legs,
    returnLeg: () => returnLeg,
    setShowStyle(k) { trip().showStyle = k; save(); },
  };

  // ---------- Start ----------
  (function init() {
    const m = location.hash.match(/^#trip=([\w-]+)/);
    if (m) {
      try {
        const t = RT.normalizeTrip({ ...decodeTrip(m[1]), id: RT.uid() });
        trips.push(t);
        activeId = t.id;
        setTimeout(() => toast(`Opened shared trip “${t.name}”`), 300);
      } catch {
        setTimeout(() => toast('That share link looks broken 😕'), 300);
      }
      history.replaceState(null, '', location.pathname + location.search);
    }
    let tab = RT.readJSON(TAB_KEY, 'plan');
    if (!$(`.tab[data-tab="${tab}"]`)) tab = 'plan';
    setTab(tab);
    loadTrip(activeId);
    RT.loadRates().then(() => { renderFuelPricing(); renderDerived(); });
  })();
})(window.RT);
