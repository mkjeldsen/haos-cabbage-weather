import type { IconKind } from './data';
import { sprite } from './scenes/pixel/engine';

/* ---------- flat (SVG, 32×32 viewBox) ---------- */

function cloud(dx: number, dy: number, tone: 'light' | 'dark' | 'storm', onSky: boolean): string {
  const fill = { light: onSky ? '#ffffff' : '#eef2f6', dark: onSky ? '#e3e9f0' : '#c9d2dc', storm: onSky ? '#aeb8c4' : '#8d99a8' }[tone];
  const stroke = onSky ? 'none' : tone === 'light' ? '#aab6c3' : '#7f8c9b';
  return `<path transform="translate(${dx} ${dy})" d="M8 26h16a6 6 0 0 0 .6-11.97A8 8 0 0 0 9.3 13.2 6.5 6.5 0 0 0 8 26z" fill="${fill}" stroke="${stroke}" stroke-width="1.3" stroke-linejoin="round"/>`;
}

function sun(cx: number, cy: number, r: number, rays = true): string {
  let o = '';
  if (rays) {
    o += '<g stroke="#ffc22e" stroke-width="2.2" stroke-linecap="round">';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
      o += `<line x1="${(cx + c * (r + 2.5)).toFixed(2)}" y1="${(cy + s * (r + 2.5)).toFixed(2)}" x2="${(cx + c * (r + 5.5)).toFixed(2)}" y2="${(cy + s * (r + 5.5)).toFixed(2)}"/>`;
    }
    o += '</g>';
  }
  return o + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffc22e"/>`;
}

const MOON = (s = 1, dx = 0, dy = 0) =>
  `<path transform="translate(${dx} ${dy}) scale(${s})" d="M20 4a12 12 0 1 0 8 20A9.5 9.5 0 0 1 20 4z" fill="#f5e39a"/>`;

const drops = (n: number, color = '#4aa3ff') => {
  const xs = n === 3 ? [11, 17, 23] : [8, 13, 18, 23];
  return `<g stroke="${color}" stroke-width="2.2" stroke-linecap="round">${xs.map((x) => `<line x1="${x}" y1="25" x2="${x - 1.5}" y2="29.5"/>`).join('')}</g>`;
};

/** Inner SVG markup for a 32×32 viewBox. `onSky` = drawn over the illustrated header (no outlines, white clouds). */
export function flatIcon(kind: IconKind, onSky: boolean): string {
  const flake = onSky ? '#ffffff' : '#7cc0ff';
  switch (kind) {
    case 'sun': return sun(16, 16, 7);
    case 'moon': return MOON();
    case 'partly': return sun(12, 11, 5.5) + cloud(3, 1, 'light', onSky);
    case 'partly-night': return MOON(0.62, 1, 0) + cloud(3, 1, 'light', onSky);
    case 'cloud': return cloud(0, -2, 'light', onSky);
    case 'fog': return `<g stroke="${onSky ? '#ffffff' : '#9aa7b6'}" stroke-width="2.6" stroke-linecap="round"><line x1="5" y1="11" x2="22" y2="11"/><line x1="9" y1="17" x2="27" y2="17"/><line x1="5" y1="23" x2="24" y2="23"/></g>`;
    case 'rain': return cloud(0, -4, 'dark', onSky) + drops(3);
    case 'pour': return cloud(0, -5, 'storm', onSky) + drops(4, '#2f86e8');
    case 'snow': return cloud(0, -4, 'dark', onSky) + `<g fill="${flake}"><circle cx="10" cy="26" r="1.7"/><circle cx="16" cy="28.5" r="1.7"/><circle cx="22" cy="26" r="1.7"/></g>`;
    case 'sleet': return cloud(0, -4, 'dark', onSky) + `<g stroke="#4aa3ff" stroke-width="2.2" stroke-linecap="round"><line x1="11" y1="25" x2="9.5" y2="29.5"/><line x1="23" y1="25" x2="21.5" y2="29.5"/></g><circle cx="16.5" cy="27.5" r="1.8" fill="${flake}"/>`;
    case 'hail': return cloud(0, -4, 'dark', onSky) + `<g fill="#ffffff" stroke="${onSky ? 'none' : '#8fb4d6'}" stroke-width="1"><circle cx="10" cy="26.5" r="2"/><circle cx="16.5" cy="28.5" r="2"/><circle cx="23" cy="26.5" r="2"/></g>`;
    case 'storm': return cloud(0, -5, 'storm', onSky) + '<path d="M17 20 L12 27 H16 L14 32 L21 24 H17 L19 20Z" fill="#ffd23f" stroke="#e0a800" stroke-width=".6" stroke-linejoin="round"/>';
    case 'wind': return `<g fill="none" stroke="${onSky ? '#ffffff' : '#8aa2b8'}" stroke-width="2.4" stroke-linecap="round"><path d="M4 12h15a4 4 0 1 0-4-4"/><path d="M4 18h21a4 4 0 1 1-4 4"/><path d="M4 24h9"/></g>`;
    case 'sunrise':
    case 'sunset': {
      const arrow = kind === 'sunrise' ? 'M16 3 L12 8 M16 3 L20 8 M16 3 V10' : 'M16 10 L12 5 M16 10 L20 5 M16 3 V10';
      return `<clipPath id="cw-hz-${kind}"><rect width="32" height="24"/></clipPath><g clip-path="url(#cw-hz-${kind})">${sun(16, 24, 6.5)}</g>
        <line x1="4" y1="24.5" x2="28" y2="24.5" stroke="#ff9f1c" stroke-width="2.2" stroke-linecap="round"/>
        <path d="${arrow}" stroke="#ff9f1c" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    }
    case 'alert': return '<path d="M16 4 L29 27 H3Z" fill="#ef5b5b"/><rect x="14.8" y="11" width="2.4" height="9" rx="1.2" fill="#fff"/><circle cx="16" cy="23.5" r="1.4" fill="#fff"/>';
  }
}

/* ---------- pixel (7×7 sprites, drawn with a 1px outline → 9×9) ---------- */

const SPRITES: Record<IconKind, string[]> = {
  sun: ['...y...', '.y...y.', '..yyy..', 'y.yyy.y', '..yyy..', '.y...y.', '...y...'],
  moon: ['..mmm..', '.mmm...', 'mmm....', 'mmm....', 'mmm...m', '.mmmmm.', '..mmm..'],
  partly: ['y..y...', '.yyy...', 'yyyww..', '.ywwww.', 'wwwwwww', '.ddddd.', '.......'],
  'partly-night': ['..mm...', '.mm....', 'mmmww..', 'mmwwww.', 'wwwwwww', '.ddddd.', '.......'],
  cloud: ['.......', '..ww...', '.wwwww.', 'wwwwwww', 'wwwwwww', '.ddddd.', '.......'],
  fog: ['.......', 'sssss..', '.......', '..sssss', '.......', 'ssssss.', '.......'],
  rain: ['..gg...', '.gggg..', 'gggggg.', 'ddddddd', '.......', '.b.b.b.', 'b.b.b..'],
  pour: ['.gggg..', 'gggggg.', 'ddddddd', 'b.b.b.b', '.b.b.b.', 'b.b.b.b', '.b.b.b.'],
  snow: ['..gg...', '.gggg..', 'gggggg.', 'ddddddd', '.......', '.c.c.c.', '..c.c..'],
  sleet: ['..gg...', '.gggg..', 'gggggg.', 'ddddddd', '.......', '.b.c.b.', '..c.b..'],
  hail: ['..gg...', '.gggg..', 'gggggg.', 'ddddddd', '.......', '.w.w.w.', 'w.w.w..'],
  storm: ['..dd...', '.dddd..', 'dddddd.', 'DDDDDDD', '..yy...', '.yyy...', '..y....'],
  wind: ['.......', 'sssss..', '.....s.', 'ssssss.', '......s', 'sss..s.', '.......'],
  sunrise: ['...o...', '..ooo..', '.......', '..yyy..', '.yyyyy.', 'ooooooo', '.......'],
  sunset: ['..ooo..', '...o...', '.......', '..yyy..', '.yyyyy.', 'ooooooo', '.......'],
  alert: ['...r...', '..rrr..', '..rwr..', '.rrwrr.', '.rrrrr.', 'rrrwrrr', 'rrrrrrr'],
};

const SPRITE_COLORS: Record<string, string> = {
  y: '#ffc22e', w: '#ffffff', g: '#dfe5ec', d: '#a3adbb', D: '#7d8796', b: '#4aa3ff', c: '#bfe3ff',
  m: '#f5e39a', s: '#cfe0ee', o: '#ff9f1c', r: '#ef5b5b',
};

/** Draw a 9×9 pixel icon (sprite + dark outline) with its top-left at (ox, oy). */
export function drawPixelIcon(c: CanvasRenderingContext2D, kind: IconKind, ox: number, oy: number): void {
  const rows = SPRITES[kind];
  const on = (x: number, y: number) => y >= 0 && y < 7 && x >= 0 && x < 7 && rows[y][x] !== '.';
  c.fillStyle = 'rgba(30,40,58,.85)';
  for (let y = -1; y <= 7; y++) {
    for (let x = -1; x <= 7; x++) {
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) c.fillRect(ox + 1 + x, oy + 1 + y, 1, 1);
    }
  }
  sprite(c, rows, SPRITE_COLORS, ox + 1, oy + 1);
}

const urlCache = new Map<IconKind, string>();

/** Pixel icon as a data URL, for use in <img> (header, daily list). */
export function pixelIconUrl(kind: IconKind): string {
  let url = urlCache.get(kind);
  if (!url) {
    const cv = document.createElement('canvas');
    cv.width = 9;
    cv.height = 9;
    drawPixelIcon(cv.getContext('2d')!, kind, 0, 0);
    url = cv.toDataURL();
    urlCache.set(kind, url);
  }
  return url;
}
