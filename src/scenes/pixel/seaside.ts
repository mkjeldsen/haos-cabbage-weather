import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { BAYER, type Ctx, hill, PH, type PixelSceneDef, pline, px, PW, sprite } from './engine';
import { darken, lighten, mix, type Rand } from '../../util';

/** Danish west coast (Skagen): lighthouse on a dune headland, a sailboat, bathing huts and marram grass. */

const HZ = 52;
const GRASS = { spring: '#9dbb68', summer: '#8fae5c', autumn: '#bba763', winter: '#a3a07a' } as const;
const HUTS = ['#e45b4f', '#f3c64f', '#5aa0d8', '#7cc08a'];
const LH = 142;

const yShore = (x: number) => Math.round(72 + 1.5 * Math.sin(x / 21 + 1) + x * 0.025);
const yBackDune = (x: number) => (x > 70 ? PH : Math.round(72 - 8 * Math.sin((Math.PI * (x + 10)) / 80)));
const yHead = (x: number) => (x < 112 ? PH : Math.round(Math.max(58 + 0.8 * Math.sin(x / 6), 88 - (x - 112) * 1.9)));
const yFront = (x: number) => Math.round(81 + 1.5 * Math.sin(x / 13 + 2) + Math.sin(x / 5.3));

/** Bow to the right; the mainsail and the Danish pennant trail to the left (downwind). */
const BOAT = ['....rm.....', '....wm.....', '...wwmj....', '..wwwmj....', '.wwwwmjj...', 'wwwwwmjjj..', '.....m.....', 'HsHHHHHHHHH', '.HHHHHHHH..'];
const DINGHY = ['..HHHHH..', '.HsssssH.', 'HHHHHHHHH'];
const GULL = [['ww.ww', '..w..'], ['.....', 'wwwww']];

/** Wave rows: y, dash spacing, dash length, speed (px/s at calm). Rows above the boat's hull are drawn behind it. */
const WAVES = [
  { y: 55, L: 9, d: 2, v: 1.5 },
  { y: 58, L: 12, d: 2, v: 2 },
  { y: 62, L: 15, d: 3, v: 3 },
  { y: 67, L: 19, d: 4, v: 4 },
];

const boatOut = (s: SceneState) => s.windAmt <= 0.75 && !['storm', 'pour', 'hail', 'snow', 'sleet'].includes(s.kind);

interface SeasideState {
  sea: HTMLCanvasElement;
  boatOut: boolean;
  boatX0: number;
  gullX0: number;
  tufts: { x: number; y: number; h: number; p: number }[];
  caps: { x: number; y: number; p: number }[];
}

/** Sea with a dithered depth gradient, pre-rendered once per state so drawBack is a single blit. */
function seaCanvas(P: Palette, R: Rand): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = PW;
  cv.height = PH;
  const c = cv.getContext('2d')!;
  const cols = [darken(P.water, 0.14), P.water, lighten(P.water, 0.08)];
  for (let y = HZ; y < PH; y++) {
    const t = Math.min(1, (y - HZ) / 26) * 2;
    const b = Math.min(1, Math.floor(t));
    const fr = t - b;
    for (let x = 0; x < PW; x++) px(c, x, y, cols[fr > (BAYER[y & 3][x & 3] + 0.5) / 16 ? b + 1 : b]);
  }
  px(c, 0, HZ, darken(P.water, 0.3), PW, 1);
  for (let i = 0; i < 10; i++) px(c, Math.floor(R() * 118), 54 + Math.floor(R() * 16), mix(P.water, P.waterHi, 0.5), 2 + Math.floor(R() * 3), 1);
  return cv;
}

function waveRows(c: Ctx, P: Palette, s: SceneState, t: number, rows: typeof WAVES): void {
  const wa = s.windAmt;
  const choppy = s.kind === 'storm' || wa > 0.6;
  const amp = choppy ? 1 : 0;
  const trough = darken(P.water, 0.12);
  const cap = P.shade('#f4fbff');
  for (let r = 0; r < rows.length; r++) {
    const W = rows[r];
    const m = PW + W.L;
    const off = t * W.v * (1 + wa * 3) - r * 5;
    for (let k = 0; k * W.L < m; k++) {
      const x = ((((k * W.L - off) % m) + m) % m) - W.L;
      const y = W.y + Math.round(Math.sin(t * (1.5 + wa * 2) + k * 1.7 + r) * amp);
      px(c, x, y, P.waterHi, W.d, 1);
      px(c, x + 1, y + 1, trough, W.d, 1);
      if (choppy && k % 2 === 0) px(c, x + (W.d >> 1), y - 1, cap);
    }
  }
}

function lighthouse(c: Ctx, P: Palette, base: number): void {
  const red = P.shade('#d64541');
  const dark = P.shade('#3b3f46');
  const shadeT = darken(P.tower, 0.1);
  for (let i = 0; i < 19; i++) {
    const w = i < 7 ? 6 : i < 14 ? 5 : 4;
    const x0 = LH - (w >> 1);
    const y = base - 1 - i;
    const col = i >= 9 && i <= 11 ? red : P.tower;
    px(c, x0, y, col, w, 1);
    px(c, x0 + w - 1, y, i >= 9 && i <= 11 ? darken(red, 0.12) : shadeT);
  }
  px(c, LH - 1, base - 3, dark, 2, 3);
  px(c, LH, base - 15, dark);
  px(c, LH - 4, base - 20, dark, 8, 1);
  px(c, LH - 2, base - 23, dark, 1, 3);
  px(c, LH + 1, base - 23, dark, 1, 3);
  px(c, LH - 1, base - 23, P.lit ? '#ffe28a' : P.shade('#bfe0ef'), 2, 3);
  px(c, LH - 2, base - 24, red, 4, 1);
  px(c, LH - 1, base - 25, red, 2, 1);
  px(c, LH, base - 26, dark);
}

function hut(c: Ctx, x: number, base: number, col: string, P: Palette, s: SceneState): void {
  const wall = P.shade(col);
  const roof = s.snowCover ? P.snow : P.shade('#4a4f57');
  px(c, x - 1, base, darken(P.sand, 0.18), 9, 1);
  px(c, x, base - 6, wall, 7, 6);
  px(c, x + 6, base - 6, darken(wall, 0.15), 1, 6);
  px(c, x + 3, base - 4, P.shade('#fbfaf6'), 1, 4);
  px(c, x - 1, base - 7, roof, 9, 1);
  px(c, x + 1, base - 8, roof, 5, 1);
  px(c, x + 2, base - 9, roof, 3, 1);
  px(c, x + 3, base - 10, roof);
}

export const seaside: PixelSceneDef<SeasideState> = {
  walkY: 84,
  leaves: false,

  init(P: Palette, s: SceneState, R: Rand) {
    const tufts = [
      ...[45, 54].map((x) => ({ x, y: yBackDune(x) + 1, h: 3 })),
      ...[125, 133, 152, 157].map((x) => ({ x, y: yHead(x) + 1, h: 3 })),
      ...[6, 22, 40, 58, 77, 96, 115, 133, 150].map((x) => ({ x, y: yFront(x) + 1, h: 4 })),
    ].map((tf) => ({ ...tf, p: R() * 6 }));
    const nCaps = Math.max(0, Math.round((s.windAmt - 0.4) * 16)) + (s.kind === 'storm' ? 4 : 0);
    return {
      sea: seaCanvas(P, R),
      boatOut: boatOut(s),
      boatX0: R() * PW,
      gullX0: R() * PW,
      tufts,
      caps: Array.from({ length: nCaps }, () => ({ x: Math.floor(R() * 116), y: 54 + Math.floor(R() * 16), p: R() * 6 })),
    };
  },

  drawBack(c: Ctx, P: Palette, s: SceneState, t: number, _dt: number, st: SeasideState) {
    const wa = s.windAmt;
    c.drawImage(st.sea, 0, 0);
    waveRows(c, P, s, t, WAVES.slice(0, 2));

    if (st.boatOut) {
      const x = Math.floor((t * (1.5 + wa * 3) + st.boatX0) % (PW + 30)) - 15;
      const y = 53 + Math.round(Math.sin(t * (1.6 + wa * 1.5)) * 0.7);
      const heel = 0.1 + wa * 0.35 + Math.sin(t * 1.3) * 0.05 * (1 + wa * 2);
      const map = { w: P.shade('#fbfaf5'), j: P.shade('#efe9dc'), m: P.shade('#6b4a33'), r: P.shade('#d23c3c'), H: P.shade('#2f4f7a'), s: P.shade('#fbfaf5') };
      for (let r = 0; r < BOAT.length; r++) sprite(c, [BOAT[r]], map, x - Math.round(Math.max(0, 7 - r) * heel), y + r);
      if (P.lit) px(c, x + 5 - Math.round(7 * heel), y - 1, '#fff3b0');
      px(c, x - 1, y + 9, P.waterHi, 13, 1);
    }

    waveRows(c, P, s, t, WAVES.slice(2));
    const cap = P.shade('#f4fbff');
    for (const k of st.caps) {
      const v = Math.sin(t * 2.2 + k.p);
      if (v > 0.3) px(c, k.x, k.y, cap, v > 0.75 ? 3 : 2, 1);
      if (v > 0.75) px(c, k.x + 1, k.y - 1, cap);
    }

    // Swash: foam that runs up the beach and back. The land layer hides it wherever dunes or the headland sit.
    const sw = Math.sin(t * (1.2 + wa * 1.5));
    const foam = P.shade('#f4fbff');
    for (let x = 0; x < PW; x += 2) {
      const y = yShore(x) - 1 - Math.round((sw + 1) * 0.8 + Math.sin(x / 9) * 0.5);
      px(c, x, y, foam, 2, 1);
    }
  },

  drawLand(c: Ctx, P: Palette, s: SceneState, R: Rand) {
    const grass = P.shade(GRASS[s.season]);
    const dune = s.snowCover ? darken(P.sand, 0.04) : mix(P.sand, grass, 0.28);

    // Headland, rocks at its foot, and the lighthouse.
    hill(c, yHead, dune, 0.1);
    const rock = darken(P.stone, 0.18);
    for (const [rx, ry, rw] of [[113, 73, 3], [116, 71, 3], [110, 75, 2]]) {
      px(c, rx, ry, P.stone, rw, 2);
      px(c, rx, ry + 1, rock, rw, 1);
    }
    lighthouse(c, P, yHead(LH) + 1);

    // Beach with a wet strip along the waterline.
    const sandHi = lighten(P.sand, 0.08);
    const wet = darken(P.sand, 0.12);
    for (let x = 0; x < PW; x++) {
      const y = yShore(x);
      px(c, x, y, P.sand, 1, PH - y);
      if (yHead(x) > y + 1) {
        px(c, x, y, sandHi);
        px(c, x, y + 1, wet);
      }
    }
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(R() * PW);
      px(c, x, yShore(x) + 3 + Math.floor(R() * 6), darken(P.sand, 0.08));
    }

    // Back dune and bathing huts.
    hill(c, yBackDune, dune, 0.1);
    HUTS.forEach((col, i) => hut(c, 4 + i * 10, 76, col, P, s));
    if (!boatOut(s)) sprite(c, DINGHY, { H: P.shade('#2f4f7a'), s: P.shade('#fbfaf5') }, 70, 75);

    hill(c, yFront, mix(dune, '#ffffff', 0.06), 0.1);
    const speck = darken(dune, 0.1);
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(R() * PW);
      px(c, x, yFront(x) + 2 + Math.floor(R() * 5), speck);
    }
  },

  drawProps(c: Ctx, P: Palette, s: SceneState, t: number, _dt: number, st: SeasideState) {
    const wa = s.windAmt;

    // Marram grass: leans downwind (left) and sways harder with wind.
    const grass = P.shade(GRASS[s.season]);
    const dry = darken(grass, 0.2);
    const lean = wa > 0.5 ? -1 : 0;
    const amp = wa > 0.6 ? 1.6 : wa > 0.3 ? 1 : 0.6;
    for (const T of st.tufts) {
      const off = lean + Math.round(Math.sin(t * (1.5 + wa * 3) + T.p) * amp);
      pline(c, T.x, T.y, T.x - 2 + off, T.y - T.h + 1, dry);
      pline(c, T.x, T.y, T.x + 2 + off, T.y - T.h + 1, dry);
      pline(c, T.x, T.y, T.x + off, T.y - T.h, grass);
    }

    if (s.time !== 'night' && s.kind !== 'storm') {
      const gx = Math.floor((t * (6 + wa * 6) + st.gullX0) % (PW + 20)) - 10;
      sprite(c, GULL[Math.floor(t * 2) % 5 === 0 ? 1 : 0], { w: P.shade('#fbfbf8') }, gx, 46 + Math.round(Math.sin(t * 0.8) * 2));
    }

    // Rotating lamp seen from the side: the beam shrinks into the tower, then swings out the other way.
    if (P.lit) {
      const ly = yHead(LH) + 1 - 22;
      const a = t * 0.785;
      const cs = Math.cos(a);
      const dir = cs < 0 ? -1 : 1;
      const len = Math.round(Math.abs(cs) * 48);
      for (let dx = 2; dx <= len; dx++) {
        const hh = Math.floor(dx * 0.13);
        c.fillStyle = `rgba(255,236,150,${(0.5 * (1 - dx / 54)).toFixed(2)})`;
        c.fillRect(LH + dir * dx - (dir < 0 ? 1 : 0), ly - hh, 1, hh * 2 + 2);
      }
      const flash = Math.max(0, Math.sin(a)) ** 6;
      c.fillStyle = `rgba(255,243,176,${(0.3 + flash * 0.5).toFixed(2)})`;
      c.fillRect(LH - 2, ly - 1, 4, 4);
      if (flash > 0.4) {
        c.fillRect(LH - 4, ly, 8, 2);
        c.fillRect(LH - 1, ly - 3, 2, 8);
      }
    }
  },
};
