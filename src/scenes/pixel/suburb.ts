import type { Palette } from '../../palette';
import type { SceneState, Season } from '../../types';
import { darken, lighten, mix, type Rand } from '../../util';
import { type Ctx, hill, pixPine, pixTree, type PixelSceneDef, px, PW, sprite } from './engine';

/**
 * Danish parcelhuskvarter: a yellow-brick bungalow behind a beech hedge, a carport, a white "vinkelhus",
 * a trampoline in the back garden, a robot lawnmower and Dannebrog on the garden flagpole.
 * Same street as the flat scene at 1/3 scale.
 */

const WET = ['rain', 'pour', 'storm', 'hail', 'sleet'];
/** Weather that keeps the kid off the trampoline and the mower in its dock. */
const INDOORS = ['rain', 'pour', 'storm', 'snow', 'sleet', 'hail'];
const BEECH: Record<Season, string> = { spring: '#6aa84a', summer: '#4f8c3e', autumn: '#b4793a', winter: '#9a6a3c' };
const DISTANT: [number, number, string][] = [[65, 10, '#a24a3a'], [79, 11, '#4f4646'], [140, 10, '#a24a3a'], [152, 10, '#4f4646']];
const POLE = 93, HOIST = 50;
const TRAMP = 80, MAT = 62;
const DOCK = 100, MOW_Y = 73, MOW_RUN = 31, MOW_T = 30;

const yFar = (x: number) => Math.round(58 + 1.5 * Math.sin(x / 19) + Math.sin(x / 7 + 1));
const yMid = (x: number) => Math.round(64 + Math.sin(x / 26 + 1));

const CAR = [
  '.....bbbbbb.....',
  '....bggbgggb....',
  '..bbbbbbbbbbbb..',
  '.bbbbbbbbbbbbbb.',
  'tbbbbbbbbbbbbbbh',
  '.dKKKddddddKKKd.',
  '..KKK......KKK..',
];
const KID = ['s.s', 'tht', 'tft', '.t.', 'p.p'];
const MOWER = ['.ooo.', 'ooooe', 'k...k'];
const SNOWMAN = ['.kkk.', '.wwW.', '.wwo.', '.rrr.', 'twwWt', '.wwW.', 'wwwwW', 'WwwWW'];

interface SuburbState {
  kid: boolean;
  mowing: boolean;
  mowPh: number;
  trees: { x: number; base: number; r: number; h: number; p: number }[];
  back: { p: number; q: number };
}

const swayOff = (s: SceneState, t: number, p: number) => {
  const wa = s.windAmt;
  const amp = wa > 0.6 ? 1.6 : wa > 0.35 ? 0.8 : 0.4;
  return Math.round(Math.sin(t * (1.5 + wa * 3) + p) * amp);
};

/** Dannebrog by day, the long split pennant ("vimpel") from sunset to sunrise. Bends and ripples to the left. */
function drawFlag(c: Ctx, P: Palette, s: SceneState, t: number): void {
  const wa = s.windAmt;
  const up = s.sunElev >= 0;
  const red = P.shade('#c8102e'), white = P.house;
  const L = up ? 8 : 15, H = up ? 5 : 3;
  const colour = (k: number, r: number): string | null => {
    if (up) return k === 2 || r === 2 ? white : red;
    if (k < 7) return r === 1 ? white : red;
    if (k < 13) return r === 1 ? red : null;
    return r === 1 ? null : red;
  };
  const droop = (1 - Math.min(1, wa * (up ? 1.5 : 1.8))) * (up ? 1.25 : 1.5);
  const om = 3 + wa * 9;
  const A = 0.05 + wa * 0.1;
  let x = POLE - 1, y = HOIST + (H - 1) / 2, ang = 0;
  for (let k = 0; k < L; k += 0.5) {
    const ki = Math.floor(k);
    const sn = Math.sin(ang), cs = Math.cos(ang);
    for (let r = 0; r < H; r++) {
      const col = colour(ki, r);
      if (!col) continue;
      const o = r - (H - 1) / 2;
      px(c, Math.round(x + o * sn), Math.round(y + o * cs), col);
    }
    ang += 0.5 * (droop / L + A * Math.sin(om * t - k * 0.9) * Math.min(1, k / 2));
    x -= Math.cos(ang) * 0.5;
    y += Math.sin(ang) * 0.5;
  }
}

export const suburb: PixelSceneDef<SuburbState> = {
  walkY: 77,
  spots: [[135, 75], [26, 77], [77, 77], [87, 74]],

  init(P: Palette, s: SceneState, R: Rand) {
    return {
      kid: s.time !== 'night' && !INDOORS.includes(s.kind) && s.windAmt <= 0.6,
      mowing: !P.lit && s.season !== 'winter' && !s.snowCover && !INDOORS.includes(s.kind),
      mowPh: R() * MOW_T,
      trees: [
        { x: 4, base: 71, r: 5, h: 7 },
        { x: 151, base: 70, r: 5, h: 6 },
      ].map((tr) => ({ ...tr, p: R() * 6 })),
      back: { p: R() * 6, q: R() * 6 },
    };
  },

  drawBack(c: Ctx, P: Palette, s: SceneState, t: number, _dt: number, st: SuburbState) {
    // Garden trees behind the houses (the land layer hides their trunks).
    pixTree(c, 33, 59, 5, 3, P, s, swayOff(s, t, st.back.p));
    pixPine(c, 101, 59, 13, P, s, Math.round(swayOff(s, t, st.back.q) * 0.5));
  },

  drawLand(c: Ctx, P: Palette, s: SceneState, R: Rand) {
    const win = () => (!P.lit ? P.window : R() < 0.55 ? P.window : P.shade('#41536a'));
    const pwin = (x: number, y: number, w: number, h: number, panes: number, frame: string) => {
      px(c, x - 1, y - 1, frame, w + 2, h + 2);
      px(c, x, y, win(), w, h);
      for (let k = 1; k < panes; k++) px(c, x + Math.round((w * k) / panes), y, frame, 1, h);
    };
    const glow = (x: number, y: number, w: number, h: number) => {
      if (!P.lit) return;
      c.fillStyle = 'rgba(255,231,163,.2)';
      c.fillRect(x, y, w, h);
      c.fillRect(x + 1, y - 1, w - 2, h + 2);
    };

    // Far hill with the rooftops of the next street.
    hill(c, yFar, P.far, 0.12);
    for (const [x, w, roofDay] of DISTANT) {
      const roof = s.snowCover ? mix(P.snow, P.far, 0.3) : mix(P.shade(roofDay), P.far, 0.5);
      px(c, x, 57, mix(P.shade('#efe6d4'), P.far, 0.5), w, 4);
      for (let r = 0; r < 3; r++) px(c, x - 1 + r, 56 - r, roof, w + 2 - 2 * r, 1);
      if (P.lit && R() < 0.7) px(c, x + 2 + Math.floor(R() * (w - 4)), 58, mix(P.window, P.far, 0.3));
    }
    hill(c, yMid, P.mid, 0.1);

    // Back-garden fence and the trampoline.
    const wood = P.shade('#a07850');
    px(c, 71, 61, wood, 26, 5);
    for (let x = 72; x < 97; x += 2) px(c, x, 61, darken(wood, 0.22), 1, 5);
    if (s.snowCover) px(c, 71, 60, P.snow, 26, 1);
    const ink = P.shade('#2b2f36');
    // Safety net: two poles, a sagging top rope and a faint mesh.
    c.fillStyle = 'rgba(30,35,48,.16)';
    for (let y = 56; y < MAT; y += 2) for (let x = TRAMP - 6 + (y % 4 ? 1 : 0); x <= TRAMP + 6; x += 2) c.fillRect(x, y, 1, 1);
    for (let x = TRAMP - 6; x <= TRAMP + 6; x++) px(c, x, Math.abs(x - TRAMP) < 4 ? 55 : 54, ink);
    px(c, TRAMP - 7, 54, ink, 1, MAT - 54);
    px(c, TRAMP + 7, 54, ink, 1, MAT - 54);
    px(c, TRAMP - 6, MAT, s.snowCover ? P.snow : P.shade('#23262c'), 13, 1);
    px(c, TRAMP - 7, MAT + 1, P.shade('#3d7fc4'), 15, 1);
    for (const dx of [-6, -2, 2, 6]) px(c, TRAMP + dx, MAT + 2, ink, 1, 3);

    // Front lawns.
    px(c, 0, 68, P.front, PW, 8);
    px(c, 0, 68, lighten(P.front, 0.1), PW, 1);

    // House A: yellow brick, red tiled hip roof, behind a beech hedge.
    const roofA = s.snowCover ? P.roof : P.shade('#b5523b');
    px(c, 36, 50, P.shade('#9a4a36'), 3, 4);
    px(c, 35, 49, P.shade('#6e3628'), 5, 1);
    if (s.snowCover) px(c, 35, 48, P.snow, 5, 1);
    for (let y = 52; y <= 59; y++) {
      const inset = 59 - y;
      px(c, 7 + inset, y, !s.snowCover && (y === 52 || y % 2 === 0) ? darken(roofA, 0.14) : roofA, 46 - 2 * inset, 1);
    }
    px(c, 7, 60, P.shade('#5a4a44'), 46, 1);
    const brick = P.shade('#e0bb6c');
    px(c, 10, 61, brick, 40, 7);
    for (let i = 0; i < 26; i++) px(c, 10 + Math.floor(R() * 40), 61 + Math.floor(R() * 7), lighten(brick, 0.18));
    px(c, 10, 68, P.shade('#8a7f74'), 40, 1);
    pwin(12, 62, 9, 4, 3, P.house);
    pwin(32, 62, 7, 4, 2, P.house);
    pwin(42, 62, 6, 4, 2, P.house);
    px(c, 24, 61, P.shade('#3f5e4a'), 4, 7);
    px(c, 25, 62, P.lit ? P.window : P.shade('#9fb7cc'), 1, 4);
    glow(28, 61, 3, 3);
    px(c, 29, 62, P.lit ? '#fff3b0' : P.shade('#3a3f47'), 1, 2);

    // Carport with the family car.
    const cwood = P.shade('#6b5444');
    c.fillStyle = 'rgba(0,0,0,.1)';
    c.fillRect(50, 61, 22, 10);
    px(c, 51, 61, cwood, 1, 10);
    px(c, 69, 61, cwood, 1, 10);
    const body = P.shade('#d2453c');
    sprite(c, CAR, { b: body, d: darken(body, 0.18), g: P.lit ? P.shade('#8fa6bd') : P.shade('#bcd6ea'), K: '#24272c', h: P.shade('#f4f1e2'), t: P.shade('#b8322c') }, 53, 64);
    if (s.snowCover) px(c, 58, 63, P.snow, 6, 1);
    px(c, 50, 59, cwood, 22, 1);
    px(c, 50, 60, P.house, 22, 1);
    if (s.snowCover) px(c, 50, 58, P.snow, 22, 1);

    // House B: white render, dark roof, gabled wing to the street.
    const roofB = s.snowCover ? P.roof : P.shade('#4a4d55');
    const roofDk = P.shade('#363940');
    const frame = P.shade('#3c3f44');
    const plinth = P.shade('#8a8f96');
    px(c, 128, 49, P.shade('#5d5f66'), 3, 4);
    px(c, 127, 48, roofDk, 5, 1);
    if (s.snowCover) px(c, 127, 47, P.snow, 5, 1);
    for (let y = 52; y <= 58; y++) {
      const inset = Math.round(((59 - y) * 6) / 7);
      px(c, 109 + inset, y, !s.snowCover && y % 2 === 1 ? darken(roofB, 0.12) : roofB, 31 - 2 * inset, 1);
    }
    px(c, 108, 59, roofDk, 33, 1);
    px(c, 111, 60, P.house, 27, 7);
    px(c, 137, 60, darken(P.house, 0.1), 1, 7);
    px(c, 111, 67, plinth, 27, 1);
    pwin(117, 62, 5, 4, 1, frame);
    pwin(130, 62, 5, 4, 2, frame);
    px(c, 124, 61, P.shade('#2f4c6e'), 4, 6);
    px(c, 125, 62, P.lit ? P.window : P.shade('#9fb7cc'), 2, 1);
    for (let r = 0; r <= 7; r++) {
      const y = 60 - r, x0 = 97 + r, x1 = 111 - r;
      if (x1 >= x0) px(c, x0, y, P.house, x1 - x0 + 1, 1);
      px(c, x0 - 1, y, roofB);
      px(c, x1 + 1, y, roofB);
    }
    px(c, 104, 52, roofB);
    px(c, 95, 61, roofB);
    px(c, 113, 61, roofB);
    px(c, 97, 61, P.house, 15, 7);
    px(c, 97, 68, plinth, 15, 1);
    px(c, 104, 57, win());
    pwin(99, 63, 10, 3, 4, frame);
    if ((s.season === 'spring' || s.season === 'summer') && !s.snowCover) {
      const cols = ['#e8505b', '#ffd166', '#f6c4d8', '#b892ff'];
      for (let x = 106; x < 137; x += 2) if (x < 122 || x > 128) px(c, x, x < 112 ? 69 : 68, P.shade(cols[(x >> 1) % 4]));
    }

    // Flagpole (the flag itself is animated).
    px(c, POLE, 49, P.shade('#f2f5f7'), 1, 22);
    px(c, POLE, 48, P.shade('#e8c15a'));

    // Driveway, garden path, stepping stones.
    const pave = s.snowCover ? mix(P.snow, '#7f93b0', 0.12) : P.shade('#bdb6a8');
    px(c, 50, 71, pave, 22, 5);
    px(c, 24, 69, pave, 5, 7);
    if (!s.snowCover) {
      px(c, 50, 73, darken(pave, 0.1), 22, 1);
      for (const [x, y] of [[126, 69], [125, 71], [126, 73]]) px(c, x, y, pave, 2, 1);
    }

    // Mower dock.
    const grey = P.shade('#5d6168');
    px(c, DOCK - 2, 68, grey, 5, 1);
    px(c, DOCK - 4, 69, grey, 9, 1);
    px(c, DOCK - 4, 70, grey, 1, 3);
    px(c, DOCK + 4, 70, grey, 1, 3);
    px(c, DOCK - 4, MOW_Y, grey, 9, 1);
    if (s.snowCover) px(c, DOCK - 3, 67, P.snow, 7, 1);

    // Garden bollard by the driveway.
    glow(69, 68, 5, 4);
    px(c, 71, 71, P.shade('#3a3f47'), 1, 4);
    px(c, 70, 70, P.lit ? '#fff3b0' : P.shade('#d8d4c8'), 3, 1);
    px(c, 70, 69, s.snowCover ? P.snow : P.shade('#3a3f47'), 3, 1);

    if (s.snowCover) sprite(c, SNOWMAN, { k: P.shade('#2b2f36'), w: P.snow, W: mix(P.snow, '#6f86a8', 0.35), o: P.shade('#f28c28'), r: P.shade('#d64545'), t: P.trunk }, 115, 67);

    // Beech hedge with a gate gap, and the red mailbox.
    const beech = P.shade(BEECH[s.season]);
    for (const [x0, x1] of [[0, 23], [29, 49]]) {
      px(c, x0, 71, beech, x1 - x0 + 1, 5);
      for (let x = x0; x <= x1; x++) if (x % 4 === 1 || x % 4 === 2) px(c, x, 70, beech);
      px(c, x0, 75, darken(beech, 0.22), x1 - x0 + 1, 1);
      for (let i = 0; i < (x1 - x0) / 3; i++) px(c, x0 + Math.floor(R() * (x1 - x0)), 71 + Math.floor(R() * 3), lighten(beech, 0.18));
      if (s.snowCover) px(c, x0, 70, P.snow, x1 - x0 + 1, 1);
    }
    const red = P.shade('#c8102e');
    px(c, 20, 73, P.shade('#3a3f47'), 1, 4);
    px(c, 19, 70, red, 4, 3);
    px(c, 20, 71, darken(red, 0.5), 2, 1);
    if (s.snowCover) px(c, 19, 69, P.snow, 4, 1);

    // Pavement, kerbs, asphalt, verge.
    let asph = P.shade('#5a5f69');
    if (s.snowCover) asph = mix(asph, P.snow, 0.4);
    const walk = s.snowCover ? P.snow : P.shade('#cdc6b8');
    const curb = P.shade('#a29c90');
    px(c, 0, 76, walk, PW, 2);
    if (!s.snowCover) for (let x = 2; x < PW; x += 5) px(c, x, 76, darken(walk, 0.1), 1, 2);
    px(c, 0, 78, curb, PW, 1);
    px(c, 0, 79, asph, PW, 7);
    px(c, 105, 82, darken(asph, 0.2), 4, 1);
    px(c, 0, 86, curb, PW, 1);
    px(c, 0, 87, P.front, PW, 1);
    if (s.snowCover) {
      px(c, 0, 80, mix(asph, P.shade('#5a5f69'), 0.5), PW, 1);
      px(c, 0, 84, mix(asph, P.shade('#5a5f69'), 0.5), PW, 1);
    }
    if (WET.includes(s.kind)) {
      const shine = lighten(asph, 0.16);
      for (let i = 0; i < 20; i++) px(c, Math.floor(R() * PW), 79 + Math.floor(R() * 7), shine, 2 + Math.floor(R() * 4), 1);
    }
    if (s.season === 'autumn' && !s.snowCover) {
      const cols = ['#e8a33d', '#d9662f', '#c9483d'];
      for (let i = 0; i < 18; i++) px(c, Math.floor(R() * PW), i < 10 ? 76 + Math.floor(R() * 2) : 69 + Math.floor(R() * 6), P.shade(cols[i % 3]));
    }
  },

  drawProps(c: Ctx, P: Palette, s: SceneState, t: number, _dt: number, st: SuburbState) {
    for (const T of st.trees) pixTree(c, T.x, T.base, T.r, T.h, P, s, swayOff(s, t, T.p));

    if (st.kid) {
      const ph = (t / 0.85) % 1;
      const h = Math.round(4 * ph * (1 - ph) * 6);
      sprite(c, KID, { s: P.shade('#f0c7a0'), f: P.shade('#f0c7a0'), h: P.shade('#8a5a2b'), t: P.shade('#e8505b'), p: P.shade('#3c6e9e') }, TRAMP - 1, MAT - 5 - h);
    }

    // Robot mower: out and back across the lawn of house B by day, docked otherwise.
    const map = { o: P.shade('#e8702a'), e: P.shade('#7cfc9a'), k: '#24272c' };
    if (st.mowing) {
      const u = ((t + st.mowPh) % MOW_T) / MOW_T;
      const out = u < 0.5;
      const x = DOCK + Math.round((out ? u * 2 : 2 - u * 2) * MOW_RUN);
      sprite(c, MOWER, map, x - 2, MOW_Y - 2, !out);
    } else {
      sprite(c, MOWER, map, DOCK - 2, MOW_Y - 2);
    }

    drawFlag(c, P, s, t);

    if (s.season === 'winter') {
      for (const [cx, cy] of [[37, 47], [129, 46]]) {
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.4 + k / 3) % 1;
          c.fillStyle = `rgba(215,220,226,${((1 - ph) * 0.7).toFixed(2)})`;
          const sz = ph > 0.4 ? 2 : 1;
          c.fillRect(cx - Math.round(ph * (2 + s.windAmt * 10)), cy - Math.round(ph * 7), sz, sz);
        }
      }
    }
  },
};
