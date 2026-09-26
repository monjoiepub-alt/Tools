# 🧰 Tools

## 🚐 Roadtrip Planner — [`roadtrip/`](roadtrip/)

A reusable road trip planner that runs in the browser. There is nothing to install and no account.

### What it does

| Part | What you get |
|---|---|
| 🗺️ **Beautiful maps** | 6 map styles: Relief (with hill shading), Classic, Satellite, Outdoor (topographic), Light and Night. Stops appear as round **photo pins**, and each driving day has its own colour. |
| 📸 **Automatic photos & descriptions** | When you add a place, the app finds a photo and a short description on Wikipedia. You can always write your own. |
| ⛽ **Local fuel prices** | It detects which country each stop is in and uses that country's average fuel price (petrol, diesel, LPG or EV charging, for ~70 countries). A drive that crosses a border uses the average of both countries. You can type the real pump price for any country. |
| 💱 **Any currency** | The budget can be in EUR, JPY, TWD, USD, SEK… with live exchange rates (European Central Bank). Changing the currency converts all amounts. |
| 🗓️ **Day-by-day plan** | A timeline with dates, drives (km, time, fuel cost, Google Maps directions), stops, free days, where you sleep, and spending per day. |
| 🌤️ **Weather** | The forecast when the day is less than about 2 weeks away. Otherwise the weather on the same day last year, as a guide. Includes sunrise and sunset (and midnight sun ☀️). |
| 💶 **Budget** | Total, per person, per day, fuel prices along the way, a chart of where the money goes, and a day-by-day table. |
| ▶️ **Automatic presentation** | Full screen and plays by itself: cover with photos → route overview → **one slide per day** (the map flies there and a 🚐 drives along the day's route; photo, weather, things to do, where you sleep) → budget → finale. |
| ♻️ **Reusable** | Keep as many trips as you like. Duplicate, export / import `.json`, copy a share link, print / save as PDF. |

### How to use it

1. Open `roadtrip/index.html` in a browser (or the GitHub Pages link, see below).
2. **⚙️ Settings**: name, start date, travellers, car, fuel prices, currency.
3. **📍 Stops**: search places and add them in order. Set how many nights you stay at each. Photos and descriptions fill in by themselves.
4. **🗓️ Plan** and **💶 Budget** update by themselves.
5. Press **▶ Present the trip**. Keys: `←` `→` to move, `space` to pause, `Esc` to close.

Trips are saved automatically in your browser. Use **⋯ More → Export** to make a backup or to move a trip to another device.

### Put it online (free)

GitHub repo → **Settings → Pages** → Source: *Deploy from a branch* → pick the branch and `/ (root)` → Save.
The planner will then be at `https://<user>.github.io/<repo>/roadtrip/`.

### About the fuel prices

There is no free worldwide service with live pump prices, so the app includes **national average prices (2026 estimates)**
in [`roadtrip/js/data.js`](roadtrip/js/data.js). They are good for budgeting, but real prices change every week and differ
between stations. Type the real price in **Settings → Fuel prices** when you know it. To update the table, edit `RT.COUNTRY_FUEL`.

### Services used (all free, no API keys)

| What | Service |
|---|---|
| Map tiles | © OpenStreetMap contributors, © CARTO, © Esri (satellite, hillshade), © OpenTopoMap |
| Road distances | [OSRM](https://project-osrm.org/) (fallback: routing.openstreetmap.de). If both fail, a straight-line estimate marked `~` |
| Place search & country | [Nominatim](https://nominatim.org/) (OpenStreetMap) |
| Photos & descriptions | [Wikipedia](https://en.wikipedia.org/) |
| Weather | [Open-Meteo](https://open-meteo.com/) |
| Exchange rates | [Frankfurter](https://frankfurter.dev/) (European Central Bank) |
| Map library | [Leaflet](https://leafletjs.com/) |

### Code layout

```
roadtrip/
├── index.html
├── css/style.css      planner look
├── css/present.css    presentation look
└── js/
    ├── data.js        fuel prices, currencies, map styles, example trip
    ├── services.js    online services + caching
    ├── model.js       days, distances, fuel & budget maths
    ├── app.js         the planner screens
    └── present.js     the day-by-day presentation
```
