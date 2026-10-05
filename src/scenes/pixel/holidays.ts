import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import type { Rand } from '../../util';
import { type Ctx, pline, px, PW, sprite } from './draw';

/** Hidden holiday layers for pixel scenes. Per-frame work is a handful of sprites and particles. */

const FW_COLORS = ['#ff5d73', '#ffd166', '#7bdff2', '#b892ff', '#8ef29a', '#ffffff'];
const EGG_COLORS = ['#ff9ec7', '#8fd3ff', '#ffe066', '#b5e48c', '#c3a6ff'];

interface Bat { x: number; y: number; v: number; p: number }
interface Burst { x: number; y: number; t0: number; col: string; n: number }

export interface HolidayState {
  bats: Bat[];
  bursts: Burst[];
  next: number;
}

export function initHoliday(s: SceneState, R: Rand): HolidayState {
  return {
    bats: s.holiday === 'halloween' ? Array.from({ length: 3 }, () => ({ x: R() * PW, y: 34 + R() * 12, v: 10 + R() * 8, p: R() * 6 })) : [],
    bursts: [],
    next: 0,
  };
}

const BAT_A = ['k...k', '.kkk.'];
const BAT_B = ['..k..', 'kkkkk'];

/** Bats and fireworks, drawn behind the land. */
export function drawHolidaySky(c: Ctx, P: Palette, s: SceneState, t: number, hs: HolidayState): void {
  if (s.holiday === 'halloween' && P.nightK > 0) {
    for (const b of hs.bats) {
      const x = Math.floor(((((b.x - t * b.v) % (PW + 20)) + PW + 20) % (PW + 20)) - 10);
      const y = Math.round(b.y + Math.sin(t * 3 + b.p) * 3);
      sprite(c, Math.floor(t * 8 + b.p) % 2 ? BAT_A : BAT_B, { k: '#1b1b24' }, x, y);
    }
  }
  const show = s.holiday === 'newyear';
  if (!show && !(s.holiday === 'nye' && P.nightK > 0)) return;
  if (t >= hs.next || hs.next - t > 10) {
    hs.bursts.push({ x: 12 + Math.random() * 136, y: 22 + Math.random() * 22, t0: t, col: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)], n: 12 + Math.floor(Math.random() * 6) });
    hs.next = t + (show ? 0.3 + Math.random() * 0.5 : 2.5 + Math.random() * 4);
  }
  hs.bursts = hs.bursts.filter((b) => t - b.t0 < 2.4);
  for (const b of hs.bursts) {
    const a = t - b.t0;
    if (a < 0.7) {
      const y = Math.round(58 - (58 - b.y) * (a / 0.7));
      px(c, b.x, y, '#fff6d0');
      px(c, b.x, y + 1, 'rgba(255,214,140,.6)');
      continue;
    }
    const k = a - 0.7;
    const r = k * 16 * (1 - k * 0.22);
    c.globalAlpha = Math.max(0, 1 - k / 1.6);
    for (let i = 0; i < b.n; i++) {
      const an = (i / b.n) * Math.PI * 2;
      px(c, b.x + Math.cos(an) * r, b.y + Math.sin(an) * r + k * k * 5, k < 0.25 ? '#ffffff' : b.col);
    }
    c.globalAlpha = 1;
  }
}

const PUMPKIN = ['..g..', '.ooo.', 'oeoeo', 'oeeeo', '.ooo.'];

/** Ground decorations at the scene's spots, drawn in front of the props. */
export function drawHolidayGround(c: Ctx, spots: [number, number][], P: Palette, s: SceneState, t: number): void {
  if (s.holiday === 'halloween') {
    spots.slice(0, 3).forEach(([x, y], i) => {
      const flick = Math.sin(t * 9 + i * 2) + Math.sin(t * 23 + i) > 0.6;
      const face = P.lit ? (flick ? '#ffe9a6' : '#ffb347') : P.shade('#5a2a0a');
      sprite(c, PUMPKIN, { g: P.shade('#4f7a2a'), o: P.shade('#f28c28'), e: face }, x - 2, y - 5);
    });
  } else if (s.holiday === 'christmas' && spots.length) {
    const [x, y] = spots[0];
    px(c, x, y - 2, P.trunk, 1, 2);
    for (let i = 0; i < 10; i++) {
      const half = Math.floor(i * 0.5) - (i % 3 === 2 ? 1 : 0);
      px(c, x - half, y - 12 + i, P.evergreen, half * 2 + 1, 1);
    }
    const lights: [number, number][] = [[0, -10], [-1, -8], [1, -7], [-2, -5], [2, -4], [-3, -3], [0, -3], [3, -3]];
    lights.forEach(([dx, dy], i) => { if (Math.floor(t * 2 + i * 0.7) % 3 !== 0) px(c, x + dx, y + dy, FW_COLORS[i % 5]); });
    px(c, x, y - 13, '#ffd166');
    if (Math.floor(t * 1.5) % 2) { px(c, x - 1, y - 13, '#ffd166'); px(c, x + 1, y - 13, '#ffd166'); }
    px(c, x - 5, y - 2, P.shade('#d64545'), 2, 2); px(c, x + 4, y - 2, P.shade('#3d8bfd'), 2, 2);
  } else if (s.holiday === 'easter') {
    spots.forEach(([x, y], i) => {
      const stem = P.shade('#4f8a3a');
      px(c, x - 2, y - 3, stem, 1, 3); px(c, x + 2, y - 2, stem, 1, 2);
      px(c, x - 2, y - 4, P.shade('#ffe066')); px(c, x - 3, y - 4, P.shade('#ffe066')); px(c, x - 1, y - 4, P.shade('#ffe066'));
      px(c, x + 2, y - 3, P.shade('#ffe066'));
      const col = P.shade(EGG_COLORS[i % 5]);
      px(c, x, y - 2, col, 1, 2); px(c, x - 1, y - 1, col); px(c, x + 1, y - 1, col);
      px(c, x, y - 1, P.shade('#ffffff'));
    });
  }
}

/* ---------- one-shot visitors ---------- */

const WITCH = [
  '....k.......',
  '...kkk......',
  '..kkkkk.....',
  '....gg......',
  '...kkkk.....',
  'bbbbkkkbbBBB',
  '....k.k..BB.',
];
const SLEIGH = [
  '..ww.....',
  '.rrr.....',
  '.fff.SS..',
  'rrrrrSSS.',
  'RRRRRRRRR',
  'y.......y',
];
const DEER_A = ['...a.a', '....hh', 'bbbbhn', 'bbbb..', 'b..b..'];
const DEER_B = ['...a.a', '....hh', 'bbbbhn', 'bbbb..', '.bb.b.'];
const BUNNY_A = ['....b.b', '....bbb', 'wbbbbkb', 'bbbbbb.', '.b..b..'];

export function drawWitch(c: Ctx, p: number, age: number): void {
  const x = Math.round(PW + 10 - p * (PW + 30));
  const y = 38 + Math.round(Math.sin(age * 4) * 1.5);
  sprite(c, WITCH, { k: '#1b1b24', g: '#9bd16a', b: '#5b3a22', B: '#8a6a3a' }, x, y);
}

export function drawSleigh(c: Ctx, p: number, age: number): void {
  const x = Math.round(-36 + p * (PW + 50));
  const y = Math.round(44 - p * 18 + Math.sin(age * 3) * 1);
  const leg = Math.floor(age * 8) % 2;
  sprite(c, SLEIGH, { w: '#ffffff', r: '#d64545', f: '#f2c7a5', S: '#8b5a3c', R: '#d64545', y: '#e8c15a' }, x, y);
  pline(c, x + 8, y + 3, x + 22, y + 2, '#e8c15a');
  sprite(c, leg ? DEER_A : DEER_B, { a: '#5b3a22', h: '#9a6a44', b: '#9a6a44', n: '#3a2a20' }, x + 11, y);
  sprite(c, leg ? DEER_B : DEER_A, { a: '#5b3a22', h: '#9a6a44', b: '#9a6a44', n: Math.floor(age * 4) % 2 ? '#ff3b3b' : '#ff7a7a' }, x + 18, y - 1);
}

export function drawBunny(c: Ctx, p: number, age: number, walkY: number, P: Palette): void {
  const pause = p > 0.45 && p < 0.55;
  const prog = p < 0.45 ? p : pause ? 0.45 : 0.45 + ((p - 0.55) * 0.55) / 0.45;
  const x = Math.round(-8 + prog * (PW + 16));
  const hop = Math.round(Math.abs(Math.sin(age * 5.5)) * 3);
  sprite(c, BUNNY_A, { b: P.shade('#cdb79e'), w: P.shade('#ffffff'), k: '#222222' }, x, walkY - 5 - hop);
}
