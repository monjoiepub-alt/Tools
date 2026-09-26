/* Trip data model and all calculations (days, distances, fuel, budget). */
window.RT = window.RT || {};
(RT => {
  'use strict';

  const num = (v, d = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
  RT.num = num;
  RT.sum = sum;
  RT.uid = () => Math.random().toString(36).slice(2, 10);

  const LEGACY_SYMBOLS = { '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY', 'kr': 'SEK', 'NT$': 'TWD' };

  const normCosts = c => (Array.isArray(c) ? c : []).map(x => ({
    category: RT.CATS[x?.category] ? x.category : 'other',
    label: String(x?.label ?? ''),
    amount: Math.max(0, num(x?.amount, 0)),
  }));

  RT.normalizeStop = s => ({
    id: s.id || RT.uid(),
    name: String(s.name || 'Stop'),
    lat: +s.lat,
    lng: +s.lng,
    nights: Math.max(0, Math.round(num(s.nights, 0))),
    country: String(s.country || '').toLowerCase(),
    description: String(s.description || ''),
    activities: Array.isArray(s.activities) ? s.activities.map(String) : String(s.activities || '').split('\n'),
    image: String(s.image || ''),
    wikiTitle: String(s.wikiTitle || ''),
    wikiUrl: String(s.wikiUrl || ''),
    enriched: !!s.enriched,
    costs: normCosts(s.costs),
  });

  RT.normalizeTrip = (t = {}) => {
    const v = t.vehicle || {};
    let currency = LEGACY_SYMBOLS[t.currency] || String(t.currency || 'EUR').toUpperCase();
    if (!RT.CURRENCIES[currency]) currency = 'EUR';
    const overrides = {};
    Object.entries(t.priceOverrides || {}).forEach(([k, x]) => { if (num(x, -1) >= 0) overrides[k] = num(x); });
    return {
      id: t.id || RT.uid(),
      name: String(t.name || 'New road trip'),
      subtitle: String(t.subtitle || ''),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(t.startDate || '') ? t.startDate : new Date().toISOString().slice(0, 10),
      travelers: Math.max(1, Math.round(num(t.travelers, 1))),
      currency,
      roundTrip: !!t.roundTrip,
      fuelPricing: t.fuelPricing === 'manual' ? 'manual' : 'auto',
      priceOverrides: overrides,
      mapStyle: RT.MAP_STYLES[t.mapStyle] ? t.mapStyle : 'relief',
      showStyle: RT.MAP_STYLES[t.showStyle] ? t.showStyle : 'satellite',
      vehicle: {
        name: String(v.name || ''),
        fuelType: RT.FUEL_TYPES[v.fuelType] ? v.fuelType : 'petrol',
        consumption: Math.max(0, num(v.consumption, 6.5)),
        fuelPrice: Math.max(0, num(v.fuelPrice, 1.85)),
      },
      extraCosts: normCosts(t.extraCosts),
      stops: (Array.isArray(t.stops) ? t.stops : [])
        .filter(s => s && Number.isFinite(+s.lat) && Number.isFinite(+s.lng))
        .map(RT.normalizeStop),
    };
  };

  RT.sampleTrip = () => RT.normalizeTrip(JSON.parse(JSON.stringify(RT.SAMPLE)));
  RT.blankTrip = (from) => RT.normalizeTrip({
    name: 'New road trip', travelers: 2,
    currency: from?.currency, vehicle: from?.vehicle, mapStyle: from?.mapStyle, showStyle: from?.showStyle,
  });

  // ---------- Money ----------
  RT.convert = (eur, currency) => eur * (RT.rates[currency] ?? 1);
  RT.money = (n, currency, exact) => {
    const small = exact || Math.abs(n) < 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency', currency,
        minimumFractionDigits: small && n % 1 ? 2 : 0,
        maximumFractionDigits: small ? 2 : 0,
      }).format(n);
    } catch {
      return `${Math.round(n)} ${currency}`;
    }
  };

  // ---------- Fuel prices ----------
  /** Fuel price (trip currency per L or kWh) for one country, with where it came from. */
  RT.countryPrice = (t, country) => {
    const type = RT.FUEL_TYPES[t.vehicle.fuelType];
    if (t.fuelPricing === 'manual') return { price: t.vehicle.fuelPrice, source: 'manual' };
    if (country && t.priceOverrides[country] != null) return { price: t.priceOverrides[country], source: 'yours' };
    const row = RT.COUNTRY_FUEL[country];
    const eur = row?.[type.col + 1];
    if (eur != null) return { price: RT.convert(eur, t.currency), source: 'average' };
    return { price: t.vehicle.fuelPrice, source: 'fallback' };
  };

  /** Countries visited by the trip, in order of first appearance. */
  RT.tripCountries = t => [...new Set(t.stops.map(s => s.country).filter(Boolean))];

  /** Price used for a drive between two stops: if it crosses a border, the average of both countries. */
  RT.legPrice = (t, a, b) => {
    const pa = RT.countryPrice(t, a.country).price;
    const pb = RT.countryPrice(t, b.country).price;
    return (pa + pb) / 2;
  };

  // ---------- Days ----------
  /** Builds the full plan: one entry per day, with drives, visits and where you sleep. */
  RT.buildPlan = (t, legs, returnLeg) => {
    const s = t.stops;
    const arrivals = [];
    let d = 1;
    s.forEach(st => { arrivals.push(d); d += st.nights; });
    const last = s[s.length - 1];
    let total = last ? arrivals[arrivals.length - 1] + last.nights : 0;
    if (last && returnLeg && total < 1) total = 1;
    total = Math.max(total, s.length ? 1 : 0);

    const days = Array.from({ length: total }, (_, k) => ({ day: k + 1, drives: [], visits: [], stay: null, sleep: null, departure: false }));
    s.forEach((st, i) => {
      const a = arrivals[i];
      const day = days[a - 1];
      if (i > 0 && legs[i]) day.drives.push({ leg: legs[i], from: s[i - 1], to: st, i });
      day.visits.push(i);
      for (let k = 0; k < st.nights; k++) days[a - 1 + k].sleep = i;
      for (let k = 1; k < st.nights; k++) days[a - 1 + k].stay = i;
    });
    if (returnLeg && last) days[total - 1].drives.push({ leg: returnLeg, from: last, to: s[0], i: 'return' });
    if (last && last.nights > 0 && !returnLeg) days[total - 1].departure = true;

    // Colour per driving day, in fixed order (max 8 hues, then one shared colour)
    let drivingDay = 0;
    const drivingDays = days.filter(x => x.drives.length).length;
    days.forEach(x => {
      x.color = null;
      if (x.drives.length) {
        x.color = drivingDays <= RT.DAY_COLORS.length ? RT.DAY_COLORS[drivingDay] : RT.DAY_COLORS[0];
        drivingDay++;
      }
      // The place that represents the day (photo, weather)
      const lastVisit = x.visits[x.visits.length - 1];
      x.main = x.stay ?? lastVisit ?? x.sleep ?? (x.departure ? s.length - 1 : null);
      x.where = x.sleep ?? lastVisit ?? x.main;
      x.km = sum(x.drives, v => v.leg.km);
      x.min = sum(x.drives, v => v.leg.min);
    });
    return { arrivals, days };
  };

  RT.dayDate = (t, day, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => {
    if (!t.startDate) return '';
    const d = new Date(t.startDate + 'T12:00:00');
    if (isNaN(d)) return '';
    d.setDate(d.getDate() + day - 1);
    return d.toLocaleDateString(undefined, opts);
  };
  RT.dayISO = (t, day) => {
    const d = new Date(t.startDate + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + day - 1);
    return d.toISOString().slice(0, 10);
  };

  RT.dayTitle = (t, x) => {
    const s = t.stops;
    if (x.drives.length) {
      const names = [x.drives[0].from.name, ...x.drives.map(v => v.to.name)];
      return names.length > 3 ? `${names[0]} → ${names[names.length - 1]}` : names.join(' → ');
    }
    if (x.departure) return `Last morning in ${s[s.length - 1].name}`;
    if (x.stay != null) return `A full day in ${s[x.stay].name}`;
    if (x.visits.length) return `Starting in ${s[x.visits[0]].name}`;
    return 'Free day';
  };

  // ---------- Totals ----------
  RT.stopCost = s => sum(s.costs, c => c.amount);
  RT.driveCost = (t, v) => v.leg.km * t.vehicle.consumption / 100 * RT.legPrice(t, v.from, v.to);

  RT.computeStats = (t, legs, returnLeg) => {
    const plan = RT.buildPlan(t, legs, returnLeg);
    const drives = plan.days.flatMap(d => d.drives);
    const km = sum(drives, v => v.leg.km);
    const min = sum(drives, v => v.leg.min);
    const fuelUnits = km * t.vehicle.consumption / 100;
    const fuelCost = sum(drives, v => RT.driveCost(t, v));
    const byCat = Object.fromEntries(Object.keys(RT.CATS).map(k => [k, 0]));
    [...t.extraCosts, ...t.stops.flatMap(x => x.costs)].forEach(c => { byCat[c.category] += c.amount; });
    const other = sum(Object.values(byCat), x => x);
    const total = fuelCost + other;
    return {
      ...plan, drives, km, min, fuelUnits, fuelCost, byCat, other, total,
      perPerson: total / Math.max(1, t.travelers),
      nights: sum(t.stops, x => x.nights),
      approx: drives.some(v => v.leg.approx),
      avgPrice: fuelUnits ? fuelCost / fuelUnits : 0,
    };
  };

  // ---------- Formatting ----------
  RT.fmtKm = km => `${Math.round(km).toLocaleString()} km`;
  RT.fmtDur = min => {
    const m = Math.round(min);
    const h = Math.floor(m / 60);
    return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
  };
  RT.plural = (n, w, ws) => `${n} ${n === 1 ? w : (ws || w + 's')}`;
  RT.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RT.safeImg = u => /^(https?:\/\/|data:image\/)/i.test(String(u || '').trim()) ? String(u).trim() : '';
  RT.timeOf = isoStr => (isoStr ? isoStr.slice(11, 16) : '');
})(window.RT);
