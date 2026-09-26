# 🧰 Tools

## 🚐 Roadtrip Planner — [`roadtrip/`](roadtrip/)

A reusable road trip planner that runs in the browser. There is nothing to install and no account.

### What it does

| Part | What you get |
|---|---|
| 🗺️ **Map** | Numbered pins for every stop, with the real road route drawn between them. Drag a pin to move a stop. |
| 📍 **Stops** | Search any place (or click on the map). Each stop has nights, a description, "things to do", a photo link and costs. |
| 🗓️ **Plan** | Automatic day-by-day itinerary with dates, driving km and time per leg, free days, plus "Open in Google Maps" links. |
| 💶 **Costs** | Fuel (or EV charging) cost from your car's consumption and the fuel price, plus accommodation, food, activities and transport. Shows total, per person, per day, and a chart. |
| ▶️ **Present** | A full-screen, self-playing slideshow: intro → each stop (the map flies along the route) → summary with the budget. |
| ♻️ **Reusable** | Keep as many trips as you like. Duplicate, export/import `.json` files, copy a share link, or print / save as PDF. |

### How to use it

1. Open `roadtrip/index.html` in a browser (or the GitHub Pages link, see below).
2. **⚙️ Trip tab**: name, start date, travellers, car and fuel price.
3. **📍 Stops tab**: search places and add them in order. Set how many nights you stay at each.
4. **🗓️ Plan / 💶 Costs** fill themselves in.
5. Press **▶ Present**. Keys: `←` `→` to move, `space` to pause, `Esc` to close.

Trips are saved automatically in your browser. Use **⋯ More → Export** to make a backup file or to move a trip to another device.

### Put it online (free)

GitHub repo → **Settings → Pages** → Source: *Deploy from a branch* → pick the branch and `/ (root)` → Save.
The planner will then be at `https://<user>.github.io/<repo>/roadtrip/`.

### Services used (all free, no API keys)

- Map tiles: © OpenStreetMap contributors, © CARTO
- Road distances: [OSRM](https://project-osrm.org/) public demo server. If it can't be reached, the app shows a straight-line estimate marked with `~`.
- Place search: [Nominatim](https://nominatim.org/) (OpenStreetMap)
- Map library: [Leaflet](https://leafletjs.com/)
