/* Roadtrip Planner — plain JavaScript, no build step.
 * Data lives in localStorage. Road distances come from the public OSRM
 * server, place search from OpenStreetMap Nominatim, map tiles from CARTO. */
(() => {
  'use strict';

  // ---------- Constants ----------
  const STORE_KEY = 'roadtrip.trips.v1';
  const ACTIVE_KEY = 'roadtrip.active.v1';
  const ROUTE_KEY = 'roadtrip.routes.v1';
  const TAB_KEY = 'roadtrip.tab.v1';
  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
  const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
  const NOMINATIM = 'https://nominatim.openstreetmap.org/';
  const ROAD_FACTOR = 1.3;   // straight line → road estimate when routing fails
  const AVG_SPEED = 70;      // km/h, only for estimates

  const CATS = {
    stay: { icon: '🛏️', label: 'Accommodation' },
    food: { icon: '🍽️', label: 'Food' },
    activity: { icon: '🎟️', label: 'Activities' },
    transport: { icon: '⛴️', label: 'Transport & tolls' },
    other: { icon: '📦', label: 'Other' },
  };
  const FUEL = {
    petrol: { unit: 'L', hint: 'Typical petrol use: small car 5–6 L, family car 6–8 L, van/camper 9–12 L per 100 km.' },
    diesel: { unit: 'L', hint: 'Typical diesel use: small car 4–5 L, family car 5–7 L, van/camper 8–11 L per 100 km.' },
    lpg: { unit: 'L', hint: 'LPG cars usually use ~20% more litres than petrol.' },
    electric: { unit: 'kWh', hint: 'Typical EV use: 15–22 kWh per 100 km (more in cold weather). Price = cost per kWh at chargers.' },
  };

  // ---------- Small helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const safeImg = u => /^(https?:\/\/|data:image\/)/i.test(String(u || '').trim()) ? String(u).trim() : '';

  function readJSON(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full or blocked */ }
  }

  // ---------- Formatting ----------
  const fmtKm = km => `${Math.round(km).toLocaleString()} km`;
  function fmtDur(min) {
    const m = Math.round(min);
    const h = Math.floor(m / 60);
    return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
  }
  function money(n, t = trip()) {
    const small = Math.abs(n) < 100 && n % 1 !== 0;
    const s = n.toLocaleString(undefined, { minimumFractionDigits: small ? 2 : 0, maximumFractionDigits: small ? 2 : 0 });
    return `${s} ${t.currency}`;
  }
  function dayDate(day, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
    const t = trip();
    if (!t.startDate) return '';
    const d = new Date(t.startDate + 'T12:00:00');
    if (isNaN(d)) return '';
    d.setDate(d.getDate() + day - 1);
    return d.toLocaleDateString(undefined, opts);
  }

  // ---------- Data model ----------
  const normCosts = c => (Array.isArray(c) ? c : []).map(x => ({
    category: CATS[x?.category] ? x.category : 'other',
    label: String(x?.label ?? ''),
    amount: Math.max(0, num(x?.amount, 0)),
  }));

  function normalizeTrip(t = {}) {
    const v = t.vehicle || {};
    return {
      id: t.id || uid(),
      name: String(t.name || 'New road trip'),
      subtitle: String(t.subtitle || ''),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(t.startDate || '') ? t.startDate : new Date().toISOString().slice(0, 10),
      travelers: Math.max(1, Math.round(num(t.travelers, 1))),
      currency: String(t.currency || '€'),
      roundTrip: !!t.roundTrip,
      vehicle: {
        name: String(v.name || ''),
        fuelType: FUEL[v.fuelType] ? v.fuelType : 'petrol',
        consumption: Math.max(0, num(v.consumption, 6.5)),
        fuelPrice: Math.max(0, num(v.fuelPrice, 1.85)),
      },
      extraCosts: normCosts(t.extraCosts),
      stops: (Array.isArray(t.stops) ? t.stops : [])
        .filter(s => s && Number.isFinite(+s.lat) && Number.isFinite(+s.lng))
        .map(s => ({
          id: s.id || uid(),
          name: String(s.name || 'Stop'),
          lat: +s.lat,
          lng: +s.lng,
          nights: Math.max(0, Math.round(num(s.nights, 0))),
          description: String(s.description || ''),
          activities: Array.isArray(s.activities) ? s.activities.map(String) : String(s.activities || '').split('\n'),
          image: String(s.image || ''),
          costs: normCosts(s.costs),
        })),
    };
  }

  function sampleTrip() {
    return normalizeTrip({
      name: 'Finland: South to Lapland',
      subtitle: 'Old towns, lakes, forests and the Arctic Circle',
      startDate: '2027-06-14',
      travelers: 3,
      currency: '€',
      vehicle: { name: 'Rental car', fuelType: 'petrol', consumption: 6.5, fuelPrice: 1.85 },
      extraCosts: [
        { category: 'transport', label: 'Car rental (9 days)', amount: 480 },
        { category: 'transport', label: 'One-way drop-off fee', amount: 150 },
      ],
      stops: [
        {
          name: 'Helsinki', lat: 60.1699, lng: 24.9384, nights: 1,
          description: 'We start in the capital: pick up the car, stock up on snacks and enjoy the harbour before hitting the road.',
          activities: ['Market Square and the Old Market Hall', 'Ferry to the Suomenlinna sea fortress', 'Evening sauna and sea dip at Löyly'],
          costs: [{ category: 'stay', label: 'Hostel', amount: 95 }, { category: 'activity', label: 'Suomenlinna ferry', amount: 18 }, { category: 'food', label: 'Dinner', amount: 60 }],
        },
        {
          name: 'Porvoo', lat: 60.3932, lng: 25.6650, nights: 0,
          description: 'A short hop east to one of Finland’s oldest towns, with wooden houses and red riverside storehouses.',
          activities: ['Walk the cobbled Old Town', 'Photo of the red shore houses from the bridge', 'Coffee and a Runeberg cake'],
          costs: [{ category: 'food', label: 'Lunch & coffee', amount: 45 }],
        },
        {
          name: 'Savonlinna', lat: 61.8687, lng: 28.8867, nights: 1,
          description: 'Into the Lakeland! A medieval castle sits on a rocky island in the middle of Lake Saimaa.',
          activities: ['Guided tour of Olavinlinna Castle', 'Evening lake cruise on Saimaa', 'Try a local lörtsy pastry at the market'],
          costs: [{ category: 'stay', label: 'Guesthouse', amount: 110 }, { category: 'activity', label: 'Castle + cruise', amount: 75 }],
        },
        {
          name: 'Koli National Park', lat: 63.0966, lng: 29.8067, nights: 2,
          description: 'The classic Finnish national landscape: forested hills rising above Lake Pielinen. Our outdoor base for two nights.',
          activities: ['Sunrise hike up Ukko-Koli', 'Canoe trip on Lake Pielinen', 'Campfire and sausages at a lean-to (laavu)', 'Smoke sauna at the cottage'],
          costs: [{ category: 'stay', label: 'Cottage (2 nights)', amount: 220 }, { category: 'activity', label: 'Canoe rental', amount: 60 }, { category: 'food', label: 'Groceries', amount: 70 }],
        },
        {
          name: 'Oulu', lat: 65.0121, lng: 25.4651, nights: 1,
          description: 'Crossing the country to the Gulf of Bothnia. A relaxed student city with great cycling paths.',
          activities: ['Market square and the Toripolliisi statue', 'Rent city bikes to Nallikari beach', 'Sunset at the seaside'],
          costs: [{ category: 'stay', label: 'Hotel', amount: 105 }, { category: 'food', label: 'Dinner', amount: 55 }],
        },
        {
          name: 'Rovaniemi', lat: 66.5039, lng: 25.7294, nights: 2,
          description: 'Finish line on the Arctic Circle! In June the sun never sets here — perfect for late-night hikes.',
          activities: ['Cross the Arctic Circle line', 'Arktikum museum about Arctic life', 'Midnight-sun hike on Ounasvaara', 'Reindeer farm visit'],
          costs: [{ category: 'stay', label: 'Log cabin (2 nights)', amount: 240 }, { category: 'activity', label: 'Arktikum + reindeer farm', amount: 95 }],
        },
      ],
    });
  }

  function blankTrip() {
    const t = sampleTrip();
    return normalizeTrip({ name: 'New road trip', currency: t.currency, vehicle: t.vehicle, travelers: 2 });
  }

  // ---------- State ----------
  let trips = readJSON(STORE_KEY, null);
  if (!Array.isArray(trips) || !trips.length) trips = [sampleTrip()];
  trips = trips.map(normalizeTrip);
  let activeId = readJSON(ACTIVE_KEY, trips[0].id);
  if (!trips.some(t => t.id === activeId)) activeId = trips[0].id;
  const trip = () => trips.find(t => t.id === activeId);

  const routeCache = readJSON(ROUTE_KEY, {});
  let legs = [];          // legs[i] = drive that arrives at stop i (legs[0] is always null)
  let returnLeg = null;   // drive from last stop back to first (round trips)
  let routeGen = 0;
  let routing = false;
  const openStops = new Set();

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 300);
  }
  function flushSave() {
    clearTimeout(saveTimer);
    writeJSON(STORE_KEY, trips);
    writeJSON(ACTIVE_KEY, activeId);
  }
  window.addEventListener('beforeunload', flushSave);

  // ---------- Calculations ----------
  function stats() {
    const t = trip();
    const s = t.stops;
    const arrivals = [];
    let d = 1;
    s.forEach(st => { arrivals.push(d); d += st.nights; });
    const drives = [...legs.slice(1), returnLeg].filter(Boolean);
    const km = sum(drives, l => l.km);
    const min = sum(drives, l => l.min);
    const fuelUnits = km * t.vehicle.consumption / 100;
    const fuelCost = fuelUnits * t.vehicle.fuelPrice;
    const byCat = Object.fromEntries(Object.keys(CATS).map(k => [k, 0]));
    [...t.extraCosts, ...s.flatMap(x => x.costs)].forEach(c => { byCat[c.category] += c.amount; });
    const other = sum(Object.values(byCat), x => x);
    const total = fuelCost + other;
    const last = s[s.length - 1];
    const days = last ? arrivals[arrivals.length - 1] + last.nights : 0;
    return {
      arrivals, km, min, fuelUnits, fuelCost, byCat, other, total,
      perPerson: total / Math.max(1, t.travelers),
      days: Math.max(days, s.length ? 1 : 0),
      nights: sum(s, x => x.nights),
      approx: drives.some(l => l.approx),
    };
  }
  const legCost = leg => leg.km * trip().vehicle.consumption / 100 * trip().vehicle.fuelPrice;
  const stopCost = s => sum(s.costs, c => c.amount);

  function haversine(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // ---------- Routing (OSRM) ----------
  const legKey = (a, b) => [a.lat, a.lng, b.lat, b.lng].map(n => (+n).toFixed(4)).join(',');
  function straightLeg(a, b) {
    const km = haversine(a, b) * ROAD_FACTOR;
    return { km, min: km / AVG_SPEED * 60, coords: [[a.lat, a.lng], [b.lat, b.lng]], approx: true };
  }
  async function fetchLeg(a, b) {
    const key = legKey(a, b);
    if (routeCache[key]) return routeCache[key];
    try {
      const url = `${OSRM}${a.lng},${a.lat};${b.lng},${b.lat}?overview=simplified&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      if (j.code !== 'Ok' || !j.routes?.length) throw new Error(j.code);
      const r = j.routes[0];
      const leg = {
        km: r.distance / 1000,
        min: r.duration / 60,
        coords: r.geometry.coordinates.map(([lng, lat]) => [+lat.toFixed(5), +lng.toFixed(5)]),
        approx: false,
      };
      routeCache[key] = leg;
      const keys = Object.keys(routeCache);
      if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => delete routeCache[k]);
      writeJSON(ROUTE_KEY, routeCache);
      return leg;
    } catch {
      return straightLeg(a, b); // not cached, so it will retry next time
    }
  }

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
      const cached = routeCache[legKey(a, b)];
      if (cached) assign(k, cached);
      else { assign(k, straightLeg(a, b)); todo.push([k, a, b]); }
    }
    routing = todo.length > 0;
    renderDerived();
    for (const [k, a, b] of todo) {
      const leg = await fetchLeg(a, b);
      if (gen !== routeGen) return;
      assign(k, leg);
      renderDerived();
    }
    routing = false;
    renderDerived();
  }

  // ---------- Map ----------
  const map = L.map('map', { zoomControl: true, worldCopyJump: true }).setView([62, 25], 5);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19, subdomains: 'abcd' }).addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const markerLayer = L.layerGroup().addTo(map);

  function numIcon(n, cls = '') {
    return L.divIcon({ className: `num-marker ${cls}`, html: `<span>${n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
  }
  const markerClass = (i, n) => (i === 0 ? 'start' : i === n - 1 ? 'end' : '');

  function renderMarkers() {
    markerLayer.clearLayers();
    const s = trip().stops;
    s.forEach((stop, i) => {
      const m = L.marker([stop.lat, stop.lng], { draggable: true, icon: numIcon(i + 1, markerClass(i, s.length)), title: stop.name });
      m.bindTooltip(esc(stop.name), { direction: 'top', offset: [0, -14] });
      m.on('click', () => focusStop(stop.id));
      m.on('dragend', e => {
        const p = e.target.getLatLng();
        stop.lat = +p.lat.toFixed(5);
        stop.lng = +p.lng.toFixed(5);
        save();
        renderStops();
        computeRoutes();
      });
      markerLayer.addLayer(m);
    });
  }

  function renderRouteLines() {
    routeLayer.clearLayers();
    legs.forEach(l => {
      if (!l) return;
      L.polyline(l.coords, {
        className: l.approx ? 'route-approx' : 'route-line',
        weight: 5, opacity: .85, dashArray: l.approx ? '6 8' : null,
      }).addTo(routeLayer);
    });
    if (returnLeg) {
      L.polyline(returnLeg.coords, { className: 'route-return', weight: 4, opacity: .7, dashArray: '2 8' }).addTo(routeLayer);
    }
  }

  function fitMap(m = map, opts = {}) {
    const s = trip().stops;
    if (!s.length) return;
    if (s.length === 1) { m.setView([s[0].lat, s[0].lng], 9); return; }
    m.fitBounds(L.latLngBounds(s.map(x => [x.lat, x.lng])), { padding: [40, 40], ...opts });
  }

  // Pick-on-map mode
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
    const { lat, lng } = e.latlng;
    let name = `Stop ${trip().stops.length + 1}`;
    try {
      const r = await fetch(`${NOMINATIM}reverse?format=jsonv2&zoom=12&lat=${lat}&lon=${lng}&accept-language=${encodeURIComponent(navigator.language || 'en')}`);
      const j = await r.json();
      const a = j.address || {};
      name = a.city || a.town || a.village || a.hamlet || a.municipality || j.name || a.county || name;
    } catch { /* keep default name */ }
    addStop({ name, lat: +lat.toFixed(5), lng: +lng.toFixed(5) });
  });

  // ---------- Place search ----------
  let searchTimer, searchCtl, lastResults = [];
  $('#placeSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 3) { $('#searchResults').innerHTML = ''; return; }
    searchTimer = setTimeout(() => searchPlaces(q), 500);
  });
  $('#placeSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(searchTimer); const q = e.target.value.trim(); if (q) searchPlaces(q); }
    if (e.key === 'Escape') { e.target.value = ''; $('#searchResults').innerHTML = ''; }
  });
  async function searchPlaces(q) {
    searchCtl?.abort();
    searchCtl = new AbortController();
    const box = $('#searchResults');
    box.innerHTML = '<div class="muted">Searching…</div>';
    try {
      const r = await fetch(`${NOMINATIM}search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}&accept-language=${encodeURIComponent(navigator.language || 'en')}`, { signal: searchCtl.signal });
      lastResults = await r.json();
      box.innerHTML = lastResults.length
        ? lastResults.map((p, i) => `<button type="button" class="result" data-result="${i}"><strong>${esc(p.name || p.display_name.split(',')[0])}</strong><small>${esc(p.display_name)}</small></button>`).join('')
        : '<div class="muted">No places found. Try another spelling, or use “Pick on map”.</div>';
    } catch (err) {
      if (err.name !== 'AbortError') box.innerHTML = '<div class="muted">Search failed — check your internet connection, or use “Pick on map”.</div>';
    }
  }
  $('#searchResults').addEventListener('click', e => {
    const b = e.target.closest('[data-result]');
    if (!b) return;
    const p = lastResults[+b.dataset.result];
    addStop({ name: p.name || p.display_name.split(',')[0], lat: +(+p.lat).toFixed(5), lng: +(+p.lon).toFixed(5) });
    $('#placeSearch').value = '';
    $('#searchResults').innerHTML = '';
  });

  function addStop(data) {
    const t = trip();
    const stop = normalizeTrip({ stops: [{ nights: 1, ...data }] }).stops[0];
    t.stops.push(stop);
    openStops.add(stop.id);
    stopsChanged();
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), 7), { duration: .8 });
    setTab('stops');
    requestAnimationFrame(() => focusStop(stop.id));
    toast(`Added “${stop.name}”`);
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
    writeJSON(TAB_KEY, name);
  }
  $$('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // ---------- Cost rows (shared by stops and trip-wide) ----------
  function costRowsHtml(costs) {
    return costs.map((c, i) => `
      <div class="cost-row" data-i="${i}">
        <select data-cf="category" aria-label="Category">${Object.entries(CATS).map(([k, v]) => `<option value="${k}"${k === c.category ? ' selected' : ''}>${v.icon} ${v.label}</option>`).join('')}</select>
        <input data-cf="label" value="${esc(c.label)}" placeholder="What for?" aria-label="Description">
        <input type="number" min="0" step="any" data-cf="amount" value="${c.amount || ''}" placeholder="0" aria-label="Amount">
        <button type="button" class="icon" data-act="del-cost" title="Remove">✕</button>
      </div>`).join('') + '<button type="button" class="small ghost" data-act="add-cost">＋ Add cost</button>';
  }
  function ownerCosts(owner) {
    const t = trip();
    if (owner === 'trip') return t.extraCosts;
    return t.stops.find(s => s.id === owner)?.costs;
  }

  // ---------- Trip form ----------
  function getPath(o, p) { return p.split('.').reduce((a, k) => a?.[k], o); }
  function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }

  function renderTripForm() {
    const t = trip();
    $$('#tripForm [data-t]').forEach(el => {
      const v = getPath(t, el.dataset.t);
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
    });
    $('#tripForm .cost-rows[data-owner="trip"]').innerHTML = costRowsHtml(t.extraCosts);
    updateUnitLabels();
  }
  function updateUnitLabels() {
    const f = FUEL[trip().vehicle.fuelType];
    $('#consLabel').textContent = `Use (${f.unit} per 100 km)`;
    $('#priceLabel').textContent = `Price per ${f.unit} (${trip().currency})`;
    $('#consHint').textContent = f.hint;
  }
  $('#tripForm').addEventListener('input', e => {
    const el = e.target;
    const p = el.dataset.t;
    if (!p) return;
    const t = trip();
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (p === 'travelers') v = Math.max(1, Math.round(num(v, 1)));
    if (p === 'vehicle.consumption' || p === 'vehicle.fuelPrice') v = Math.max(0, num(v, 0));
    setPath(t, p, v);
    if (p === 'name') renderTripSelect();
    if (p === 'roundTrip') computeRoutes();
    if (p === 'vehicle.fuelType' || p === 'currency') updateUnitLabels();
    changed();
  });

  // ---------- Stops list ----------
  function stopCardHtml(s, i, n) {
    const open = openStops.has(s.id);
    return `
      <li class="stop-card${open ? ' open' : ''}" data-id="${s.id}">
        <div class="stop-head">
          <span class="num">${i + 1}</span>
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
            <label>Photo link <small>(optional)</small><input type="url" data-f="image" value="${esc(s.image)}" placeholder="https://…"></label>
          </div>
          <label>Description<textarea rows="3" data-f="description" placeholder="What is this place about? Why do we go?">${esc(s.description)}</textarea></label>
          <label>Things to do <small>(one per line)</small><textarea rows="3" data-f="activities" placeholder="Hike to the viewpoint&#10;Swim in the lake">${esc(s.activities.join('\n'))}</textarea></label>
          <div class="cost-block">
            <div class="cost-title">Costs at this stop</div>
            <div class="cost-rows" data-owner="${s.id}">${costRowsHtml(s.costs)}</div>
          </div>
          <div class="stop-foot">
            <span class="coords">📍 ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</span>
            <button type="button" class="danger small" data-act="del">Delete stop</button>
          </div>
        </div>
      </li>`;
  }

  function renderStops() {
    const s = trip().stops;
    const list = $('#stopList');
    list.innerHTML = s.length
      ? s.map((x, i) => stopCardHtml(x, i, s.length)).join('')
      : '<li class="empty">No stops yet.<br>Search for a place above, or press “📍 Pick on map”.</li>';
    updateStopMetas();
  }

  function updateStopMetas() {
    const t = trip(), st = stats();
    $$('#stopList .stop-card').forEach((li, i) => {
      const s = t.stops[i];
      if (!s) return;
      const parts = [`Day ${st.arrivals[i]}`];
      const dd = dayDate(st.arrivals[i]);
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
    const li = el.closest('.stop-card');
    const s = trip().stops.find(x => x.id === li?.dataset.id);
    if (!s) return;
    if (f === 'nights') s.nights = Math.max(0, Math.round(num(el.value, 0)));
    else if (f === 'activities') s.activities = el.value.split('\n');
    else s[f] = el.value;
    if (f === 'name') renderMarkers();
    changed();
  });

  // Cost rows input (both in stops and trip form)
  document.addEventListener('input', e => {
    const el = e.target;
    const f = el.dataset.cf;
    if (!f) return;
    const box = el.closest('.cost-rows');
    const costs = ownerCosts(box.dataset.owner);
    const c = costs?.[+el.closest('.cost-row').dataset.i];
    if (!c) return;
    c[f] = f === 'amount' ? Math.max(0, num(el.value, 0)) : el.value;
    changed();
  });

  // All buttons with data-act
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
      case 'add-cost':
      case 'del-cost': {
        const box = b.closest('.cost-rows');
        const costs = ownerCosts(box.dataset.owner);
        if (act === 'add-cost') costs.push({ category: box.dataset.owner === 'trip' ? 'transport' : 'stay', label: '', amount: 0 });
        else costs.splice(+b.closest('.cost-row').dataset.i, 1);
        box.innerHTML = costRowsHtml(costs);
        if (act === 'add-cost') $$('input[data-cf="label"]', box).at(-1)?.focus();
        changed();
        break;
      }
    }
  });

  // ---------- Itinerary ----------
  const gmapsLeg = (a, b) => `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=driving`;
  function gmapsTrip(stops) {
    if (stops.length < 2) return '';
    const [o, ...rest] = stops;
    const d = rest.pop();
    const w = rest.slice(0, 9).map(x => `${x.lat},${x.lng}`).join('|'); // Google allows up to 9 waypoints
    return `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}${w ? `&waypoints=${encodeURIComponent(w)}` : ''}&travelmode=driving`;
  }

  function legHtml(leg, a, b) {
    return `<div class="it-leg">🚗 <b>${fmtKm(leg.km)}</b> · ${fmtDur(leg.min)} · ⛽ ${money(legCost(leg))}
      ${leg.approx ? '<em>estimate</em>' : ''}<br><small>${esc(a.name)} → ${esc(b.name)}</small>
      <a href="${gmapsLeg(a, b)}" target="_blank" rel="noopener">Open in Google Maps ↗</a></div>`;
  }

  function dateRange(st) {
    if (!st.days) return '';
    const o = { day: 'numeric', month: 'short', year: 'numeric' };
    return st.days > 1 ? `${dayDate(1, o)} – ${dayDate(st.days, o)}` : dayDate(1, o);
  }

  function renderItinerary() {
    const t = trip(), st = stats(), el = $('#itinerary');
    if (!t.stops.length) { el.innerHTML = '<p class="empty">Add some stops and your day-by-day plan appears here.</p>'; return; }
    const dayHead = d => `<h3 class="day-head"><span>Day ${d}</span><small>${esc(dayDate(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</small></h3>`;
    const route = [...t.stops, ...(t.roundTrip && t.stops.length > 1 ? [t.stops[0]] : [])];
    let html = `
      <div class="it-summary">
        <h2>${esc(t.name)}</h2>
        ${t.subtitle ? `<p>${esc(t.subtitle)}</p>` : ''}
        <p>📅 ${esc(dateRange(st))} · ${plural(st.days, 'day')} · ${plural(t.stops.length, 'stop')} · ${st.approx ? '~' : ''}${fmtKm(st.km)}</p>
        ${route.length > 1 ? `<a href="${gmapsTrip(route)}" target="_blank" rel="noopener">Open the whole route in Google Maps ↗</a>` : ''}
      </div>`;
    let lastDay = 0;
    t.stops.forEach((s, i) => {
      const d = st.arrivals[i];
      if (d !== lastDay) { html += dayHead(d); lastDay = d; }
      if (legs[i]) html += legHtml(legs[i], t.stops[i - 1], s);
      const acts = s.activities.map(a => a.trim()).filter(Boolean);
      const cost = stopCost(s);
      html += `
        <div class="it-stop">
          <h4><span class="num">${i + 1}</span>${esc(s.name)}</h4>
          ${s.description ? `<p>${esc(s.description)}</p>` : ''}
          ${acts.length ? `<ul>${acts.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
          <div class="it-tags">
            <span class="tag">${s.nights ? `🛏️ ${plural(s.nights, 'night')}` : '☕ Quick visit'}</span>
            ${cost ? `<span class="tag">💶 ${money(cost)}</span>` : ''}
          </div>
        </div>`;
      for (let k = 1; k < s.nights; k++) {
        html += dayHead(d + k) + `<div class="it-rest">🏕️ Full day in <b>${esc(s.name)}</b> — no driving today. Time for the activities above, or just rest.</div>`;
        lastDay = d + k;
      }
    });
    const last = t.stops[t.stops.length - 1];
    if (returnLeg) {
      if (st.days !== lastDay) html += dayHead(st.days);
      html += legHtml(returnLeg, last, t.stops[0]) + `<div class="it-end">🏁 Back in ${esc(t.stops[0].name)} — end of the trip!</div>`;
    } else {
      if (last.nights > 0 && st.days !== lastDay) html += dayHead(st.days);
      html += `<div class="it-end">🏁 End of the trip in ${esc(last.name)}!</div>`;
    }
    el.innerHTML = html;
  }

  // ---------- Costs ----------
  function barsData(st) {
    const f = FUEL[trip().vehicle.fuelType];
    return [
      { icon: f.unit === 'kWh' ? '🔌' : '⛽', label: f.unit === 'kWh' ? 'Charging' : 'Fuel', amount: st.fuelCost },
      ...Object.entries(CATS).map(([k, v]) => ({ icon: v.icon, label: v.label, amount: st.byCat[k] })),
    ].filter(x => x.amount > 0);
  }
  function barsHtml(st) {
    const rows = barsData(st);
    const max = Math.max(1, ...rows.map(r => r.amount));
    return `<div class="bars">${rows.map(r => `
      <div class="bar-row"><span>${r.icon} ${esc(r.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(r.amount / max * 100).toFixed(1)}%"></div></div>
      <span class="amt">${money(r.amount)}</span></div>`).join('')}</div>`;
  }

  function renderCosts() {
    const t = trip(), st = stats(), el = $('#costs');
    const f = FUEL[t.vehicle.fuelType];
    const kpi = (label, value, cls = '') => `<div class="kpi ${cls}"><div class="k-label">${label}</div><div class="k-value">${value}</div></div>`;
    const drives = [...legs.map((l, i) => l && [l, t.stops[i - 1], t.stops[i]]), returnLeg && [returnLeg, t.stops[t.stops.length - 1], t.stops[0]]].filter(Boolean);
    el.innerHTML = `
      <div class="kpis">
        ${kpi(`Total for ${plural(t.travelers, 'traveller')}`, money(st.total), 'big')}
        ${kpi('Per person', money(st.perPerson))}
        ${kpi('Per day', st.days ? money(st.total / st.days) : '—')}
        ${kpi('Distance', `${st.approx ? '~' : ''}${fmtKm(st.km)}`)}
        ${kpi('Driving time', fmtDur(st.min))}
        ${kpi(`${f.unit === 'kWh' ? 'Energy' : 'Fuel'} used`, `${st.fuelUnits.toFixed(1)} ${f.unit}`)}
        ${kpi(`${f.unit === 'kWh' ? 'Charging' : 'Fuel'} cost`, money(st.fuelCost))}
      </div>
      <h3 class="section">Where the money goes</h3>
      ${st.total > 0 ? barsHtml(st) : '<p class="muted">No costs yet. Add costs in the Trip tab and on each stop.</p>'}
      ${drives.length ? `
      <h3 class="section">Driving, leg by leg</h3>
      <table class="cost-table">
        <thead><tr><th>From → to</th><th class="r">km</th><th class="r">Time</th><th class="r">${f.unit === 'kWh' ? '🔌' : '⛽'}</th></tr></thead>
        <tbody>${drives.map(([l, a, b]) => `<tr><td>${esc(a.name)} → ${esc(b.name)}</td><td class="r">${l.approx ? '~' : ''}${Math.round(l.km)}</td><td class="r">${fmtDur(l.min)}</td><td class="r">${money(legCost(l))}</td></tr>`).join('')}</tbody>
      </table>` : ''}
      <h3 class="section">Costs per stop</h3>
      <table class="cost-table">
        <tbody>
          ${t.extraCosts.length ? `<tr><td>🧾 Trip-wide</td><td class="r">${money(sum(t.extraCosts, c => c.amount))}</td></tr>` : ''}
          ${t.stops.map((s, i) => `<tr><td>${i + 1}. ${esc(s.name)}</td><td class="r">${money(stopCost(s))}</td></tr>`).join('')}
        </tbody>
      </table>
      ${st.approx ? '<p class="hint">~ = estimated distance (road route not available yet). It updates automatically when the route loads.</p>' : ''}`;
  }

  // ---------- Stats bar ----------
  function renderStatsBar() {
    const t = trip(), st = stats();
    const bar = $('#statsBar');
    if (!t.stops.length) { bar.innerHTML = '<span class="stat">Add your first stop to start planning ✨</span>'; return; }
    bar.innerHTML = `
      <span class="stat">🚗 <b>${st.approx ? '~' : ''}${fmtKm(st.km)}</b></span>
      <span class="stat">⏱️ <b>${fmtDur(st.min)}</b></span>
      <span class="stat">🗓️ <b>${plural(st.days, 'day')}</b></span>
      <span class="stat">⛽ <b>${money(st.fuelCost)}</b></span>
      <span class="stat">💶 <b>${money(st.total)}</b> total</span>
      <span class="stat">👤 <b>${money(st.perPerson)}</b> each</span>
      ${routing ? '<span class="stat busy">calculating roads…</span>' : ''}`;
  }

  // ---------- Render orchestration ----------
  let derivedFrame = 0;
  function renderDerived() {
    cancelAnimationFrame(derivedFrame);
    derivedFrame = requestAnimationFrame(() => {
      renderStatsBar();
      updateStopMetas();
      renderItinerary();
      renderCosts();
      renderRouteLines();
    });
  }
  function changed() { save(); renderDerived(); }
  function stopsChanged() { save(); renderStops(); renderMarkers(); computeRoutes(); }

  function renderTripSelect() {
    $('#tripSelect').innerHTML = trips.map(t => `<option value="${t.id}"${t.id === activeId ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  }

  function loadTrip(id) {
    activeId = id;
    openStops.clear();
    renderTripSelect();
    renderTripForm();
    renderStops();
    renderMarkers();
    computeRoutes();
    fitMap();
    flushSave();
  }

  // ---------- Trip management ----------
  function addTrip(t, msg) {
    trips.push(t);
    loadTrip(t.id);
    if (msg) toast(msg);
  }
  $('#tripSelect').addEventListener('change', e => loadTrip(e.target.value));
  $('#newTrip').addEventListener('click', () => {
    addTrip(blankTrip(), 'New trip created — give it a name!');
    setTab('trip');
    $('#tripForm [data-t="name"]').select();
  });
  const closeMenu = () => $('#moreMenu').removeAttribute('open');
  document.addEventListener('click', e => { if (!e.target.closest('#moreMenu')) closeMenu(); });

  $('#dupTrip').addEventListener('click', () => {
    closeMenu();
    const copy = JSON.parse(JSON.stringify(trip()));
    copy.id = uid();
    copy.name += ' (copy)';
    copy.stops.forEach(s => { s.id = uid(); });
    addTrip(normalizeTrip(copy), 'Trip duplicated');
  });
  $('#sampleBtn').addEventListener('click', () => { closeMenu(); addTrip(sampleTrip(), 'Example trip added'); setTab('stops'); });
  $('#delTrip').addEventListener('click', () => {
    closeMenu();
    if (!confirm(`Delete the trip “${trip().name}”? This cannot be undone.\n(Tip: export it first if you want a backup.)`)) return;
    trips = trips.filter(t => t.id !== activeId);
    if (!trips.length) trips.push(blankTrip());
    loadTrip(trips[0].id);
    toast('Trip deleted');
  });

  // Export / import
  const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'roadtrip';
  $('#exportBtn').addEventListener('click', () => {
    closeMenu();
    const t = trip();
    const blob = new Blob([JSON.stringify({ app: 'roadtrip-planner', version: 1, trip: t }, null, 2)], { type: 'application/json' });
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
      list.forEach(t => trips.push(normalizeTrip({ ...t, id: uid() })));
      loadTrip(trips[trips.length - 1].id);
      toast(`Imported ${plural(list.length, 'trip')}`);
    } catch {
      toast('Could not read that file 😕');
    }
  });

  // Share link (the whole trip is encoded in the URL, nothing is uploaded)
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
    try { await navigator.clipboard.writeText(url); toast('Share link copied! 🔗'); }
    catch { prompt('Copy this link:', url); }
  });

  $('#printBtn').addEventListener('click', () => { closeMenu(); window.print(); });

  // ---------- Presentation ----------
  const P = { i: 0, slides: [], timer: null, playing: true, map: null };
  const SLIDE_MS = { intro: 7000, stop: 10000, summary: 14000 };

  function buildSlides() {
    return [{ type: 'intro' }, ...trip().stops.map((_, i) => ({ type: 'stop', i })), { type: 'summary' }];
  }

  function slideHtml(sl) {
    const t = trip(), st = stats();
    const f = FUEL[t.vehicle.fuelType];
    if (sl.type === 'intro') {
      return `
        <div class="p-eyebrow">🚐 Road trip${t.vehicle.name ? ` · ${esc(t.vehicle.name)}` : ''}</div>
        <h1>${esc(t.name)}</h1>
        ${t.subtitle ? `<p class="p-sub">${esc(t.subtitle)}</p>` : ''}
        <div class="p-chips">
          <span>📅 ${esc(dateRange(st))}</span>
          <span>🗓️ ${plural(st.days, 'day')}</span>
          <span>📍 ${plural(t.stops.length, 'stop')}</span>
          <span>🚗 ${fmtKm(st.km)}</span>
          <span>👥 ${plural(t.travelers, 'traveller')}</span>
        </div>
        <ol class="p-route">${t.stops.map(s => `<li>${esc(s.name)}</li>`).join('')}${t.roundTrip && t.stops.length > 1 ? `<li>${esc(t.stops[0].name)}</li>` : ''}</ol>`;
    }
    if (sl.type === 'stop') {
      const i = sl.i, s = t.stops[i], leg = legs[i], d = st.arrivals[i];
      const acts = s.activities.map(a => a.trim()).filter(Boolean);
      const img = safeImg(s.image);
      const cost = stopCost(s);
      return `
        ${img ? `<img class="p-img" src="${esc(img)}" alt="" onerror="this.remove()">` : ''}
        <div class="p-eyebrow">Stop ${i + 1} of ${t.stops.length} · Day ${d}${dayDate(d) ? ` · ${esc(dayDate(d))}` : ''}</div>
        <h2>${esc(s.name)}</h2>
        <div class="p-leg">${leg
          ? `🚗 ${fmtKm(leg.km)} · ${fmtDur(leg.min)} from ${esc(t.stops[i - 1].name)} · ${f.unit === 'kWh' ? '🔌' : '⛽'} ${money(legCost(leg))}`
          : '🏁 Our starting point'}</div>
        ${s.description ? `<p>${esc(s.description)}</p>` : ''}
        ${acts.length ? `<ul class="p-acts">${acts.map((a, k) => `<li style="animation-delay:${0.5 + k * 0.35}s">${esc(a)}</li>`).join('')}</ul>` : ''}
        <div class="p-chips">
          <span>${s.nights ? `🛏️ ${plural(s.nights, 'night')}` : '☕ Quick visit'}</span>
          ${cost ? `<span>💶 ${money(cost)}</span>` : ''}
        </div>`;
    }
    const stat = (icon, value, label) => `<div class="p-stat">${icon}<b>${value}</b><small>${label}</small></div>`;
    return `
      <div class="p-eyebrow">Trip summary</div>
      <h2>${esc(t.name)}</h2>
      <div class="p-stats">
        ${stat('🚗', fmtKm(st.km), 'total distance')}
        ${stat('⏱️', fmtDur(st.min), 'behind the wheel')}
        ${stat('🗓️', plural(st.days, 'day'), `${plural(st.nights, 'night')} away`)}
        ${stat(f.unit === 'kWh' ? '🔌' : '⛽', `${Math.round(st.fuelUnits)} ${f.unit}`, money(st.fuelCost))}
        ${stat('💶', money(st.total), 'total budget')}
        ${stat('👤', money(st.perPerson), 'per person')}
      </div>
      ${st.total > 0 ? barsHtml(st) : ''}
      <p class="p-end">Have an amazing trip! ✨</p>`;
  }

  function cardPadding() {
    const card = $('#pCard').getBoundingClientRect();
    const wide = window.innerWidth > 860;
    return wide
      ? { paddingTopLeft: [card.right + 40, 60], paddingBottomRight: [60, 110] }
      : { paddingTopLeft: [30, 30], paddingBottomRight: [30, window.innerHeight - card.top + 20] };
  }

  function drawPresentMap(sl) {
    const t = trip(), s = t.stops;
    P.done.clearLayers();
    P.marks.clearLayers();
    const reached = sl.type === 'intro' ? -1 : sl.type === 'summary' ? s.length - 1 : sl.i;
    for (let i = 1; i <= reached; i++) {
      if (legs[i]) L.polyline(legs[i].coords, { className: 'route-done', weight: i === reached && sl.type === 'stop' ? 7 : 5, opacity: .95 }).addTo(P.done);
    }
    if (sl.type === 'summary' && returnLeg) L.polyline(returnLeg.coords, { className: 'route-done', weight: 5, opacity: .95, dashArray: '2 8' }).addTo(P.done);
    s.forEach((x, i) => {
      const cls = [markerClass(i, s.length), i > reached && sl.type !== 'intro' ? 'dim' : '', sl.type === 'stop' && i === sl.i ? 'current' : ''].join(' ');
      L.marker([x.lat, x.lng], { icon: numIcon(i + 1, cls), interactive: false }).addTo(P.marks);
    });

    const pad = cardPadding();
    if (sl.type === 'stop') {
      const leg = legs[sl.i];
      const pts = leg ? leg.coords : [[s[sl.i].lat, s[sl.i].lng]];
      if (pts.length > 1) P.map.flyToBounds(L.latLngBounds(pts), { ...pad, maxZoom: 10, duration: 2.2 });
      else P.map.flyTo(pts[0], 10, { duration: 2.2 });
    } else {
      const all = [...s.map(x => [x.lat, x.lng]), ...legs.filter(Boolean).flatMap(l => l.coords)];
      if (all.length > 1) P.map.flyToBounds(L.latLngBounds(all), { ...pad, duration: 2 });
      else if (all.length) P.map.flyTo(all[0], 9);
    }
  }

  function showSlide(n) {
    P.i = Math.max(0, Math.min(n, P.slides.length - 1));
    const sl = P.slides[P.i];
    const card = $('#pCard');
    card.classList.remove('in');
    card.innerHTML = slideHtml(sl);
    card.scrollTop = 0;
    void card.offsetWidth; // restart the entrance animation
    card.classList.add('in');
    $('#pCount').textContent = `${P.i + 1} / ${P.slides.length}`;
    $$('#pDots button').forEach((b, i) => b.classList.toggle('on', i === P.i));
    drawPresentMap(sl);
    restartTimer();
  }

  function restartTimer() {
    clearTimeout(P.timer);
    const bar = $('#pProgress');
    bar.style.transition = 'none';
    bar.style.width = '0';
    $('#pPlay').textContent = P.playing ? '⏸' : '▶';
    if (!P.playing) return;
    const ms = SLIDE_MS[P.slides[P.i].type];
    void bar.offsetWidth;
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = '100%';
    P.timer = setTimeout(() => {
      if (P.i < P.slides.length - 1) showSlide(P.i + 1);
      else { P.playing = false; restartTimer(); }
    }, ms);
  }

  function openPresentation() {
    const t = trip();
    if (!t.stops.length) { toast('Add some stops first 🙂'); return; }
    P.slides = buildSlides();
    P.playing = true;
    $('#present').hidden = false;
    document.body.classList.add('presenting');
    if (!P.map) {
      P.map = L.map('pMap', { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19, subdomains: 'abcd' }).addTo(P.map);
      P.ghost = L.layerGroup().addTo(P.map);
      P.done = L.layerGroup().addTo(P.map);
      P.marks = L.layerGroup().addTo(P.map);
    }
    P.ghost.clearLayers();
    legs.forEach(l => l && L.polyline(l.coords, { className: 'route-ghost', weight: 4, opacity: .5, dashArray: '4 8' }).addTo(P.ghost));
    $('#pDots').innerHTML = P.slides.map((_, i) => `<button type="button" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('');
    document.documentElement.requestFullscreen?.().catch(() => {});
    setTimeout(() => {
      P.map.invalidateSize();
      fitMap(P.map, { animate: false });
      showSlide(0);
    }, 60);
  }

  function closePresentation() {
    clearTimeout(P.timer);
    $('#present').hidden = true;
    document.body.classList.remove('presenting');
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  $('#presentBtn').addEventListener('click', openPresentation);
  $('#pClose').addEventListener('click', closePresentation);
  $('#pPrev').addEventListener('click', () => showSlide(P.i - 1));
  $('#pNext').addEventListener('click', () => showSlide(P.i + 1));
  $('#pPlay').addEventListener('click', () => {
    P.playing = !P.playing;
    if (P.playing && P.i === P.slides.length - 1) showSlide(0); else restartTimer();
  });
  $('#pDots').addEventListener('click', e => { const b = e.target.closest('[data-slide]'); if (b) showSlide(+b.dataset.slide); });
  document.addEventListener('keydown', e => {
    if ($('#present').hidden) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') showSlide(P.i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') showSlide(P.i - 1);
    else if (e.key === ' ') { e.preventDefault(); $('#pPlay').click(); }
    else if (e.key === 'Escape') closePresentation();
  });
  window.addEventListener('resize', () => { if (!$('#present').hidden) P.map.invalidateSize(); });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------- Start ----------
  (function init() {
    const m = location.hash.match(/^#trip=([\w-]+)/);
    if (m) {
      try {
        const t = normalizeTrip({ ...decodeTrip(m[1]), id: uid() });
        trips.push(t);
        activeId = t.id;
        setTimeout(() => toast(`Opened shared trip “${t.name}”`), 300);
      } catch {
        setTimeout(() => toast('That share link looks broken 😕'), 300);
      }
      history.replaceState(null, '', location.pathname + location.search);
    }
    setTab(readJSON(TAB_KEY, 'stops'));
    loadTrip(activeId);
  })();
})();
