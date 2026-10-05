import { bearingDeg, conditionIcon, feelsLike, type IconKind, isNightAt, type SunTimes, type Units } from '../data';
import type { ForecastPoint, MetricId } from '../types';

export interface Column {
  t: number;
  /** Hour row label: "14", or "07:31" for sun events. */
  label: string;
  value: number | null;
  /** Formatted value under the point / above the bar. */
  display: string;
  icon?: IconKind;
  event?: 'sunrise' | 'sunset';
  /** Direction the wind blows TO, in degrees (0 = north), for arrows. */
  arrow?: number;
  gust?: number | null;
}

export interface ChartModel {
  columns: Column[];
  mode: 'line' | 'bar';
  icons: boolean;
  min: number;
  max: number;
  /** Second, dashed series (wind gusts). */
  gusts: boolean;
  color: 'accent' | 'rain' | 'wind' | 'humidity' | 'cloud' | 'uv';
}

export const METRIC_LABELS: Record<MetricId, string> = {
  temperature: 'Temp',
  feels_like: 'Føles som',
  precipitation_probability: 'Nedbør %',
  precipitation: 'Nedbør mm',
  wind: 'Vind',
  humidity: 'Fugt',
  cloud_coverage: 'Skyer',
  uv_index: 'UV',
};

export const ALL_METRICS = Object.keys(METRIC_LABELS) as MetricId[];

const nf1 = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1 });

/** Metrics with at least one value in the forecast. Feels-like is always derivable from temperature. */
export function availableMetrics(hourly: ForecastPoint[]): MetricId[] {
  const has = (k: keyof ForecastPoint) => hourly.some((p) => typeof p[k] === 'number');
  return ALL_METRICS.filter((m) => {
    switch (m) {
      case 'temperature':
      case 'feels_like': return has('temperature');
      case 'wind': return has('wind_speed');
      default: return has(m);
    }
  });
}

const hh = (t: number) => String(new Date(t).getHours()).padStart(2, '0');
const hhmm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function buildChart(metric: MetricId, hourly: ForecastPoint[], hours: number, units: Units, sun: SunTimes, now: number): ChartModel {
  const pts = hourly.filter((p) => Date.parse(p.datetime) >= now - 45 * 60000).slice(0, hours);
  const valueOf = (p: ForecastPoint): number | null => {
    const v = metric === 'feels_like' ? feelsLike(p, units) : metric === 'wind' ? p.wind_speed : p[metric];
    return typeof v === 'number' ? v : null;
  };

  const fmt = (v: number | null): string => {
    if (v === null) return '–';
    switch (metric) {
      case 'temperature':
      case 'feels_like': return `${Math.round(v)}°`;
      case 'precipitation': return v === 0 ? '0' : nf1.format(v);
      case 'precipitation_probability':
      case 'humidity':
      case 'cloud_coverage': return `${Math.round(v)}%`;
      default: return String(Math.round(v));
    }
  };

  let columns: Column[] = pts.map((p) => {
    const t = Date.parse(p.datetime);
    const v = valueOf(p);
    const deg = bearingDeg(p.wind_bearing);
    return {
      t,
      label: hh(t),
      value: v,
      display: fmt(v),
      icon: conditionIcon(p.condition, isNightAt(t + 30 * 60000, sun)),
      arrow: metric === 'wind' && deg !== undefined ? (deg + 180) % 360 : undefined,
      gust: metric === 'wind' ? p.wind_gust_speed ?? null : undefined,
    };
  });

  const isTemp = metric === 'temperature' || metric === 'feels_like';
  if (isTemp && columns.length > 1) {
    const first = columns[0].t, last = columns[columns.length - 1].t;
    for (const e of sun.events) {
      if (e.t <= first || e.t >= last) continue;
      const i = columns.findIndex((c) => c.t > e.t);
      const a = columns[i - 1], b = columns[i];
      const k = (e.t - a.t) / (b.t - a.t);
      const v = a.value !== null && b.value !== null ? a.value + (b.value - a.value) * k : a.value ?? b.value;
      columns.splice(i, 0, { t: e.t, label: hhmm(e.t), value: v, display: fmt(v), icon: e.kind, event: e.kind });
    }
  }

  const vals = columns.flatMap((c) => [c.value, c.gust ?? null]).filter((v): v is number => v !== null);
  let min = Math.min(...vals), max = Math.max(...vals);
  const mode: ChartModel['mode'] = metric === 'precipitation' || metric === 'precipitation_probability' ? 'bar' : 'line';
  if (metric === 'precipitation_probability' || metric === 'humidity' || metric === 'cloud_coverage') { min = 0; max = 100; }
  if (metric === 'precipitation') { min = 0; max = Math.max(2, max); }
  if (metric === 'uv_index') { min = 0; max = Math.max(6, max); }
  if (metric === 'wind') { min = 0; max = Math.max(max, 5); }
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (max === min) { max += 1; min -= 1; }

  const color: ChartModel['color'] = isTemp ? 'accent'
    : mode === 'bar' ? 'rain'
    : metric === 'wind' ? 'wind'
    : metric === 'humidity' ? 'humidity'
    : metric === 'cloud_coverage' ? 'cloud'
    : 'uv';

  if (!isTemp) columns = columns.map((c) => ({ ...c, icon: undefined }));
  return { columns, mode, icons: isTemp, min, max, gusts: metric === 'wind' && columns.some((c) => typeof c.gust === 'number'), color };
}
