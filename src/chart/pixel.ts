import { drawPixelIcon } from '../icons';
import { BAYER, pline, px } from '../scenes/pixel/engine';
import { darken } from '../util';
import type { ChartModel } from './model';

export const PIXEL_COL = 19;
export const PIXEL_CHART_H = 56;
/** CSS pixels per chart pixel. Integer, so the chart is always crisp. */
export const PIXEL_CHART_SCALE = 3;

const FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'], '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'], '-': ['00', '00', '11', '00', '00'], '–': ['00', '00', '11', '00', '00'],
  '°': ['111', '101', '111', '000', '000'], '%': ['101', '001', '010', '100', '101'], ',': ['0', '0', '0', '1', '1'],
  ':': ['0', '1', '0', '1', '0'],
};

function pixText(c: CanvasRenderingContext2D, str: string, cx: number, y: number, col: string): void {
  const glyphs = [...str].map((ch) => FONT[ch]).filter(Boolean);
  const width = glyphs.reduce((a, g) => a + g[0].length + 1, -1);
  let x = Math.round(cx - width / 2);
  c.fillStyle = col;
  for (const g of glyphs) {
    g.forEach((row, r) => [...row].forEach((b, k) => { if (b === '1') c.fillRect(x + k, y + r, 1, 1); }));
    x += g[0].length + 1;
  }
}

/** Normalise any CSS colour (theme variables may be rgb(), names, …) to #rrggbb. */
const probe = document.createElement('canvas').getContext('2d')!;
function hex(color: string, fallback: string): string {
  probe.fillStyle = fallback;
  probe.fillStyle = color || fallback;
  const v = probe.fillStyle;
  if (v.startsWith('#')) return v;
  const m = v.match(/\d+(\.\d+)?/g);
  return m ? '#' + m.slice(0, 3).map((n) => Math.round(+n).toString(16).padStart(2, '0')).join('') : fallback;
}

/** Draw the hourly chart onto `cv`, resizing it to fit all columns. `host` supplies theme colours. */
export function renderPixelChart(cv: HTMLCanvasElement, m: ChartModel, host: Element): void {
  const n = m.columns.length;
  const W = n * PIXEL_COL;
  if (cv.width !== W) cv.width = W;
  cv.height = PIXEL_CHART_H;
  cv.style.width = `${W * PIXEL_CHART_SCALE}px`;
  cv.style.height = `${PIXEL_CHART_H * PIXEL_CHART_SCALE}px`;

  const css = getComputedStyle(host);
  const text = hex(css.getPropertyValue('--primary-text-color').trim(), '#1d2330');
  const muted = hex(css.getPropertyValue('--secondary-text-color').trim(), '#6b7280');
  const color = hex(css.getPropertyValue(`--cw-${m.color}`).trim(), '#ff9f1c');
  const deep = darken(color, 0.25);
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, W, PIXEL_CHART_H);

  const x = (i: number) => Math.floor(PIXEL_COL / 2) + i * PIXEL_COL;
  m.columns.forEach((col, i) => pixText(c, col.label, x(i), 2, col.event ? color : muted));

  if (m.mode === 'bar') {
    const base = 50, top = 16;
    m.columns.forEach((col, i) => {
      const v = col.value ?? 0;
      const h = v > 0 ? Math.max(1, Math.round(((v - m.min) / (m.max - m.min)) * (base - top))) : 0;
      if (h) {
        px(c, x(i) - 3, base - h, color, 7, h);
        px(c, x(i) - 3, base - h, '#ffffff', 7, 1);
        c.globalAlpha = 0.35;
        px(c, x(i) + 2, base - h + 1, deep, 2, h - 1);
        c.globalAlpha = 1;
      }
      pixText(c, col.display, x(i), base - h - 7, v > 0 ? text : muted);
    });
    px(c, 0, base, muted, W, 1);
    return;
  }

  const top = m.icons ? 30 : 22, bottom = 42;
  const yOf = (v: number) => Math.round(bottom - ((v - m.min) / (m.max - m.min)) * (bottom - top));
  const ys = m.columns.map((col) => (col.value === null ? null : yOf(col.value)));

  // Dithered area under the line.
  c.fillStyle = color;
  c.globalAlpha = 0.35;
  for (let i = 0; i < n - 1; i++) {
    const a = ys[i], b = ys[i + 1];
    if (a === null || b === null) continue;
    for (let xx = x(i); xx < x(i + 1); xx++) {
      const y = Math.round(a + ((b - a) * (xx - x(i))) / PIXEL_COL);
      for (let yy = y + 2; yy < 54; yy++) if (BAYER[yy & 3][xx & 3] < 9 - (yy - y) * 0.9) c.fillRect(xx, yy, 1, 1);
    }
  }
  c.globalAlpha = 1;

  if (m.gusts) {
    const gy = m.columns.map((col) => (typeof col.gust === 'number' ? yOf(col.gust) : null));
    c.fillStyle = deep;
    for (let i = 0; i < n - 1; i++) {
      const a = gy[i], b = gy[i + 1];
      if (a === null || b === null) continue;
      for (let xx = x(i); xx < x(i + 1); xx += 2) c.fillRect(xx, Math.round(a + ((b - a) * (xx - x(i))) / PIXEL_COL), 1, 1);
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const a = ys[i], b = ys[i + 1];
    if (a === null || b === null) continue;
    pline(c, x(i), a + 1, x(i + 1), b + 1, deep);
    pline(c, x(i), a, x(i + 1), b, color);
  }

  m.columns.forEach((col, i) => {
    const y = ys[i];
    if (y === null) return;
    const cx = x(i);
    if (col.event) {
      drawPixelIcon(c, col.icon!, cx - 4, y - 10);
    } else {
      px(c, cx - 1, y - 1, deep, 3, 3);
      px(c, cx, y, '#ffffff');
      if (m.icons && col.icon) drawPixelIcon(c, col.icon, cx - 4, y - 14);
      if (col.arrow !== undefined) {
        const a = (col.arrow * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
        const tx = cx + dx * 2.5, ty = y - 8 + dy * 2.5;
        pline(c, cx - dx * 2.5, y - 8 - dy * 2.5, tx, ty, deep);
        px(c, Math.round(tx - dx * 1.5 - dy * 1.5), Math.round(ty - dy * 1.5 + dx * 1.5), deep);
        px(c, Math.round(tx - dx * 1.5 + dy * 1.5), Math.round(ty - dy * 1.5 - dx * 1.5), deep);
      }
    }
    pixText(c, col.display, cx, y + 5, text);
  });
}
