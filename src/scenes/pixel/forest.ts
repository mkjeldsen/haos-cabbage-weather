import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { darken, lighten, mix, type Rand } from '../../util';
import { kidOutside } from '../flat/forest';
import { type Ctx, hill, PH, pixPine, pixTree, type PixelSceneDef, pline, px, PW, sprite } from './engine';

/** Danish forest clearing: rows of pines and beeches, a kid on a rope swing, a roe deer, an owl at night. */

const yFar = (x: number) => Math.round((170 + 5 * Math.sin((x * 3) / 55) + 3 * Math.sin((x * 3) / 21 + 1)) / 3);
const yMid = (x: number) => Math.round((196 + 4 * Math.sin((x * 3) / 70 + 2) + 2 * Math.sin((x * 3) / 31)) / 3);
const yFront = (x: number) => Math.round((225 + 3 * Math.sin((x * 3) / 90 + 1)) / 3);

/** The big tree's branch: from the trunk (25,57) out to (65,53). */
const branchY = (x: number) => Math.round(57 - ((x - 25) / 40) * 4);
const PIVOT = { x: 54, y: 55, len: 19 };
const DEER_Y = 77;
const DEER_CYCLE = 40;

const KID = ['..hhh..', '.hhhhh.', '.fefef.', '..fff..', 'f.sss.f', '.sssss.', '..sss..', '..ppp..', '..p.p..', '..k.k..'];
const DEER_A = ['.a.a........', '..a.a.......', '.cec........', 'kccc........', '..cc........', '..ccccccccw.', '..cccccccccw', '...bbbbbbbw.', '...c.c..c.c.', '...c.c..c.c.'];
const DEER_B = ['.a.a........', '..a.a.......', '.cec........', 'kccc........', '..cc........', '..ccccccccw.', '..cccccccccw', '...bbbbbbbw.', '....cc...cc.', '...c..c.c..c'];
const DEER_G = ['............', '............', '............', '............', '............', '..ccccccccw.', '.ccccccccccw', 'cc.bbbbbbbw.', 'ec.c.c..c.c.', 'kc.c.c..c.c.'];
const OWL = ['b...b', 'bbbbb', 'bEbEb', 'ffkff', '.bbb.', '.o.o.'];

interface ForestState {
  trees: { x: number; base: number; pine: boolean; size: number; p: number }[];
  fore: HTMLCanvasElement;
  deerPhase: number;
  swingT: number;
  swingA: number;
  kid: boolean;
  flies: { x: number; y: number; p: number }[];
}

/** Swing tree, log and mushrooms: static, but in front of the mid trees and the deer. */
function drawFore(c: Ctx, P: Palette, s: SceneState): void {
  // Trunk, wider at the foot, with a darker edge.
  for (let y = 48; y < PH; y++) {
    const w = 5 + Math.max(0, Math.floor((y - 74) / 3));
    const x0 = 22 - Math.floor(w / 2);
    px(c, x0, y, P.trunk, w, 1);
    px(c, x0, y, darken(P.trunk, 0.2));
  }
  // Branch, two pixels thick near the trunk.
  for (let x = 24; x <= 65; x++) {
    const y = branchY(x);
    px(c, x, y, P.trunk, 1, x < 50 ? 2 : 1);
    if (s.snowCover) px(c, x, y - 1, P.snow);
  }

  if (P.bare) {
    const segs = [[22, 50, 20, 37], [20, 37, 15, 28], [20, 40, 10, 33], [21, 43, 32, 33], [32, 33, 36, 28], [32, 33, 41, 35], [16, 47, 7, 42], [15, 28, 12, 24], [10, 33, 5, 30], [36, 28, 37, 24], [41, 35, 46, 34]];
    segs.forEach(([x0, y0, x1, y1], i) => {
      pline(c, x0, y0, x1, y1, P.trunk);
      if (i < 4) pline(c, x0 + 1, y0, x1 + 1, y1, P.trunk);
    });
  } else {
    const blobs = [[9, 43, 9], [23, 37, 13], [37, 41, 10], [47, 48, 6]];
    for (const [bx, by, r] of blobs) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r + r * 0.8) continue;
          let col = P.tree;
          if (dx + dy < -r * 0.7) col = P.treeHi;
          else if (dx + dy > r * 0.6 || dy > r * 0.7) col = P.treeShade;
          if (s.snowCover && dy < -r * 0.55) col = P.snow;
          else if (P.blossom && ((Math.imul(bx + dx, 73856093) ^ Math.imul(by + dy, 19349663)) >>> 0) % 7 === 0) col = P.blossom;
          px(c, bx + dx, by + dy, col);
        }
      }
    }
  }

  // Fallen log with its cut end facing left.
  const wood = P.shade('#7a5537');
  px(c, 128, 78, wood, 20, 5);
  px(c, 129, 77, wood, 18, 1);
  px(c, 133, 80, darken(wood, 0.25), 6, 1);
  px(c, 140, 79, darken(wood, 0.25), 5, 1);
  px(c, 126, 78, P.shade('#c99c64'), 2, 5);
  px(c, 127, 80, P.shade('#9c7346'));
  if (s.snowCover) px(c, 129, 76, P.snow, 18, 2);
  else if (s.season === 'spring' || s.season === 'summer') px(c, 133, 77, P.shade('#6fa34a'), 8, 1);

  if (s.season === 'autumn' && !s.snowCover) {
    const cap = P.shade('#d6402f'), brown = P.shade('#a9743f'), stem = P.shade('#f1e8d6');
    for (const [mx, my, red] of [[131, 84, 1], [135, 84, 1], [149, 84, 0], [31, 86, 1], [35, 86, 0]]) {
      sprite(c, ['rwr', '.s.'], { r: red ? cap : brown, w: red ? stem : brown, s: stem }, mx, my - 2);
    }
  }
}

export const forest: PixelSceneDef<ForestState> = {
  walkY: 84,
  spots: [[41, 83], [59, 82], [106, 83], [151, 84]],

  init(P: Palette, s: SceneState, R: Rand) {
    const fore = document.createElement('canvas');
    fore.width = PW;
    fore.height = PH;
    drawFore(fore.getContext('2d')!, P, s);
    const mids: [number, boolean][] = [[59, false], [65, true], [71, false], [77, true], [83, false], [89, true], [95, false], [116, true], [121, false], [127, true], [133, false], [139, true], [144, false], [150, true], [157, false]];
    const kid = kidOutside(s);
    return {
      trees: mids.map(([x, pine]) => ({ x, base: yMid(x) + 1, pine, size: pine ? 10 + Math.floor(R() * 3) : 3 + Math.floor(R() * 2), p: R() * 6 })),
      fore,
      deerPhase: R() * DEER_CYCLE,
      kid,
      swingT: kid ? 3.2 : 2.6 - s.windAmt * 0.9,
      swingA: ((kid ? 20 : 3 + s.windAmt * 20) * Math.PI) / 180,
      flies: s.time === 'night' && s.season === 'summer' && s.precip === 0
        ? Array.from({ length: 6 }, () => ({ x: 40 + R() * 106, y: 66 + R() * 14, p: R() * 6 }))
        : [],
    };
  },

  drawLand(c: Ctx, P: Palette, s: SceneState, R: Rand) {
    // Far tree line: silhouettes standing on the ridge.
    const pineCol = mix(darken(P.evergreen, 0.18), P.far, 0.3);
    const roundCol = mix(darken(P.tree, 0.2), P.far, 0.3);
    const wall = mix(darken(P.tree, 0.28), P.far, 0.4);
    hill(c, (x) => yFar(x) - 3 - Math.round(2 * Math.abs(Math.sin((x * 3) / 9 + Math.sin((x * 3) / 37)))), wall, 0);
    for (let x = -2; x < PW + 4; x += 3 + Math.floor(R() * 4)) {
      const base = yFar(Math.max(0, Math.min(PW - 1, x))) + 1;
      if (R() < 0.62) {
        const h = 6 + Math.floor(R() * 4);
        for (let i = 0; i < h; i++) {
          const half = Math.floor(i * 0.45);
          px(c, x - half, base - h + i, s.snowCover && i % 4 === 0 ? P.snow : pineCol, half * 2 + 1, 1);
        }
      } else if (P.bare) {
        px(c, x, base - 6, roundCol, 1, 6);
        pline(c, x, base - 3, x - 2, base - 6, roundCol);
        pline(c, x, base - 4, x + 2, base - 7, roundCol);
      } else {
        px(c, x, base - 2, roundCol, 1, 2);
        for (let dy = -3; dy <= 3; dy++) {
          const half = dy === -3 || dy === 3 ? 1 : dy === -2 || dy === 2 ? 2 : 3;
          px(c, x - half, base - 5 + dy, s.snowCover && dy < -1 ? P.snow : roundCol, half * 2 + 1, 1);
        }
      }
    }
    hill(c, yFar, P.far, 0.1);
    for (let x = 1; x < PW + 3; x += 6 + Math.floor(R() * 3)) {
      if (x > 99 && x < 113) continue;
      const base = yFar(Math.min(PW - 1, x)) + 5;
      if (R() < 0.5) pixPine(c, x, base, 7 + Math.floor(R() * 2), P, s);
      else pixTree(c, x, base, 2, 2, P, s);
    }
    hill(c, yMid, P.mid, 0.12);
    hill(c, yFront, P.front, 0.1);

    // Path into the woods.
    for (let y = yMid(107); y < PH; y++) {
      const t = (y - 65) / (PH - 65);
      const cx = 107 - 14 * t * t;
      const half = 2 + t * 12;
      px(c, Math.round(cx - half), y, P.road, Math.round(half * 2), 1);
      if (y > 70 && (y % 5) === 0) px(c, Math.round(cx - half / 2), y, darken(P.road, 0.1), 2, 1);
    }

    const tuft = darken(P.front, 0.16);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(R() * PW), y = 77 + Math.floor(R() * 11);
      if (x > 76 && x < 110) continue;
      px(c, x, y, tuft);
      px(c, x - 1, y + 1, tuft);
      px(c, x + 1, y + 1, tuft);
    }
  },

  drawProps(c: Ctx, P: Palette, s: SceneState, t: number, _dt: number, st: ForestState) {
    const wa = s.windAmt;
    const amp = wa > 0.6 ? 1.6 : wa > 0.35 ? 0.8 : 0.4;
    const sw = (p: number, k = 1) => Math.round(Math.sin(t * (1.5 + wa * 3) + p) * amp * k);
    for (const T of st.trees) {
      if (T.pine) pixPine(c, T.x, T.base, T.size, P, s, sw(T.p));
      else pixTree(c, T.x, T.base, T.size, 2, P, s, sw(T.p));
    }

    // Roe deer: offscreen → walks in → grazes → walks out to the left. Not at night.
    if (s.time !== 'night') {
      const ph = ((t + st.deerPhase) % DEER_CYCLE) / DEER_CYCLE;
      let x = -99, rows = DEER_A;
      if (ph >= 0.2 && ph < 0.42) x = 170 - ((ph - 0.2) / 0.22) * 55;
      else if (ph >= 0.42 && ph < 0.62) {
        x = 115;
        const grazing = (ph > 0.45 && ph < 0.53) || (ph > 0.565 && ph < 0.605);
        rows = grazing ? DEER_G : DEER_A;
      } else if (ph >= 0.62 && ph < 0.86) x = 115 - ((ph - 0.62) / 0.24) * 135;
      if (x > -14 && x < PW) {
        const walking = ph < 0.42 || ph >= 0.62;
        if (walking) rows = Math.floor(t * 5) % 2 ? DEER_B : DEER_A;
        const winter = s.season === 'winter' || s.snowCover;
        sprite(c, rows, {
          c: P.shade(winter ? '#8c7864' : '#b8693a'),
          b: P.shade('#ead7b8'),
          w: P.shade('#f6f0e4'),
          k: P.shade('#2b2320'),
          e: P.shade('#2b2320'),
          a: P.shade('#d9c7a3'),
        }, Math.round(x), DEER_Y - rows.length);
      }
    }

    c.drawImage(st.fore, 0, 0);

    // Swing: a pendulum from the branch. Ropes at ±3 px.
    const th = st.swingA * Math.sin((t * Math.PI * 2) / st.swingT);
    const cs = Math.cos(th), sn = Math.sin(th);
    const at = (lx: number, ly: number) => [PIVOT.x + lx * cs - ly * sn, PIVOT.y + lx * sn + ly * cs];
    const rope = P.shade('#d8c39a');
    for (const lx of [-3, 3]) {
      const [x0, y0] = at(lx, 0), [x1, y1] = at(lx, PIVOT.len);
      pline(c, x0, y0, x1, y1, rope);
    }
    const [sl, sly] = at(-4, PIVOT.len), [sr, sry] = at(4, PIVOT.len);
    pline(c, sl, sly, sr, sry, P.shade('#8b5a3c'));
    const [kx, ky] = at(0, PIVOT.len);
    if (st.kid) {
      const winter = s.season === 'winter' || s.snowCover;
      const map = { h: P.shade(winter ? '#e8553f' : '#8a5a2b'), f: P.shade('#f4c8a2'), e: P.shade('#3a2a22'), s: P.shade(winter ? '#3f8fd0' : '#e8553f'), p: P.shade('#3b5b8c'), k: P.shade('#3a2f2a') };
      sprite(c, KID, map, Math.round(kx) - 3, Math.round(ky) - 7);
      if (winter) px(c, Math.round(kx), Math.round(ky) - 8, P.shade('#f6f1e7'));
    } else if (s.snowCover) {
      pline(c, sl, sly - 1, sr, sry - 1, P.snow);
    }

    // Owl on the branch, blinking.
    if (s.time === 'night' && P.lit) {
      const ox = 35;
      const blink = (t % 4.6) > 4.15 && (t % 4.6) < 4.35;
      sprite(c, OWL, { b: P.shade('#9a7650'), f: P.shade('#d8b98e'), k: P.shade('#e2a03a'), o: P.shade('#e2a03a'), E: blink ? P.shade('#9a7650') : '#ffd84a' }, ox, branchY(ox + 2) - OWL.length + 1);
    }

    for (const fl of st.flies) {
      if (Math.sin(t * 2.2 + fl.p) > 0.1) px(c, fl.x + Math.sin(t * 0.7 + fl.p) * 3, fl.y + Math.sin(t * 1.1 + fl.p * 2) * 2, lighten('#d9f56a', 0.2));
    }

    pixPine(c, 154, 88, 25, P, s, sw(1.3, 1.5));
  },
};
