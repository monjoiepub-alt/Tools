/* Online services (all free, no API keys) with local caching.
 * - Routing: OSRM (project-osrm.org, fallback routing.openstreetmap.de)
 * - Places: Nominatim (OpenStreetMap)
 * - Photos & descriptions: Wikipedia REST API
 * - Weather: Open-Meteo (forecast + historical archive)
 * - Exchange rates: Frankfurter (European Central Bank) */
window.RT = window.RT || {};
(RT => {
  'use strict';

  const readJSON = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } };
  RT.readJSON = readJSON;
  RT.writeJSON = writeJSON;

  /** A small persistent key→value cache with a size cap. */
  function makeCache(key, max) {
    const data = readJSON(key, {});
    let timer;
    return {
      get: k => data[k],
      set(k, v) {
        data[k] = v;
        const keys = Object.keys(data);
        if (keys.length > max) keys.slice(0, keys.length - max).forEach(x => delete data[x]);
        clearTimeout(timer);
        timer = setTimeout(() => writeJSON(key, data), 400);
      },
    };
  }
  const routeCache = makeCache('roadtrip.routes.v2', 400);
  const wikiCache = makeCache('roadtrip.wiki.v1', 300);
  const weatherCache = makeCache('roadtrip.weather.v1', 500);

  async function fetchJSON(url, { timeout = 12000, signal } = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    signal?.addEventListener('abort', () => ctl.abort());
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }
  RT.fetchJSON = fetchJSON;

  const lang = () => (navigator.language || 'en').slice(0, 2);

  // ---------- Geometry ----------
  RT.haversine = (a, b) => {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // ---------- Routing ----------
  const ROUTERS = [
    'https://router.project-osrm.org/route/v1/driving/',
    'https://routing.openstreetmap.de/routed-car/route/v1/driving/',
  ];
  const legKey = (a, b) => [a.lat, a.lng, b.lat, b.lng].map(n => (+n).toFixed(4)).join(',');

  RT.straightLeg = (a, b) => {
    const km = RT.haversine(a, b) * 1.3;
    return { km, min: km / 70 * 60, coords: [[a.lat, a.lng], [b.lat, b.lng]], approx: true };
  };
  RT.cachedLeg = (a, b) => routeCache.get(legKey(a, b));

  RT.fetchLeg = async (a, b) => {
    const key = legKey(a, b);
    const hit = routeCache.get(key);
    if (hit) return hit;
    for (const base of ROUTERS) {
      try {
        const j = await fetchJSON(`${base}${a.lng},${a.lat};${b.lng},${b.lat}?overview=simplified&geometries=geojson`, { timeout: 15000 });
        if (j.code !== 'Ok' || !j.routes?.length) continue;
        const r = j.routes[0];
        const leg = {
          km: r.distance / 1000,
          min: r.duration / 60,
          coords: r.geometry.coordinates.map(([lng, lat]) => [+lat.toFixed(5), +lng.toFixed(5)]),
          approx: false,
        };
        routeCache.set(key, leg);
        return leg;
      } catch { /* try the next router */ }
    }
    return RT.straightLeg(a, b); // not cached → retried next time
  };

  // ---------- Places (Nominatim: max 1 request per second) ----------
  let lastNominatim = 0;
  async function nominatim(path) {
    const wait = Math.max(0, lastNominatim + 1100 - Date.now());
    lastNominatim = Date.now() + wait;
    if (wait) await new Promise(r => setTimeout(r, wait));
    return fetchJSON(`https://nominatim.openstreetmap.org/${path}&accept-language=${lang()}`);
  }

  RT.searchPlaces = async q => {
    const res = await nominatim(`search?format=jsonv2&limit=6&addressdetails=1&extratags=1&q=${encodeURIComponent(q)}`);
    return res.map(p => ({
      name: p.name || p.display_name.split(',')[0],
      detail: p.display_name,
      lat: +(+p.lat).toFixed(5),
      lng: +(+p.lon).toFixed(5),
      country: p.address?.country_code || '',
      wikiTitle: wikiTag(p.extratags?.wikipedia),
    }));
  };

  RT.reversePlace = async (lat, lng) => {
    const j = await nominatim(`reverse?format=jsonv2&zoom=12&addressdetails=1&extratags=1&lat=${lat}&lon=${lng}`);
    const a = j.address || {};
    return {
      name: a.city || a.town || a.village || a.hamlet || a.municipality || j.name || a.county || a.state || '',
      country: a.country_code || '',
      wikiTitle: wikiTag(j.extratags?.wikipedia),
    };
  };

  // OSM "wikipedia" tags look like "fi:Porvoo". Only keep English ones (others get looked up by name).
  function wikiTag(tag) {
    const m = /^en:(.+)$/.exec(tag || '');
    return m ? m[1] : '';
  }

  // ---------- Wikipedia: photo + short description ----------
  const WIKI = 'https://en.wikipedia.org';
  async function wikiSummary(title) {
    const j = await fetchJSON(`${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    if (j.type === 'disambiguation' || !j.extract) return null;
    return j;
  }
  function bigImage(s) {
    const o = s.originalimage, t = s.thumbnail;
    if (!o && !t) return '';
    if (o && o.width <= 1600) return o.source;
    if (t && /\/\d+px-/.test(t.source)) return t.source.replace(/\/\d+px-/, '/1280px-');
    return (o || t).source;
  }
  function shortText(text, max = 320) {
    const sentences = text.replace(/\s*\([^)]*\)/g, '').match(/[^.!?]+[.!?]+/g) || [text];
    let out = '';
    for (const s of sentences) {
      if ((out + s).length > max && out) break;
      out += s;
    }
    return out.trim();
  }

  /** Finds a Wikipedia article for a place: photo, 1–3 sentence description, link. */
  RT.wikiInfo = async ({ name, lat, lng, wikiTitle }) => {
    const key = `${wikiTitle || name}|${(+lat).toFixed(2)},${(+lng).toFixed(2)}`;
    const hit = wikiCache.get(key);
    if (hit !== undefined) return hit;
    const near = s => !s.coordinates || RT.haversine({ lat, lng }, { lat: s.coordinates.lat, lng: s.coordinates.lon }) < 60;
    let found = null, offline = false;
    const noteErr = e => { if (!String(e?.message).startsWith('HTTP')) offline = true; };
    const tries = [wikiTitle, name, name.split(',')[0]].filter(Boolean);
    for (const t of [...new Set(tries)]) {
      try { const s = await wikiSummary(t); if (s && near(s)) { found = s; break; } } catch (e) { noteErr(e); }
    }
    if (!found) {
      try {
        const g = await fetchJSON(`${WIKI}/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lng}&gsradius=10000&gslimit=15&format=json&origin=*`);
        const pages = g.query?.geosearch || [];
        const first = name.toLowerCase().split(/[\s,]/)[0];
        const pick = pages.find(p => p.title.toLowerCase().includes(first)) || pages[0];
        if (pick) found = await wikiSummary(pick.title);
      } catch (e) { noteErr(e); }
    }
    if (!found && offline) throw new Error('offline'); // don't cache: retry later
    const info = found ? {
      title: found.title,
      description: shortText(found.extract),
      image: bigImage(found),
      url: found.content_urls?.desktop?.page || `${WIKI}/wiki/${encodeURIComponent(found.title)}`,
    } : null;
    wikiCache.set(key, info);
    return info;
  };

  // ---------- Weather ----------
  const iso = d => d.toISOString().slice(0, 10);
  /** Weather for one place and date. Uses the forecast when the date is within 15 days,
   *  the real archive when it is in the past, and the same day last year as a "typical" guide otherwise. */
  RT.weatherFor = async (lat, lng, dateISO) => {
    const today = new Date(iso(new Date()) + 'T00:00:00Z');
    const date = new Date(dateISO + 'T00:00:00Z');
    if (isNaN(date)) return null;
    const diff = Math.round((date - today) / 86400000);
    let kind = 'forecast', query = new Date(date);
    if (diff < -5) kind = 'past';
    else if (diff < 0 || diff > 15) {
      kind = 'typical';
      while ((query - today) / 86400000 > -6) query.setUTCFullYear(query.getUTCFullYear() - 1);
    }
    const q = iso(query);
    const key = `${(+lat).toFixed(2)},${(+lng).toFixed(2)},${q},${kind}`;
    const hit = weatherCache.get(key);
    if (hit && (kind !== 'forecast' || Date.now() - hit.at < 3 * 3600e3)) return hit;
    const daily = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,daylight_duration';
    const host = kind === 'forecast' ? 'https://api.open-meteo.com/v1/forecast' : 'https://archive-api.open-meteo.com/v1/archive';
    const j = await fetchJSON(`${host}?latitude=${lat}&longitude=${lng}&daily=${daily}&timezone=auto&start_date=${q}&end_date=${q}`);
    const d = j.daily;
    if (!d?.time?.length) return null;
    const w = {
      at: Date.now(), kind, basedOn: q,
      code: d.weather_code[0], tmax: d.temperature_2m_max[0], tmin: d.temperature_2m_min[0],
      rain: d.precipitation_sum[0], sunrise: d.sunrise[0], sunset: d.sunset[0], daylight: d.daylight_duration[0],
    };
    weatherCache.set(key, w);
    return w;
  };

  // ---------- Exchange rates ----------
  RT.rates = { ...RT.CURRENCIES };
  RT.ratesLive = false;
  RT.loadRates = async () => {
    const cached = readJSON('roadtrip.rates.v1', null);
    if (cached && Date.now() - cached.at < 12 * 3600e3) {
      Object.assign(RT.rates, cached.rates);
      RT.ratesLive = true;
      return;
    }
    for (const url of ['https://api.frankfurter.dev/v1/latest?base=EUR', 'https://api.frankfurter.app/latest?from=EUR']) {
      try {
        const j = await fetchJSON(url, { timeout: 8000 });
        if (!j.rates) continue;
        const rates = { ...j.rates, EUR: 1 };
        Object.assign(RT.rates, rates);
        RT.ratesLive = true;
        writeJSON('roadtrip.rates.v1', { at: Date.now(), rates });
        return;
      } catch { /* try next */ }
    }
  };
})(window.RT);
