# Cabbage Weather — card spec (v0.1)

A playful Home Assistant Lovelace weather card inspired by Carrot Weather.

## Data
- Works with **any HA `weather.*` entity** (met.no today). Forecasts via `weather/subscribe_forecast` (hourly + daily).
- Metric tabs are **feature-detected**: a tab is hidden if no forecast point has that field.
  - Temp · Feels like · Precip chance · Precip amount · Wind (+gusts, direction arrows) · Humidity · Clouds · UV
- **Feels like**: uses `apparent_temperature` if provided, otherwise computed (wind chill ≤10 °C, heat index ≥27 °C, else air temp).
- Units follow the entity / HA unit system.
- Sunrise/sunset from `sun.sun` (configurable), inserted as markers in the hourly chart.

## Layout
1. **Header scene** (illustrated, own palette)
   - Big temperature, condition icon, feels like, today's high/low, location name
   - Chips: wind (speed + direction), humidity
   - Danish snark line (phrase pack keyed by condition, temperature band, wind, time of day; rotates hourly)
2. **Hourly chart** (follows HA theme vars)
   - Smooth curve; condition icon rides the line at each point; value labels below
   - Horizontally scrollable; metric tabs underneath
3. **Daily list** (optional, card setting) — next 5–7 days with high/low range bars

## Scenes (flat vector SVG, layered; selectable in editor)
| Scene   | Props (2–3, KISS)                                      |
|---------|--------------------------------------------------------|
| Forest  | swaying pines, kid on swing, occasional deer; owl at night |
| Rural   | wind turbine (speed ∝ wind), tractor in field, cow     |
| City    | Copenhagen-ish street: cars, cyclists, lit windows at night |
| Seaside | lighthouse (beam at night), sailboat, waves            |
| Suburb  | parcelhuse, kid on a trampoline, robot lawnmower, Dannebrog (lowered at sunset, pennant at night) |

**Weather FX — full mood:** rain/snow particles, fog layers, lightning flashes, sky colour + cloud density by condition; wind drives sway, turbine speed, blowing leaves.

**Time & season:** day/night/dawn/dusk sky from `sun.sun`; seasonal ground/trees (snow, autumn, blossom, summer).

**Extras:** rare easter eggs (UFO, hot-air balloon, cat). Motion toggle + respects `prefers-reduced-motion`.

**Hidden holidays** (only with easter eggs on; not mentioned in the editor/README). Visitors appear every 1–3 min instead of 3–8:
| Holiday | When | Scene | Visitor |
|---|---|---|---|
| Halloween | 31 Oct | jack-o'-lanterns, bats after sunset | witch on a broom / black cat |
| Christmas | 24–25 Dec | small decorated tree with presents | Santa's sleigh (Rudolph leads) |
| New Year's Eve | 31 Dec | scattered fireworks after sunset | – |
| Midnight | 1 Jan 00:00–00:59 | full fireworks show, "GODT NYTÅR!" | – |
| Easter | Maundy Thursday – Easter Monday (computed) | painted eggs + daffodils | Easter bunny |
Each has its own Danish comment lines (Kongens nytårstale kl. 18, jumping off the chair at midnight, …).

**Sky by sun elevation:** night → nautical twilight → blue hour (−6° to −4°) → afterglow → golden hour → day, with a cooler/pinker dawn than dusk. Overcast/fog/rain grey it out, so blue hour and golden glow only show when conditions are ripe. Stars fade in below −6°; clouds catch the sunset; landscape darkness is continuous.

Primary target is a desktop browser. Animations stop with `animations: false` or OS reduce-motion.

## Art style
Both styles ship, selectable per card (`style: pixel | flat`). **Pixel art is the default.**
The editor spells out the trade-offs:
- Pixel: JS canvas loop (160×88, ~15 fps, ≈0.3 ms/frame on a laptop), pauses off-screen / hidden tab; loads Tiny5 from Google Fonts; crispest at widths that are multiples of 160 px.
- Flat: SVG + CSS animations, near-zero CPU, crisp at any size, no external font.

## Tech
- Lit 3 + TypeScript, Rollup → single `dist/cabbage-weather-card.js`
- Visual editor (ha-form schema), Danish or English following HA's language: entity, scene, name, show daily, hours (12/24/48), metrics, animations, easter eggs, sun entity
- HACS custom repo: `hacs.json`, GitHub Action building release asset
- Tap → more-info dialog

## Hidden test option
`debug_date` (YAML only, not in the editor): `"2026-12-31T23:58"` or `"2026-10-31"` (keeps the current clock time).
The clock runs on from there. Scene, holidays, season and comments use the fake moment; the sun is computed
from the home's coordinates (NOAA approximation) instead of `sun.sun`. Forecast, chart and daily list stay on real time.
A red DEBUG badge shows the fake time and sun elevation.
