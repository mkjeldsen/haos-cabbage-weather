import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { darken, lighten, mix, type Rand } from '../../util';
import { type Ctx, pixTree, type PixelSceneDef, pline, px, PW, sprite } from './engine';

/** Copenhagen street: Nyhavn-coloured townhouses, a copper spire and dome, cars, a yellow bus and lots of bikes. */

type Gable = 'eave' | 'gable' | 'step';
/** [x, width, eave row, roof type, wall, roof]; the flat scene uses the same table ×3. */
const HOUSES: [number, number, number, Gable, string, string][] = [
  [0, 14, 52, 'eave', '#e3a948', '#a24a3a'],
  [14, 12, 47, 'gable', '#c4553b', '#4f4646'],
  [26, 15, 54, 'eave', '#86aecd', '#4f4646'],
  [41, 12, 50, 'step', '#ebc350', '#a24a3a'],
  [53, 14, 53, 'eave', '#f1ebdd', '#6aa892'],
  [67, 12, 48, 'gable', '#e99a7f', '#4f4646'],
  [79, 16, 55, 'eave', '#9cbf8f', '#a24a3a'],
  [95, 12, 49, 'step', '#c4553b', '#4f4646'],
  [107, 14, 52, 'eave', '#ebc350', '#4f4646'],
  [121, 12, 47, 'gable', '#86aecd', '#a24a3a'],
  [133, 15, 53, 'eave', '#e3a948', '#6aa892'],
  [148, 12, 49, 'gable', '#f1ebdd', '#4f4646'],
];
const AWNINGS = [2, 6, 10];
const DOORS = ['#3f5e4a', '#6b4430', '#2f4c6e'];
const BLOCKS = [[0, 12, 38], [9, 9, 34], [48, 14, 37], [60, 9, 33], [84, 12, 36], [118, 12, 35], [136, 10, 39], [146, 14, 34]];
const LAMPS = [34, 100, 140];
const TREES = [10, 64, 118];
/** First pavement row; house fronts end just above it. */
const GROUND = 70;
/** Wheel rows: bike lane, far car lane, near car lane. */
const LANE = 75, FAR = 80, NEAR = 85;
const WET = ['rain', 'pour', 'storm', 'hail', 'sleet'];
const HEAVY = ['pour', 'storm', 'snow', 'sleet', 'hail'];

const CAR = [
  '.....bbbbbb.....',
  '....bggbgggb....',
  '..bbbbbbbbbbbb..',
  '.bbbbbbbbbbbbbb.',
  'tbbbbbbbbbbbbbbh',
  '.dKKKddddddKKKd.',
  '..KKK......KKK..',
];

type RiderKind = 'bike' | 'cargo' | 'umbrella';
interface Rider { coat: string; helm: string; kind: RiderKind; v: number; ph: number }
interface CityState {
  trees: { x: number; p: number }[];
  riders: Rider[];
}

function drawCar(c: Ctx, x: number, y: number, body: string, flip: boolean, P: Palette, s: SceneState): void {
  if (P.lit) {
    c.fillStyle = 'rgba(255,243,176,.2)';
    c.fillRect(flip ? x - 12 : x + 16, y - 3, 12, 3);
  }
  sprite(c, CAR, {
    b: body, d: darken(body, 0.18), g: P.lit ? P.shade('#8fa6bd') : P.shade('#bcd6ea'), K: '#24272c',
    h: P.lit ? '#fff6cf' : P.shade('#f4f1e2'), t: P.lit ? '#ff4d4d' : P.shade('#b8322c'),
  }, x, y - 6, flip);
  if (s.snowCover) px(c, x + 5, y - 7, P.snow, 6, 1);
}

/** Yellow bus, 30px long; x is the left edge, dir -1 drives left. */
function drawBus(c: Ctx, x: number, y: number, dir: number, P: Palette, s: SceneState): void {
  const L = 30;
  const q = (dx: number, dy: number, col: string, w = 1, h = 1) => px(c, dir > 0 ? x + dx : x + L - dx - w, y + dy, col, w, h);
  const yel = P.shade('#f4c430');
  const glass = P.lit ? '#ffe9a6' : P.shade('#bcd6ea');
  if (P.lit) {
    c.fillStyle = 'rgba(255,243,176,.2)';
    c.fillRect(dir > 0 ? x + L : x - 12, y - 4, 12, 3);
  }
  q(0, -8, yel, L, 7);
  q(1, -9, s.snowCover ? P.snow : yel, L - 2, 1);
  q(0, -3, darken(yel, 0.22), L, 1);
  for (let i = 0; i < 5; i++) q(2 + i * 4, -7, glass, 3, 2);
  q(22, -7, glass, 2, 5);
  q(26, -7, glass, 4, 3);
  q(26, -8, P.lit ? '#ffb347' : darken(yel, 0.22), 3, 1);
  q(4, -2, '#24272c', 3, 2);
  q(22, -2, '#24272c', 3, 2);
  q(L - 1, -3, P.lit ? '#fff6cf' : P.shade('#f4f1e2'));
  q(0, -4, P.lit ? '#ff4d4d' : P.shade('#b8322c'));
}

/** Cyclist riding left; x is the bottom bracket, y the wheel row. */
function drawRider(c: Ctx, x: number, y: number, r: Rider, P: Palette, s: SceneState, t: number): void {
  // Drawn facing right in (dx, dy) and mirrored, so +dx is towards the front (screen left).
  const q = (dx: number, dy: number, col: string, w = 1, h = 1) => px(c, x - dx - w + 1, y + dy, col, w, h);
  const ink = P.shade('#2b2f36');
  const coat = P.shade(r.coat);
  const pants = P.shade('#33404f');
  const skin = P.shade('#f0c7a0');
  const cargo = r.kind === 'cargo';
  // 4×4 round wheels; a is the wheel's leftmost column.
  for (const a of [-5, cargo ? 5 : 2]) {
    q(a + 1, -3, ink, 2, 1);
    q(a, -2, ink, 1, 2);
    q(a + 3, -2, ink, 1, 2);
    q(a + 1, 0, ink, 2, 1);
  }
  q(-3, -2, ink, cargo ? 9 : 6, 1);
  q(-2, -4, ink, 2, 1);
  q(-1, -3, ink);
  q(3, -3, ink);
  q(2, -5, ink, 1, 2);
  // Pedalling leg.
  q(-1, -5, pants);
  const down = Math.floor(t * 7 + r.ph) % 2;
  q(down ? 0 : 1, -4, pants);
  q(down ? 0 : 1, -3, pants);
  q(-1, -7, coat, 2, 2);
  q(1, -6, coat);
  q(-1, -8, P.shade(r.helm));
  q(0, -8, skin);
  q(-1, -9, P.shade(r.helm), 2, 1);
  if (cargo) {
    q(4, -6, P.shade('#b07f4f'), 5, 3);
    q(6, -7, skin);
    q(6, -8, P.shade('#e8505b'));
  }
  if (r.kind === 'umbrella') {
    const sh = s.windAmt > 0.5 ? 1 : 0;
    q(1, -11, ink, 1, 4);
    q(-1 + sh, -12, P.shade('#e04f7a'), 5, 1);
    q(0 + sh, -13, P.shade('#e04f7a'), 3, 1);
  }
  if (P.lit) {
    q(cargo ? 9 : 3, -4, '#fff6cf');
    q(-4, -4, '#ff4d4d');
  }
}

export const city: PixelSceneDef<CityState> = {
  walkY: 72,

  init(_P: Palette, s: SceneState, R: Rand) {
    const riders: Rider[] = HEAVY.includes(s.kind)
      ? [{ coat: '#3c6e9e', helm: '#2b2f36', kind: 'umbrella', v: 8, ph: 40 }]
      : s.kind === 'rain'
        ? [{ coat: '#3c6e9e', helm: '#2b2f36', kind: 'umbrella', v: 8.5, ph: 30 }, { coat: '#e0b44a', helm: '#c94f4f', kind: 'bike', v: 12, ph: 140 }]
        : [
          { coat: '#c94f4f', helm: '#2b2f36', kind: 'bike', v: 12, ph: 20 },
          { coat: '#3c6e9e', helm: '#e0b44a', kind: 'cargo', v: 7.5, ph: 80 },
          { coat: '#e0b44a', helm: '#3c6e9e', kind: 'bike', v: 9.5, ph: 150 },
        ];
    return { trees: TREES.map((x) => ({ x, p: R() * 6 })), riders };
  },

  drawLand(c: Ctx, P: Palette, s: SceneState, R: Rand) {
    const win = () => (!P.lit ? P.window : R() < 0.42 ? P.window : P.shade('#41536a'));

    // Hazy skyline: blocks, a copper spire and a copper dome.
    const haze = mix(P.skyBot, P.shade('#7e8da0'), 0.5);
    const copper = mix(haze, P.shade('#5fa58c'), 0.75);
    for (const [x, w, top] of BLOCKS) {
      px(c, x, top, haze, w, GROUND - top);
      if (P.lit) for (let k = 0; k < 3; k++) if (R() < 0.6) px(c, x + 1 + Math.floor(R() * (w - 2)), top + 2 + Math.floor(R() * 8), mix(P.window, haze, 0.35));
    }
    px(c, 32, 30, haze, 6, GROUND - 30);
    px(c, 34, 33, darken(haze, 0.25), 2, 2);
    for (let r = 0; r < 17; r++) {
      const h = Math.floor(r / 5);
      px(c, 34 - h, 13 + r, copper, 2 + 2 * h, 1);
      px(c, 35, 13 + r, darken(copper, 0.12), 1 + h, 1);
    }
    px(c, 34, 10, copper, 1, 3);
    px(c, 104, 39, lighten(haze, 0.06), 12, GROUND - 39);
    for (let r = 0; r < 6; r++) {
      const h = Math.round(Math.sqrt(36 - r * r));
      px(c, 110 - h, 38 - r, copper, 2 * h, 1);
    }
    px(c, 106, 35, lighten(copper, 0.25), 2, 1);
    px(c, 109, 30, copper, 2, 3);
    px(c, 109, 28, copper, 1, 2);

    // Townhouses.
    const flowers = (s.season === 'spring' || s.season === 'summer') && !s.snowCover;
    HOUSES.forEach(([x, w, e, type, wallDay, roofDay], i) => {
      const wall = P.shade(wallDay);
      const trim = P.house;
      const roof = s.snowCover ? P.snow : P.shade(roofDay);
      const cap = s.snowCover ? P.snow : trim;
      const mid = x + Math.floor(w / 2);
      px(c, x, e, wall, w, GROUND - e);
      px(c, x + w - 1, e, darken(wall, 0.1), 1, GROUND - e);
      if (type === 'eave') {
        px(c, x + w - 4, e - 7, P.shade('#7d4536'), 2, 3);
        if (s.snowCover) px(c, x + w - 4, e - 8, P.snow, 2, 1);
        for (let r = 0; r < 5; r++) px(c, x - 1 + r, e - 1 - r, roof, w + 2 - 2 * r, 1);
        px(c, x - 1, e - 1, P.shade('#5a4a44'), w + 2, 1);
        px(c, mid - 2, e - 4, trim, 4, 3);
        px(c, mid - 1, e - 3, win(), 2, 1);
        if (s.snowCover) px(c, mid - 2, e - 5, P.snow, 4, 1);
      } else if (type === 'gable') {
        for (let r = 0; r * 2 < w; r++) {
          const x0 = x + r, x1 = x + w - 1 - r;
          px(c, x0, e - 1 - r, wall, x1 - x0 + 1, 1);
          px(c, x0, e - 1 - r, roof);
          px(c, x1, e - 1 - r, roof);
        }
        px(c, mid - 1, e - 3, win(), 2, 1);
      } else {
        for (let k = 0; k < 3; k++) {
          px(c, x + 2 * k, e - 2 * (k + 1), wall, w - 4 * k, 2);
          px(c, x + 2 * k, e - 2 * (k + 1), cap, 2, 1);
          px(c, x + w - 2 - 2 * k, e - 2 * (k + 1), cap, 2, 1);
        }
        px(c, mid - 1, e - 3, win(), 2, 1);
      }
      px(c, x, e, trim, w, 1);

      const n = w >= 14 ? 3 : 2;
      for (let y = e + 3; y <= 60; y += 5) {
        for (let k = 0; k < n; k++) {
          const wx = x + Math.round((w * (k + 0.5)) / n) - 1;
          px(c, wx, y, win(), 2, 2);
          px(c, wx, y + 2, flowers && R() < 0.3 ? P.shade('#e8505b') : trim, 2, 1);
        }
      }

      const sw = Math.round(w * 0.42);
      px(c, x + 1, 64, P.lit ? P.window : P.shade('#6f8aa6'), sw, 3);
      px(c, x + 1, 67, trim, sw, 1);
      px(c, x + Math.round(w * 0.62), 65, P.shade(DOORS[i % 3]), 2, 5);
      if (AWNINGS.includes(i)) {
        for (let k = 0; k < sw + 2; k++) px(c, x + k, 62, k % 2 ? trim : P.shade('#d64545'), 1, 2);
        if (s.snowCover) px(c, x, 61, P.snow, sw + 2, 1);
      }
    });

    // Pavement, bike lane, road, far pavement.
    let asph = P.shade('#5a5f69');
    let lane = P.shade('#6c717b');
    if (s.snowCover) {
      asph = mix(asph, P.snow, 0.35);
      lane = mix(lane, P.snow, 0.55);
    }
    const pave = s.snowCover ? P.snow : P.shade('#cdc6b8');
    const curb = P.shade('#a29c90');
    px(c, 0, GROUND, pave, PW, 2);
    px(c, 0, 72, curb, PW, 1);
    px(c, 0, 73, lane, PW, 3);
    px(c, 0, 76, curb, PW, 1);
    px(c, 0, 77, asph, PW, 9);
    px(c, 0, 86, curb, PW, 1);
    px(c, 0, 87, pave, PW, 1);
    for (let i = 0; i < 24; i++) px(c, Math.floor(R() * PW), GROUND + Math.floor(R() * 2), darken(pave, 0.07));
    for (let x = 2; x < PW; x += 12) px(c, x, 81, P.shade('#ece8da'), 6, 1);
    if (s.snowCover) {
      px(c, 0, 80, mix(asph, P.shade('#5a5f69'), 0.5), PW, 1);
      px(c, 0, 85, mix(asph, P.shade('#5a5f69'), 0.5), PW, 1);
    }
    if (WET.includes(s.kind)) {
      const shine = lighten(asph, 0.16);
      for (let i = 0; i < 22; i++) px(c, Math.floor(R() * PW), 77 + Math.floor(R() * 9), shine, 2 + Math.floor(R() * 4), 1);
      if (P.lit) for (const lx of LAMPS) for (let k = 0; k < 4; k++) px(c, lx + 1 + (k >> 1), 78 + k * 2, 'rgba(255,226,160,.4)', 4 - 2 * (k >> 1), 1);
    }
    if (s.season === 'autumn' && !s.snowCover) {
      const cols = ['#e8a33d', '#d9662f', '#c9483d'];
      for (let i = 0; i < 14; i++) px(c, Math.floor(R() * PW), GROUND + Math.floor(R() * 2), P.shade(cols[i % 3]));
    }

    // Street lamps (light cones are part of the static layer).
    const pole = P.shade('#3a3f47');
    for (const x of LAMPS) {
      if (P.lit) {
        c.fillStyle = 'rgba(255,231,163,.13)';
        for (let y = 57; y < 72; y++) {
          const h = Math.floor((y - 57) / 3);
          c.fillRect(x + 2 - h, y, 2 + 2 * h, 1);
        }
      }
      px(c, x, 55, pole, 1, 17);
      px(c, x, 54, pole, 5, 1);
      px(c, x + 1, 55, pole, 4, 1);
      px(c, x + 2, 56, P.lit ? '#fff3b0' : P.shade('#d8d4c8'), 2, 1);
      if (s.snowCover) px(c, x + 1, 53, P.snow, 4, 1);
      if (P.lit) {
        c.fillStyle = 'rgba(255,231,163,.22)';
        c.fillRect(x, 55, 6, 4);
        c.fillRect(x + 1, 53, 4, 7);
      }
    }
    // Flag pole on the green house.
    pline(c, 93, 62, 90, 59, P.shade('#e8e4da'));
  },

  drawProps(c: Ctx, P: Palette, s: SceneState, t: number, _dt: number, st: CityState) {
    const wa = s.windAmt;
    const amp = wa > 0.6 ? 1.6 : wa > 0.35 ? 0.8 : 0.4;
    for (const T of st.trees) pixTree(c, T.x, 71, 4, 4, P, s, Math.round(Math.sin(t * (1.5 + wa * 3) + T.p) * amp));

    // Dannebrog: hangs limp in calm air, flies left with the wind otherwise.
    const red = P.shade('#c8102e'), white = P.house;
    if (wa < 0.3) {
      for (let k = 0; k < 5; k++) for (let r = 0; r < 3; r++) px(c, 90 - r, 60 + k, k === 1 || r === 1 ? white : red);
    } else {
      const fr = Math.floor(t * (2 + wa * 8)) % 2;
      for (let k = 0; k < 5; k++) for (let r = 0; r < 3; r++) px(c, 89 - k, 59 + r + (fr && k >= 3 ? 1 : 0), k === 1 || r === 1 ? white : red);
    }

    // Bike lane flows right-to-left.
    for (const r of st.riders) drawRider(c, 168 - Math.floor((t * r.v + r.ph) % 190), LANE, r, P, s, t);

    // Far lane (right-to-left): blue car then the bus.
    const lead = 162 - Math.floor((t * 13.5 + 80) % 252);
    drawCar(c, lead, FAR, P.shade('#3f7fc1'), true, P, s);
    drawBus(c, lead + 58, FAR, -1, P, s);

    // Near lane (left-to-right): three cars.
    const head = -16 + Math.floor((t * 25) % 374);
    const near: [number, string][] = [[0, '#d2453c'], [-77, '#eef0f2'], [-187, '#4f9d6a']];
    for (const [off, col] of near) {
      const x = head + off;
      if (x > -28 && x < PW) drawCar(c, x, NEAR, P.shade(col), false, P, s);
    }
  },
};
