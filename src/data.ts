import type { ForecastPoint, HassEntity, SceneState, Season, TimeOfDay, WeatherKind } from './types';
import { holidayAt } from './holidays';
import { clamp } from './util';

/* ---------- conditions ---------- */

export const CONDITION_KIND: Record<string, WeatherKind> = {
  sunny: 'clear',
  'clear-night': 'clear',
  partlycloudy: 'partly',
  cloudy: 'cloudy',
  fog: 'fog',
  rainy: 'rain',
  pouring: 'pour',
  snowy: 'snow',
  'snowy-rainy': 'sleet',
  hail: 'hail',
  lightning: 'storm',
  'lightning-rainy': 'storm',
  windy: 'clear',
  'windy-variant': 'cloudy',
  exceptional: 'cloudy',
};

const CLOUD: Record<WeatherKind, number> = { clear: 0.1, partly: 0.4, cloudy: 0.85, fog: 0.7, rain: 0.85, pour: 1, snow: 0.8, sleet: 0.85, hail: 0.9, storm: 1 };
const PRECIP: Record<WeatherKind, number> = { clear: 0, partly: 0, cloudy: 0, fog: 0, rain: 0.6, pour: 1, snow: 0.6, sleet: 0.6, hail: 0.7, storm: 0.8 };

/** Icon names shared by the flat and pixel icon sets. */
export type IconKind =
  | 'sun' | 'moon' | 'partly' | 'partly-night' | 'cloud' | 'fog' | 'rain' | 'pour'
  | 'snow' | 'sleet' | 'hail' | 'storm' | 'wind' | 'sunrise' | 'sunset' | 'alert';

export function conditionIcon(condition: string | undefined, night: boolean): IconKind {
  switch (condition) {
    case 'sunny': return night ? 'moon' : 'sun';
    case 'clear-night': return 'moon';
    case 'partlycloudy': return night ? 'partly-night' : 'partly';
    case 'cloudy': return 'cloud';
    case 'fog': return 'fog';
    case 'rainy': return 'rain';
    case 'pouring': return 'pour';
    case 'snowy': return 'snow';
    case 'snowy-rainy': return 'sleet';
    case 'hail': return 'hail';
    case 'lightning':
    case 'lightning-rainy': return 'storm';
    case 'windy':
    case 'windy-variant': return 'wind';
    case 'exceptional': return 'alert';
    default: return 'cloud';
  }
}

/* ---------- units ---------- */

export function toCelsius(v: number, unit: string | undefined): number {
  return unit === '°F' ? ((v - 32) * 5) / 9 : v;
}

export function fromCelsius(v: number, unit: string | undefined): number {
  return unit === '°F' ? (v * 9) / 5 + 32 : v;
}

export function toMs(v: number, unit: string | undefined): number {
  switch (unit) {
    case 'km/h': return v / 3.6;
    case 'mph': return v * 0.44704;
    case 'kn': return v * 0.514444;
    case 'ft/s': return v * 0.3048;
    case 'Beaufort': return 0.836 * Math.pow(v, 1.5);
    default: return v; // m/s
  }
}

/**
 * Apparent temperature in °C: wind chill when cold and breezy, heat index when hot and humid,
 * otherwise the air temperature. Used when the provider has no apparent_temperature.
 */
export function feelsLikeC(tC: number, windMs: number | undefined, rh: number | undefined): number {
  const vKmh = (windMs ?? 0) * 3.6;
  if (tC <= 10 && vKmh > 4.8) {
    const v = Math.pow(vKmh, 0.16);
    return 13.12 + 0.6215 * tC - 11.37 * v + 0.3965 * tC * v;
  }
  if (tC >= 27 && rh !== undefined && rh >= 40) {
    const T = (tC * 9) / 5 + 32;
    const hi = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 0.00683783 * T * T
      - 0.05481717 * rh * rh + 0.00122874 * T * T * rh + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
    return ((hi - 32) * 5) / 9;
  }
  return tC;
}

export interface Units {
  temperature: string;
  wind: string;
  precipitation: string;
}

export function unitsOf(e: HassEntity): Units {
  return {
    temperature: e.attributes.temperature_unit ?? '°C',
    wind: e.attributes.wind_speed_unit ?? 'km/h',
    precipitation: e.attributes.precipitation_unit ?? 'mm',
  };
}

/** Feels-like for a forecast point or the current state, in the entity's temperature unit. */
export function feelsLike(p: ForecastPoint, u: Units): number | undefined {
  if (p.apparent_temperature !== undefined) return p.apparent_temperature;
  if (p.temperature === undefined) return undefined;
  const tC = toCelsius(p.temperature, u.temperature);
  const ms = p.wind_speed !== undefined ? toMs(p.wind_speed, u.wind) : undefined;
  return fromCelsius(feelsLikeC(tC, ms, p.humidity), u.temperature);
}

/* ---------- sun and time ---------- */

export interface SunTimes {
  /** Sorted sunrise/sunset events covering roughly the next three days. */
  events: { t: number; kind: 'sunrise' | 'sunset' }[];
}

export function sunTimes(sun: HassEntity | undefined): SunTimes {
  const rise = sun?.attributes.next_rising ? Date.parse(sun.attributes.next_rising) : NaN;
  const set = sun?.attributes.next_setting ? Date.parse(sun.attributes.next_setting) : NaN;
  const events: SunTimes['events'] = [];
  const day = 86400000;
  for (let k = -1; k < 3; k++) {
    if (!isNaN(rise)) events.push({ t: rise + k * day, kind: 'sunrise' });
    if (!isNaN(set)) events.push({ t: set + k * day, kind: 'sunset' });
  }
  events.sort((a, b) => a.t - b.t);
  return { events };
}

/** True if the most recent sun event before `t` was a sunset. Falls back to clock hours. */
export function isNightAt(t: number, sun: SunTimes): boolean {
  let last: 'sunrise' | 'sunset' | undefined;
  for (const e of sun.events) {
    if (e.t > t) break;
    last = e.kind;
  }
  if (last) return last === 'sunset';
  const h = new Date(t).getHours();
  return h < 6 || h >= 20;
}

/** Sun elevation (degrees) and whether it is rising. Without a sun entity, a rough curve from the clock. */
export function sunPosition(sun: HassEntity | undefined, now: Date): { elev: number; rising: boolean } {
  const elev = sun?.attributes.elevation;
  if (typeof elev === 'number') return { elev, rising: !!sun!.attributes.rising };
  const h = now.getHours() + now.getMinutes() / 60;
  return { elev: 45 * Math.sin((Math.PI * (h - 7)) / 12), rising: h >= 1 && h < 13 };
}

export function timeFromElevation(elev: number, rising: boolean): TimeOfDay {
  if (elev >= 6) return 'day';
  if (elev <= -6) return 'night';
  return rising ? 'dawn' : 'dusk';
}

/** Quantised for SceneState: 2° steps between −14° and +14°, so the scene redraws only through twilight. */
export function quantiseElevation(elev: number): number {
  return clamp(Math.round(elev / 2) * 2, -14, 14);
}

export function seasonOf(now: Date, latitude: number): Season {
  let m = now.getMonth(); // 0 = January
  if (latitude < 0) m = (m + 6) % 12;
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/**
 * Solar elevation for a moment and place (NOAA approximation, good to well under a degree).
 * Used instead of sun.sun when debug_date pretends it is another time.
 */
export function solarPosition(date: Date, latitude: number, longitude: number): { elev: number; rising: boolean } {
  const rad = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const doy = Math.floor((date.getTime() - start) / 86400000);
  const hourUtc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (doy + (hourUtc - 12) / 24);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const trueSolarMin = hourUtc * 60 + eqTime + 4 * longitude;
  const hourAngle = trueSolarMin / 4 - 180;
  const cosZenith = Math.sin(latitude * rad) * Math.sin(decl) + Math.cos(latitude * rad) * Math.cos(decl) * Math.cos(hourAngle * rad);
  const elev = 90 - Math.acos(clamp(cosZenith, -1, 1)) / rad;
  const ha = ((hourAngle + 540) % 360) - 180;
  return { elev, rising: ha < 0 };
}

/**
 * Parse debug_date into an offset from the real clock. A bare date ("2026-10-31") keeps the current
 * clock time on that day. Returns null for empty or unparseable values.
 */
export function debugOffset(value: string | undefined, realNow: Date): number | null {
  if (!value) return null;
  const v = String(value).trim();
  const day = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const target = day
    ? new Date(+day[1], +day[2] - 1, +day[3], realNow.getHours(), realNow.getMinutes(), realNow.getSeconds())
    : new Date(v);
  return isNaN(target.getTime()) ? null : target.getTime() - realNow.getTime();
}

/* ---------- scene state ---------- */

export function sceneState(
  entity: HassEntity, sun: HassEntity | undefined, latitude: number, now: Date, holidays = true,
  sunOverride?: { elev: number; rising: boolean },
): SceneState {
  const a = entity.attributes;
  const u = unitsOf(entity);
  const condition = entity.state;
  const kind = CONDITION_KIND[condition] ?? 'cloudy';
  const windMs = typeof a.wind_speed === 'number' ? toMs(a.wind_speed, u.wind) : 3;
  let windAmt = clamp(windMs / 14);
  if (condition === 'windy' || condition === 'windy-variant') windAmt = Math.max(windAmt, 0.75);
  let cloudCover = CLOUD[kind];
  if (typeof a.cloud_coverage === 'number') {
    const cc = a.cloud_coverage / 100;
    cloudCover = PRECIP[kind] > 0 ? Math.max(cc, 0.7) : kind === 'clear' ? Math.min(cc, 0.3) : cc;
  }
  const tC = typeof a.temperature === 'number' ? toCelsius(a.temperature, u.temperature) : 10;
  const season = seasonOf(now, latitude);
  const pos = sunOverride ?? sunPosition(sun, now);
  return {
    kind,
    time: timeFromElevation(pos.elev, pos.rising),
    sunElev: quantiseElevation(pos.elev),
    rising: pos.rising,
    season,
    windAmt: Math.round(windAmt * 20) / 20,
    cloudCover: Math.round(cloudCover * 20) / 20,
    precip: condition === 'lightning' ? 0 : PRECIP[kind],
    lightning: condition === 'lightning' || condition === 'lightning-rainy',
    snowCover: kind === 'snow' || (kind === 'sleet' && tC <= 1) || (season === 'winter' && tC <= 0),
    seed: now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate(),
    holiday: holidays ? holidayAt(now) : null,
  };
}

/** Today's high/low, from the daily forecast when it covers today, else from today's hourly points. */
export function todayRange(current: number | undefined, hourly: ForecastPoint[] | null, daily: ForecastPoint[] | null, now: Date): { hi?: number; lo?: number } {
  const sameDay = (iso: string) => new Date(iso).toDateString() === now.toDateString();
  const d = daily?.find((p) => sameDay(p.datetime));
  if (d?.temperature !== undefined && d.templow !== undefined) return { hi: d.temperature, lo: d.templow };
  const temps = (hourly ?? []).filter((p) => sameDay(p.datetime) && p.temperature !== undefined).map((p) => p.temperature!);
  if (current !== undefined) temps.push(current);
  if (!temps.length) return {};
  return { hi: Math.max(...temps), lo: Math.min(...temps) };
}

/** Will it start raining within `hours` while it is dry now? Used for a snark nudge. */
export function rainSoon(kind: WeatherKind, hourly: ForecastPoint[] | null, hours = 3): boolean {
  if (PRECIP[kind] > 0 || !hourly) return false;
  const limit = Date.now() + hours * 3600000;
  return hourly.some((p) => Date.parse(p.datetime) <= limit && ((p.precipitation ?? 0) >= 0.3 || (p.precipitation_probability ?? 0) >= 60));
}

/** Compass arrow pointing where the wind blows TO (bearing is where it comes from). */
export function windArrow(bearing: number | string | undefined): string {
  const deg = bearingDeg(bearing);
  if (deg === undefined) return '';
  const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  return arrows[Math.round(deg / 45) % 8];
}

export function bearingDeg(bearing: number | string | undefined): number | undefined {
  if (typeof bearing === 'number') return ((bearing % 360) + 360) % 360;
  if (typeof bearing !== 'string') return undefined;
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const i = dirs.indexOf(bearing.toUpperCase());
  return i < 0 ? undefined : i * 22.5;
}
