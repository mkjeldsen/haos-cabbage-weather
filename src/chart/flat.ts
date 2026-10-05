import { flatIcon } from '../icons';
import type { ChartModel } from './model';

export const FLAT_COL = 52;
const H = 150;

function smoothPath(pts: [number, number][]): string {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map((v) => v.toFixed(1))} ${c2.map((v) => v.toFixed(1))} ${p2}`;
  }
  return d;
}

/** Hourly chart as an SVG string; width grows with the number of columns (the card scrolls it). */
export function renderFlatChart(m: ChartModel): string {
  const n = m.columns.length;
  const W = n * FLAT_COL;
  const x = (i: number) => +(FLAT_COL / 2 + i * FLAT_COL).toFixed(1);
  const color = `var(--cw-${m.color})`;
  let o = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeprognose">`;

  m.columns.forEach((c, i) => {
    o += `<text x="${x(i)}" y="16" text-anchor="middle" class="${c.event ? 'ev' : 'hr'}">${c.label}</text>`;
  });

  if (m.mode === 'bar') {
    const base = 120, top = 40;
    m.columns.forEach((c, i) => {
      const v = c.value ?? 0;
      const h = Math.max(v > 0 ? 3 : 0, ((v - m.min) / (m.max - m.min)) * (base - top));
      o += `<rect x="${x(i) - 11}" y="${(base - h).toFixed(1)}" width="22" height="${h.toFixed(1)}" rx="5" style="fill:${color}" opacity="${v > 0 ? 0.85 : 0}"/>`;
      o += `<text x="${x(i)}" y="${(base - h - 7).toFixed(1)}" text-anchor="middle" class="${v > 0 ? 'val' : 'val zero'}">${c.display}</text>`;
    });
    o += `<line x1="0" y1="120.5" x2="${W}" y2="120.5" class="axis"/>`;
    return o + '</svg>';
  }

  const top = m.icons ? 64 : 48, bottom = 106;
  const y = (v: number) => +(bottom - ((v - m.min) / (m.max - m.min)) * (bottom - top)).toFixed(1);
  const pts: [number, number][] = [];
  m.columns.forEach((c, i) => { if (c.value !== null) pts.push([x(i), y(c.value)]); });
  if (pts.length < 2) return o + '</svg>';

  const line = smoothPath(pts);
  o += `<defs><linearGradient id="cw-area-${m.color}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.28"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs>`;
  o += `<path d="${line} L${pts[pts.length - 1][0]},146 L${pts[0][0]},146Z" fill="url(#cw-area-${m.color})"/>`;

  if (m.gusts) {
    const gp: [number, number][] = [];
    m.columns.forEach((c, i) => { if (typeof c.gust === 'number') gp.push([x(i), y(c.gust)]); });
    if (gp.length > 1) o += `<path d="${smoothPath(gp)}" fill="none" style="stroke:${color}" stroke-width="2" stroke-dasharray="4 4" opacity=".55"/>`;
  }
  o += `<path d="${line}" fill="none" style="stroke:${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  m.columns.forEach((c, i) => {
    if (c.value === null) return;
    const cx = x(i), cy = y(c.value);
    if (c.event) {
      o += `<svg x="${cx - 13}" y="${cy - 22}" width="26" height="26" viewBox="0 0 32 32">${flatIcon(c.icon!, false)}</svg>`;
    } else {
      if (m.icons && c.icon) o += `<svg x="${cx - 14}" y="${cy - 40}" width="28" height="28" viewBox="0 0 32 32">${flatIcon(c.icon, false)}</svg>`;
      if (c.arrow !== undefined) {
        o += `<g transform="translate(${cx} ${cy - 20}) rotate(${c.arrow})"><path d="M0 -7 L4.5 3 L0 0.6 L-4.5 3Z" style="fill:${color}"/></g>`;
      }
      o += `<circle cx="${cx}" cy="${cy}" r="3.6" style="fill:var(--card-background-color,#fff);stroke:${color}" stroke-width="2.4"/>`;
    }
    o += `<text x="${cx}" y="${cy + 25}" text-anchor="middle" class="val">${c.display}</text>`;
  });
  return o + '</svg>';
}
