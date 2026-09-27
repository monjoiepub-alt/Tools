/* Shared by settlement.html (the score) and index.html (the cost calculator).
   Scores are 1–10. Weights can be changed on the score page; they are saved under SETTLE_KEY. */
var SETTLE_KEY = "dream-life-settle-v1";

var SETTLE_CRITERIA = [
  { key: "housing",     label: "Buy property (cheap fixer-upper)", short: "Property",   weight: 5 },
  { key: "green",       label: "Green mountains",                  short: "Green",      weight: 4 },
  { key: "outdoor",     label: "Ski / via ferrata / canyon",       short: "Outdoor",    weight: 4 },
  { key: "paperwork",   label: "Paperwork / residency",            short: "Paperwork",  weight: 4 },
  { key: "language",    label: "Language barrier",                 short: "Language",   weight: 3 },
  { key: "tourism",     label: "Guiding tourism",                  short: "Tourism",    weight: 3 },
  { key: "remote",      label: "Remote + connected",               short: "Remote",     weight: 3 },
  { key: "business",    label: "Business potential",               short: "Business",   weight: 3 },
  { key: "vanlife",     label: "Van life",                         short: "Van life",   weight: 2 },
  { key: "buyingpower", label: "Buying power",                     short: "Buying",     weight: 2 },
  { key: "travel",      label: "Travel access",                    short: "Travel",     weight: 2 },
  { key: "healthcare",  label: "Healthcare",                       short: "Health",     weight: 1 }
];

/* calc: the country code of this place in the cost calculator (only 5 places have full cost data) */
var SETTLE_PLACES = [
  { id: "slovenia", name: "Slovenia", flag: "🇸🇮", note: "Best all-rounder",
    citizenship: { years: "10 yrs", dual: false, spouse: false, note: "10 years standard. Naturalised citizens must usually give up their Belgian passport. No dual nationality." },
    scores: { housing: 7, green: 9, outdoor: 9, paperwork: 8, language: 6, tourism: 7, remote: 8, business: 6, vanlife: 8, buyingpower: 8, travel: 7, healthcare: 8 },
    comments: "A rural house in the Soča valley or near Kranjska Gora is tight but doable on a small budget. EU rights straight away as a Belgian. The Julian Alps are lush and green. World-class canyoning on the Soča, via ferrata on Triglav, skiing at Kranjska Gora. Citizenship after 10 years means giving up the Belgian passport." },

  { id: "pyrenees", name: "French Pyrenees", flag: "🇫🇷", note: "Language + dual citizenship",
    citizenship: { years: "5 yrs", dual: true, spouse: false, note: "5 years standard, and from 2026 French at B2 level. France allows dual citizenship, so you keep your Belgian passport. Your wife can apply after 5 years of residence." },
    scores: { housing: 6, green: 9, outdoor: 8, paperwork: 7, language: 9, tourism: 8, remote: 7, business: 5, vanlife: 7, buyingpower: 6, travel: 8, healthcare: 9 },
    comments: "Fixer-uppers exist in rural Ariège with patient searching. Your French removes all friction. Green and lush. Excellent canyoning, solid via ferrata. The guiding market is structured and well paid, but only with French state diplomas (canyon DE, mountain leader AMM, ski instructor), which lowers business potential until you have them. Wife gets EU spouse residency through you.",
    fixed: "Business 6 → 5: paid guiding in France needs French state diplomas. Citizenship: B2 French required from 2026." },

  { id: "alps", name: "French Alps (Vercors/Chartreuse)", flag: "🇫🇷", note: "Best outdoor, budget blocker", calc: "fr",
    citizenship: { years: "5 yrs", dual: true, spouse: false, note: "5 years, and from 2026 French at B2 level. France allows dual citizenship. Your wife can apply after 5 years of residence." },
    scores: { housing: 3, green: 10, outdoor: 9, paperwork: 7, language: 9, tourism: 9, remote: 7, business: 4, vanlife: 6, buyingpower: 5, travel: 8, healthcare: 9 },
    comments: "Even fixer-uppers near Grenoble and the Chartreuse are expensive; the Drôme side of the Vercors and the Trièves are the cheaper corners. Vercors and Chartreuse are THE green mountain look. Best canyoning and via ferrata in France. Your French is a full asset. Guiding for money needs French state diplomas, so business potential depends on getting them.",
    fixed: "Business 5 → 4: paid guiding in France needs French state diplomas. Citizenship: B2 French required from 2026." },

  { id: "romania", name: "Romania (Transylvania)", flag: "🇷🇴", note: "Cheapest EU, early mover",
    citizenship: { years: "8 yrs", dual: true, spouse: false, note: "8 years standard. Romania allows dual citizenship, so you keep your Belgian passport. Your wife can apply after 8 years." },
    scores: { housing: 10, green: 9, outdoor: 6, paperwork: 8, language: 5, tourism: 5, remote: 8, business: 6, vanlife: 9, buyingpower: 10, travel: 6, healthcare: 6 },
    comments: "A large house with land in Transylvania is affordable. EU rights immediately. The Carpathians are deeply green. Via ferrata and canyoning exist but are underdeveloped: an early-mover guiding opportunity." },

  { id: "bulgaria", name: "Bulgaria (Rila/Rhodopes)", flag: "🇧🇬", note: "Cheapest EU",
    citizenship: { years: "5 yrs", dual: false, spouse: false, note: "5 years standard. Bulgaria generally doesn't allow dual nationality for naturalised citizens. Exceptions for EU citizens are uncertain." },
    scores: { housing: 10, green: 8, outdoor: 6, paperwork: 8, language: 3, tourism: 4, remote: 8, business: 4, vanlife: 9, buyingpower: 10, travel: 6, healthcare: 5 },
    comments: "Cheapest EU property market. Rila and the Rhodopes are green and beautiful. EU rights fully. Cyrillic script is real daily friction. Guiding tourism very limited. Weakest healthcare on the list." },

  { id: "nagano", name: "Japan (Nagano rural)", flag: "🇯🇵", note: "Akiya + spouse visa", calc: "jp",
    citizenship: { years: "3+1 yrs*", dual: false, spouse: true, note: "Simplified naturalisation: 3 years married + 1 year living in Japan. But Japan doesn't allow dual nationality: you'd give up your Belgian passport and EU rights. Most foreigners keep permanent residency instead." },
    scores: { housing: 10, green: 8, outdoor: 7, paperwork: 8, language: 5, tourism: 7, remote: 7, business: 7, vanlife: 4, buyingpower: 8, travel: 6, healthcare: 9 },
    comments: "Habitable akiya from the town's akiya bank for ¥0.5–5M, with renovation grants of ¥1–5M in many towns. The spouse visa gives full work rights, and your wife handles the paperwork. The weak yen means strong buying power. No national licence is needed to guide, and canyoning is growing fast. Land classed as farmland needs permission from the agricultural committee and must be farmed, so a horse field isn't simple. Mortgages for foreigners usually need your wife as co-borrower.",
    fixed: "Added: farmland permission rule and mortgage conditions." },

  { id: "hakuba", name: "Japan (Hakuba/Nozawa)", flag: "🇯🇵", note: "Spouse visa + ski resort",
    citizenship: { years: "3+1 yrs*", dual: false, spouse: true, note: "Same as rural Japan: 3 years married + 1 year in Japan. No dual nationality. Most foreigners stay on permanent residency instead." },
    scores: { housing: 7, green: 7, outdoor: 8, paperwork: 8, language: 6, tourism: 8, remote: 6, business: 7, vanlife: 3, buyingpower: 6, travel: 6, healthcare: 8 },
    comments: "Spouse visa gives full work rights. Strong English-speaking ski tourism: a real guiding market. Akiya exist near the resorts but cost more. Van life is hardest here because parking rules are strict. Same citizenship trap as rural Japan." },

  { id: "akaslompolo", name: "Finland (Äkäslompolo)", flag: "🇫🇮", note: "Business case + network", calc: "fi",
    citizenship: { years: "8 yrs (5*)", dual: true, spouse: false, note: "Since 1 October 2024: 8 years, or 5 years if you pass the Finnish or Swedish language test. Finland allows dual citizenship. Your wife: same rules." },
    scores: { housing: 7, green: 6, outdoor: 5, paperwork: 9, language: 7, tourism: 6, remote: 8, business: 9, vanlife: 7, buyingpower: 5, travel: 6, healthcare: 9 },
    comments: "Houses in the village itself are pricey (~€4,700/m²), so look outside it. Heating and running costs in Lapland winters are high. EU rights straight away. Rolling forested fells: no via ferrata or canyoning. But a Japanese-focused aurora and summer camp using your wife's network is a genuinely strong niche, and you already have guiding experience here. No legal diploma needed to guide.",
    fixed: "Citizenship 4–7 → 8 years (5 with language test), law changed 1 October 2024." },

  { id: "jamtland", name: "Sweden (Jämtland / Åre)", flag: "🇸🇪", note: "Real skiing, cheap countryside", calc: "se",
    citizenship: { years: "8 yrs", dual: true, spouse: false, note: "Since 6 June 2026: 8 years, plus Swedish language, civics and minimum income tests. Sweden allows dual citizenship." },
    scores: { housing: 7, green: 7, outdoor: 6, paperwork: 8, language: 9, tourism: 6, remote: 7, business: 5, vanlife: 8, buyingpower: 6, travel: 7, healthcare: 9 },
    comments: "Åre is Scandinavia's biggest ski resort with a top bike park, and rural Jämtland houses are cheap. EU rights, English everywhere, easy paperwork for your wife. No canyoning, and the nearest serious via ferrata is at Höga Kusten (~4 h). No legal diploma needed to guide.",
    fixed: "Region changed from Western Sweden to Jämtland/Åre to match the cost calculator: outdoor 4 → 6, tourism 4 → 6, business 4 → 5, housing 6 → 7. Citizenship 5 → 8 years (new law 6 June 2026)." },

  { id: "norway_n", name: "Northern Norway", flag: "🇳🇴", note: "Epic but expensive",
    citizenship: { years: "8 yrs (6*)", dual: true, spouse: false, note: "8 years, or 6 with a good income. Norwegian language test. Norway allows dual citizenship since 2020." },
    scores: { housing: 5, green: 5, outdoor: 7, paperwork: 7, language: 7, tourism: 6, remote: 9, business: 4, vanlife: 5, buyingpower: 3, travel: 5, healthcare: 9 },
    comments: "Norway isn't in the EU but it is in the EEA: as a Belgian you just register, and your wife gets an EEA family residence card. Very expensive. Arctic landscape, not green and lush. Winter van life is brutal. Great for a working season, harder as a base.",
    fixed: "Paperwork 4 → 7: EEA free movement applies to you, and your wife as your spouse. Citizenship 7 → 8 years (6 with income)." },

  { id: "norway_s", name: "Southern Norway (Valdres/Hallingdal)", flag: "🇳🇴", note: "Greener but still pricey", calc: "no",
    citizenship: { years: "8 yrs (6*)", dual: true, spouse: false, note: "8 years, or 6 with a good income. Norwegian language test. Norway allows dual citizenship since 2020." },
    scores: { housing: 5, green: 7, outdoor: 7, paperwork: 7, language: 7, tourism: 6, remote: 7, business: 4, vanlife: 6, buyingpower: 3, travel: 6, healthcare: 9 },
    comments: "EEA free movement: register as a Belgian, EEA family card for your wife. More connected and greener than the north. Still very expensive, and savings go fast. Old farmhouses (småbruk) to renovate are the affordable way in. Canyoning around Voss.",
    fixed: "Paperwork 4 → 7 (EEA free movement). Citizenship 7 → 8 years (6 with income)." },

  { id: "nz", name: "New Zealand (South Island)", flag: "🇳🇿", note: "Dream, not realistic",
    citizenship: { years: "5 yrs", dual: true, spouse: false, note: "5 years of permanent residency, then citizenship. Dual citizenship allowed. Getting residency in the first place is the hard part for both of you." },
    scores: { housing: 5, green: 10, outdoor: 10, paperwork: 3, language: 10, tourism: 8, remote: 7, business: 5, vanlife: 10, buyingpower: 6, travel: 2, healthcare: 8 },
    comments: "Van life paradise, incredible outdoors, English, dual citizenship allowed. But neither of you has a right to live there beyond the working holiday. Flights back to Europe or Japan take 24 h+. A dream destination for your working holiday, not a realistic base." },

  { id: "georgia", name: "Georgia (Caucasus)", flag: "🇬🇪", note: "Cheapest wild card",
    citizenship: { years: "10 yrs", dual: false, spouse: false, note: "10 years standard. Georgia doesn't recognise dual citizenship in most cases." },
    scores: { housing: 9, green: 8, outdoor: 7, paperwork: 6, language: 4, tourism: 5, remote: 8, business: 5, vanlife: 8, buyingpower: 9, travel: 5, healthcare: 5 },
    comments: "Large property with land for little money. Belgians get 1 year visa-free. The Caucasus is lush and dramatic. Not EU, so your wife needs separate arrangements. The language is completely unfamiliar. Healthcare is weak and the guiding market is young." },

  { id: "tahoe", name: "USA West (Lake Tahoe)", flag: "🇺🇸", note: "Dream destination only",
    citizenship: { years: "5 yrs*", dual: true, spouse: false, note: "5 years after a green card. Dual citizenship allowed. Getting the green card is the near-impossible part without an employer or a large investment." },
    scores: { housing: 1, green: 8, outdoor: 9, paperwork: 1, language: 10, tourism: 8, remote: 6, business: 3, vanlife: 6, buyingpower: 4, travel: 7, healthcare: 4 },
    comments: "Neither of you has a path to live there: 90 days on ESTA, no straightforward visa without an employer or an $800k+ investment. Median house in Tahoe ~$700k+. A holiday destination, not a settlement option." }
];

function settleWeights() {
  var w = {};
  SETTLE_CRITERIA.forEach(function (c) { w[c.key] = c.weight; });
  try {
    var saved = JSON.parse(localStorage.getItem(SETTLE_KEY));
    if (saved && saved.weights) Object.keys(saved.weights).forEach(function (k) { if (k in w) w[k] = saved.weights[k]; });
  } catch (e) {}
  return w;
}
function settleScore(place, weights) {
  var total = 0, max = 0;
  SETTLE_CRITERIA.forEach(function (c) {
    var wt = weights[c.key] || 0;
    total += (place.scores[c.key] || 0) * wt;
    max += 10 * wt;
  });
  return max ? Math.round(total / max * 100) : 0;
}
