import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { darken, lighten, type Rand } from '../../util';
import { type Ctx, hill, PH, pixTree, type PixelSceneDef, pline, px, PW, sprite } from './engine';

/** Rural Denmark: wind turbines, farmhouse with barn, field rows, a cow and a tractor. */

const yFar = (x: number) => Math.round(55 + 3 * Math.sin(x / 17) + 2 * Math.sin(x / 6.3 + 1));
const yMid = (x: number) => Math.round(64 + 2.5 * Math.sin(x / 23 + 2) + 1.5 * Math.sin(x / 8.7));
const yFront = (x: number) => Math.round(75 + 1.2 * Math.sin(x / 28 + 1));
const TURBINES = [{ x: 128, hub: 34, len: 11, ph: 0 }, { x: 147, hub: 43, len: 7, ph: 1 }];

const TRACTOR = ['........k....', '..GGGG..k....', '..GccG..k....', '..GccGGGGGG..', '.GGGGGGGGGGGl', 'KKKK.....KKK.', 'KhhK.....KhK.', 'KhhK.....KKK.', 'KKKK.........'];
const COW_A = ['kk........', 'wwkwwwwkww', 'pwwwwkkwwk', '.wwkwwwwww', '.k.k..k.k.', '.k.k..k.k.'];
const COW_B = ['..........', '..kwwwwkww', 'kwwwwkkwwk', 'wwwkwwwwww', 'pk.k..k.k.', '.k.k..k.k.'];

interface RuralState {
  trees: { x: number; base: number; r: number; h: number; p: number }[];
}

export const rural: PixelSceneDef<RuralState> = {
  walkY: 78,

  init(_P: Palette, _s: SceneState, R: Rand) {
    return {
      trees: [
        { x: 74, base: yMid(74), r: 3, h: 3 },
        { x: 117, base: yMid(117) + 1, r: 3, h: 2 },
        { x: 123, base: yMid(123) + 1, r: 2, h: 2 },
        { x: 12, base: yFront(12) + 2, r: 5, h: 4 },
        { x: 150, base: yFront(150) + 2, r: 6, h: 5 },
      ].map((t) => ({ ...t, p: R() * 6 })),
    };
  },

  drawLand(c: Ctx, P: Palette, s: SceneState, R: Rand) {
    for (const T of TURBINES) px(c, T.x, T.hub + 1, P.tower, 1, yFar(T.x) - T.hub);
    hill(c, yFar, P.far, 0.14);
    hill(c, yMid, P.mid, 0.14);
    for (let x = 0; x < 72; x++) {
      for (let yy = yMid(x) + 2; yy < 78; yy++) if ((yy + Math.floor(x / 5)) % 3 === 0) px(c, x, yy, P.stripe);
    }

    // Farmhouse with thatched roof, and a red barn.
    const base = yMid(92) + 1;
    px(c, 82, base - 6, P.house, 18, 6);
    px(c, 95, base - 12, P.house, 1, 3);
    for (let r = 0; r < 4; r++) px(c, 84 - r, base - 10 + r, r === 0 ? darken(P.roof, 0.2) : P.roof, 14 + r * 2, 1);
    for (const wx of [84, 87, 94, 97]) px(c, wx, base - 4, P.window, 1, 2);
    px(c, 90, base - 4, P.shade('#7a4f35'), 2, 4);
    px(c, 101, base - 5, P.barn, 10, 5);
    const barnRoof = s.snowCover ? P.roof : P.shade('#8f3229');
    for (let r = 0; r < 4; r++) px(c, 105 - r, base - 9 + r, barnRoof, 2 + r * 2, 1);

    hill(c, yFront, P.front, 0.12);
    const tuft = darken(P.front, 0.18);
    for (let i = 0; i < 45; i++) {
      const x = Math.floor(R() * PW);
      const y = R() > 0.5 ? 77 + Math.floor(R() * 2) : 84 + Math.floor(R() * 4);
      if (y > yFront(x) && y < PH) px(c, x, y, tuft);
    }
    px(c, 0, 79, lighten(P.road, 0.15), PW, 1);
    px(c, 0, 80, P.road, PW, 2);
    px(c, 0, 82, darken(P.road, 0.2), PW, 1);
    for (let i = 0; i < 18; i++) px(c, Math.floor(R() * PW), 80 + Math.floor(R() * 2), darken(P.road, 0.12));
  },

  drawProps(c: Ctx, P: Palette, s: SceneState, t: number, _dt: number, st: RuralState) {
    const wa = s.windAmt;
    for (const T of TURBINES) {
      const a = t * (0.8 + wa * 6) + T.ph;
      for (let k = 0; k < 3; k++) {
        const an = a + k * 2.0944;
        pline(c, T.x, T.hub, T.x + Math.cos(an) * T.len, T.hub + Math.sin(an) * T.len, P.tower);
      }
      px(c, T.x - 1, T.hub - 1, P.tower, 2, 2);
    }

    const amp = wa > 0.6 ? 1.6 : wa > 0.35 ? 0.8 : 0.4;
    for (const T of st.trees) pixTree(c, T.x, T.base, T.r, T.h, P, s, Math.round(Math.sin(t * (1.5 + wa * 3) + T.p) * amp));

    if (!s.snowCover) {
      sprite(c, Math.floor(t / 2.5) % 3 === 0 ? COW_B : COW_A, { k: P.shade('#2b2b2b'), w: P.shade('#f7f7f2'), p: P.shade('#f2a3b0') }, 34, 71);
    }

    const tx = Math.floor((t * 11) % (PW + 30)) - 15;
    const ty = 73 + (Math.floor(t * 5) % 2);
    for (let k = 0; k < 3; k++) {
      const ph = (t * 1.2 + k / 3) % 1;
      c.fillStyle = `rgba(220,225,230,${((1 - ph) * 0.8).toFixed(2)})`;
      c.fillRect(tx + 8 - Math.round(ph * 3), ty - 1 - Math.round(ph * 6), 1, 1);
    }
    if (P.lit) {
      c.fillStyle = 'rgba(255,243,176,.22)';
      c.fillRect(tx + 13, ty + 3, 9, 3);
    }
    const green = P.shade('#4f9d3a');
    sprite(c, TRACTOR, { G: green, c: P.lit ? '#ffe9a6' : '#cfe9ff', k: '#3b3b3b', K: '#222222', h: P.shade('#ffd23f'), l: P.lit ? '#fff3b0' : green }, tx, ty);
  },
};
