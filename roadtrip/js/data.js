/* Static data: fuel prices, currencies, map styles, colours, example trip. */
window.RT = window.RT || {};
(RT => {
  'use strict';

  RT.CATS = {
    stay: { icon: '🛏️', label: 'Accommodation' },
    food: { icon: '🍽️', label: 'Food' },
    activity: { icon: '🎟️', label: 'Activities' },
    transport: { icon: '⛴️', label: 'Transport & tolls' },
    other: { icon: '📦', label: 'Other' },
  };

  RT.FUEL_TYPES = {
    petrol: { label: 'Petrol', icon: '⛽', unit: 'L', col: 0, hint: 'Typical: small car 5–6 L, family car 6–8 L, van / camper 9–12 L per 100 km.' },
    diesel: { label: 'Diesel', icon: '⛽', unit: 'L', col: 1, hint: 'Typical: small car 4–5 L, family car 5–7 L, van / camper 8–11 L per 100 km.' },
    lpg: { label: 'LPG', icon: '⛽', unit: 'L', col: 2, hint: 'LPG cars usually burn about 20% more litres than on petrol.' },
    electric: { label: 'Electric', icon: '🔌', unit: 'kWh', col: 3, hint: 'Typical: 15–22 kWh per 100 km (up to 30% more in cold weather). Prices are for public chargers.' },
  };

  // Approximate national average pump prices, in EUR per litre (per kWh for public EV charging).
  // [name, petrol, diesel, lpg, electricity]. null = no reliable figure → falls back to your own price.
  // These are ballpark 2025–26 averages to make the budget realistic. Prices change weekly:
  // every country can be overridden in the Trip tab.
  RT.PRICES_UPDATED = '2026';
  RT.COUNTRY_FUEL = {
    al: ['Albania', 1.75, 1.70, 0.75, 0.40],
    ad: ['Andorra', 1.40, 1.30, null, 0.35],
    at: ['Austria', 1.60, 1.60, 1.00, 0.55],
    ba: ['Bosnia & Herzegovina', 1.45, 1.45, 0.70, 0.35],
    be: ['Belgium', 1.70, 1.75, 0.70, 0.55],
    bg: ['Bulgaria', 1.30, 1.30, 0.60, 0.40],
    by: ['Belarus', 0.75, 0.80, 0.35, 0.20],
    ch: ['Switzerland', 1.85, 1.90, 1.20, 0.60],
    cy: ['Cyprus', 1.45, 1.50, null, 0.50],
    cz: ['Czechia', 1.50, 1.45, 0.70, 0.45],
    de: ['Germany', 1.75, 1.65, 0.95, 0.55],
    dk: ['Denmark', 1.90, 1.70, null, 0.50],
    ee: ['Estonia', 1.65, 1.55, 0.80, 0.40],
    es: ['Spain', 1.55, 1.48, 0.95, 0.45],
    fi: ['Finland', 1.85, 1.75, null, 0.40],
    fr: ['France', 1.80, 1.70, 1.00, 0.50],
    gb: ['United Kingdom', 1.65, 1.72, 0.95, 0.75],
    gr: ['Greece', 1.85, 1.60, 1.00, 0.55],
    hr: ['Croatia', 1.50, 1.45, 0.80, 0.45],
    hu: ['Hungary', 1.55, 1.55, 0.80, 0.45],
    ie: ['Ireland', 1.80, 1.75, 1.00, 0.60],
    is: ['Iceland', 2.10, 2.00, null, 0.35],
    it: ['Italy', 1.80, 1.70, 0.75, 0.60],
    li: ['Liechtenstein', 1.80, 1.85, null, 0.55],
    lt: ['Lithuania', 1.50, 1.45, 0.75, 0.40],
    lu: ['Luxembourg', 1.55, 1.45, 0.85, 0.45],
    lv: ['Latvia', 1.60, 1.55, 0.80, 0.40],
    md: ['Moldova', 1.25, 1.15, 0.65, 0.30],
    me: ['Montenegro', 1.55, 1.45, 0.90, 0.35],
    mk: ['North Macedonia', 1.40, 1.30, 0.65, 0.35],
    mt: ['Malta', 1.34, 1.21, null, 0.45],
    nl: ['Netherlands', 2.00, 1.75, 0.95, 0.55],
    no: ['Norway', 2.00, 1.90, null, 0.45],
    pl: ['Poland', 1.45, 1.45, 0.70, 0.50],
    pt: ['Portugal', 1.75, 1.65, 0.95, 0.45],
    ro: ['Romania', 1.45, 1.50, 0.70, 0.45],
    rs: ['Serbia', 1.55, 1.60, 0.80, 0.35],
    se: ['Sweden', 1.70, 1.75, null, 0.50],
    si: ['Slovenia', 1.50, 1.50, 0.80, 0.45],
    sk: ['Slovakia', 1.60, 1.50, 0.75, 0.45],
    tr: ['Türkiye', 1.30, 1.30, 0.70, 0.30],
    ua: ['Ukraine', 1.25, 1.20, 0.65, 0.20],
    ma: ['Morocco', 1.30, 1.15, null, 0.30],
    tn: ['Tunisia', 0.75, 0.65, null, null],
    eg: ['Egypt', 0.40, 0.35, null, null],
    ae: ['United Arab Emirates', 0.70, 0.75, null, 0.20],
    il: ['Israel', 1.90, 1.80, null, 0.50],
    us: ['United States', 0.90, 0.95, 0.80, 0.40],
    ca: ['Canada', 1.10, 1.20, 0.70, 0.35],
    mx: ['Mexico', 1.25, 1.30, 0.55, 0.35],
    br: ['Brazil', 1.05, 1.00, null, 0.40],
    ar: ['Argentina', 1.10, 1.05, null, null],
    cl: ['Chile', 1.30, 1.00, null, 0.40],
    au: ['Australia', 1.20, 1.25, 0.60, 0.40],
    nz: ['New Zealand', 1.50, 1.20, null, 0.40],
    jp: ['Japan', 1.10, 0.95, 0.65, 0.35],
    kr: ['South Korea', 1.10, 1.00, 0.65, 0.25],
    tw: ['Taiwan', 0.90, 0.80, 0.40, 0.25],
    cn: ['China', 1.00, 0.90, null, 0.20],
    th: ['Thailand', 1.00, 0.85, 0.55, 0.20],
    vn: ['Vietnam', 0.80, 0.75, null, null],
    my: ['Malaysia', 0.50, 0.55, null, 0.25],
    id: ['Indonesia', 0.60, 0.65, null, null],
    ph: ['Philippines', 1.00, 0.90, null, null],
    in: ['India', 1.15, 1.00, 0.65, 0.20],
    za: ['South Africa', 1.10, 1.05, null, 0.35],
    na: ['Namibia', 1.00, 1.00, null, null],
    ke: ['Kenya', 1.35, 1.25, null, null],
  };

  RT.flag = code => code && code.length === 2
    ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
    : '🏳️';

  // Currencies offered in the Trip tab. Rates come live from the ECB (Frankfurter API);
  // these static rates (1 EUR = x) are only a fallback when offline.
  RT.CURRENCIES = {
    EUR: 1, USD: 1.10, GBP: 0.85, JPY: 165, TWD: 35, CHF: 0.94, SEK: 11.2, NOK: 11.7, DKK: 7.46,
    PLN: 4.25, CZK: 25, HUF: 395, RON: 5.0, BGN: 1.96, ISK: 150, TRY: 42, CAD: 1.52, AUD: 1.68,
    NZD: 1.85, KRW: 1520, CNY: 7.9, THB: 38, INR: 95, ZAR: 20, MXN: 21, BRL: 6.2,
  };

  // Map styles. All free and key-less.
  const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const CARTO = `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`;
  const ESRI = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';
  RT.MAP_STYLES = {
    relief: {
      label: 'Relief', icon: '⛰️',
      layers: [
        { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attr: CARTO, subdomains: 'abcd', maxZoom: 19 },
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', attr: `${ESRI} (hillshade)`, maxNativeZoom: 16, maxZoom: 19, className: 'tiles-hillshade' },
      ],
    },
    voyager: {
      label: 'Classic', icon: '🗺️',
      layers: [{ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attr: CARTO, subdomains: 'abcd', maxZoom: 19 }],
    },
    satellite: {
      label: 'Satellite', icon: '🛰️',
      layers: [
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: `${ESRI}, Maxar, Earthstar Geographics`, maxNativeZoom: 18, maxZoom: 19 },
        { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', attr: '', maxNativeZoom: 18, maxZoom: 19 },
      ],
    },
    outdoor: {
      label: 'Outdoor', icon: '🥾',
      layers: [{ url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: `${OSM}, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>`, subdomains: 'abc', maxNativeZoom: 17, maxZoom: 19 }],
    },
    light: {
      label: 'Light', icon: '🤍',
      layers: [{ url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: CARTO, subdomains: 'abcd', maxZoom: 19 }],
    },
    dark: {
      label: 'Night', icon: '🌙',
      layers: [{ url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: CARTO, subdomains: 'abcd', maxZoom: 19 }],
    },
  };

  // Day colours: validated 8-hue categorical palette, always assigned in this fixed order.
  // More than 8 driving days → the route falls back to one colour (days stay labelled).
  RT.DAY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

  // WMO weather codes (Open-Meteo)
  RT.WEATHER = {
    0: ['☀️', 'Clear sky'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Cloudy'],
    45: ['🌫️', 'Fog'], 48: ['🌫️', 'Freezing fog'],
    51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'],
    56: ['🌧️', 'Freezing drizzle'], 57: ['🌧️', 'Freezing drizzle'],
    61: ['🌦️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
    66: ['🌧️', 'Freezing rain'], 67: ['🌧️', 'Freezing rain'],
    71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'],
    80: ['🌦️', 'Rain showers'], 81: ['🌧️', 'Rain showers'], 82: ['⛈️', 'Violent showers'],
    85: ['🌨️', 'Snow showers'], 86: ['❄️', 'Heavy snow showers'],
    95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm & hail'], 99: ['⛈️', 'Thunderstorm & hail'],
  };

  RT.SAMPLE = {
    name: 'Finland: South to Lapland',
    subtitle: 'Old towns, lakes, forests and the Arctic Circle',
    startDate: '2027-06-14',
    travelers: 3,
    currency: 'EUR',
    fuelPricing: 'auto',
    vehicle: { name: 'Rental car', fuelType: 'petrol', consumption: 6.5, fuelPrice: 1.85 },
    extraCosts: [
      { category: 'transport', label: 'Car rental (9 days)', amount: 480 },
      { category: 'transport', label: 'One-way drop-off fee', amount: 150 },
    ],
    stops: [
      {
        name: 'Helsinki', lat: 60.1699, lng: 24.9384, nights: 1, country: 'fi', wikiTitle: 'Helsinki',
        description: 'We start in the capital: pick up the car, stock up on snacks and enjoy the harbour before hitting the road.',
        activities: ['Market Square and the Old Market Hall', 'Ferry to the Suomenlinna sea fortress', 'Evening sauna and sea dip at Löyly'],
        costs: [{ category: 'stay', label: 'Hostel', amount: 95 }, { category: 'activity', label: 'Suomenlinna ferry', amount: 18 }, { category: 'food', label: 'Dinner', amount: 60 }],
      },
      {
        name: 'Porvoo', lat: 60.3932, lng: 25.6650, nights: 0, country: 'fi', wikiTitle: 'Porvoo',
        description: 'A short hop east to one of Finland’s oldest towns, with wooden houses and red riverside storehouses.',
        activities: ['Walk the cobbled Old Town', 'Photo of the red shore houses from the bridge', 'Coffee and a Runeberg cake'],
        costs: [{ category: 'food', label: 'Lunch & coffee', amount: 45 }],
      },
      {
        name: 'Savonlinna', lat: 61.8687, lng: 28.8867, nights: 1, country: 'fi', wikiTitle: 'Olavinlinna',
        description: 'Into the Lakeland! A medieval castle sits on a rocky island in the middle of Lake Saimaa.',
        activities: ['Guided tour of Olavinlinna Castle', 'Evening lake cruise on Saimaa', 'Try a local lörtsy pastry at the market'],
        costs: [{ category: 'stay', label: 'Guesthouse', amount: 110 }, { category: 'activity', label: 'Castle + cruise', amount: 75 }],
      },
      {
        name: 'Koli National Park', lat: 63.0966, lng: 29.8067, nights: 2, country: 'fi', wikiTitle: 'Koli National Park',
        description: 'The classic Finnish national landscape: forested hills rising above Lake Pielinen. Our outdoor base for two nights.',
        activities: ['Sunrise hike up Ukko-Koli', 'Canoe trip on Lake Pielinen', 'Campfire and sausages at a lean-to (laavu)', 'Smoke sauna at the cottage'],
        costs: [{ category: 'stay', label: 'Cottage (2 nights)', amount: 220 }, { category: 'activity', label: 'Canoe rental', amount: 60 }, { category: 'food', label: 'Groceries', amount: 70 }],
      },
      {
        name: 'Oulu', lat: 65.0121, lng: 25.4651, nights: 1, country: 'fi', wikiTitle: 'Oulu',
        description: 'Crossing the country to the Gulf of Bothnia. A relaxed student city with great cycling paths.',
        activities: ['Market square and the Toripolliisi statue', 'Rent city bikes to Nallikari beach', 'Sunset at the seaside'],
        costs: [{ category: 'stay', label: 'Hotel', amount: 105 }, { category: 'food', label: 'Dinner', amount: 55 }],
      },
      {
        name: 'Rovaniemi', lat: 66.5039, lng: 25.7294, nights: 2, country: 'fi', wikiTitle: 'Rovaniemi',
        description: 'Finish line on the Arctic Circle! In June the sun never sets here, perfect for late-night hikes.',
        activities: ['Cross the Arctic Circle line', 'Arktikum museum about Arctic life', 'Midnight-sun hike on Ounasvaara', 'Reindeer farm visit'],
        costs: [{ category: 'stay', label: 'Log cabin (2 nights)', amount: 240 }, { category: 'activity', label: 'Arktikum + reindeer farm', amount: 95 }],
      },
    ],
  };
})(window.RT);
