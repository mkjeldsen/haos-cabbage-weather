import { isBlueHour, type Palette } from '../../palette';
import type { SceneState } from '../../types';
import { darken, hexToRgb, lighten, mix, type Rand, rng } from '../../util';
import { BAYER, type Ctx, PH, pline, px, PW, sprite } from './draw';
import { drawPhotographer } from './photographer';
import { drawBunny, drawHolidayGround, drawHolidaySky, drawSleigh, drawWitch, type HolidayState, initHoliday } from './holidays';

/**
 * Pixel-art scene engine.
 *
 * Scenes draw on a PW×PH canvas that CSS scales up with `image-rendering: pixelated`.
 * Draw order per frame: sky → stars → clouds → scene.drawBack → land layer (cached) →
 * scene.drawProps → weather FX → easter egg.
 *
 * The header text covers roughly rows 0–48, so keep the interesting props below that.
 * Use integer coordinates (px/pline floor for you) and the palette — never hardcode
 * time-of-day colours; use P.shade(dayColour) for scene-specific colours.
 */
export { BAYER, type Ctx, PH, pline, px, PW, sprite } from './draw';
export const FPS = 15;


export interface PixelSceneDef<S = any> {
  /** Static scenery on a transparent canvas, redrawn only when the state changes. */
  drawLand(c: Ctx, P: Palette, s: SceneState, R: Rand): void;
  /** Build per-scene animation state (positions, phases). Called on every state change. */
  init?(P: Palette, s: SceneState, R: Rand): S;
  /** Animated props behind the land layer (but in front of clouds). */
  drawBack?(c: Ctx, P: Palette, s: SceneState, t: number, dt: number, st: S): void;
  /** Animated props in front of the land layer. t = seconds, dt = seconds since last frame. */
  drawProps?(c: Ctx, P: Palette, s: SceneState, t: number, dt: number, st: S): void;
  /** Foreground walking row (feet) for the cat easter egg. */
  walkY: number;
  /** Set false for scenes without trees, so strong wind doesn't blow leaves through them. */
  leaves?: boolean;
  /** Free foreground ground points [x, y] for small holiday decorations (first one gets the Christmas tree). */
  spots?: [number, number][];
}

export type EggKind = 'ufo' | 'balloon' | 'cat' | 'witch' | 'sleigh' | 'bunny';
export const PIXEL_EGG_DURATION = { ufo: 12, balloon: 30, cat: 14, witch: 14, sleigh: 16, bunny: 12 } as const;

/* ---------- drawing helpers for scenes ---------- */





/** Fill a column-wise hill: for every x, fill from y(x) to the bottom, with a 1px highlight on top. */
export function hill(c: Ctx, yAt: (x: number) => number, col: string, highlight = 0.13): void {
  const hi = lighten(col, highlight);
  for (let x = 0; x < PW; x++) {
    const y = Math.round(yAt(x));
    px(c, x, y, col, 1, PH - y);
    if (highlight) px(c, x, y, hi);
  }
}

/** Round tree crown + trunk. `off` is the horizontal sway offset in pixels. Handles bare/blossom/snow. */
export function pixTree(c: Ctx, x: number, base: number, r: number, trunkH: number, P: Palette, s: SceneState, off = 0): void {
  px(c, x, base - trunkH, P.trunk, 1, trunkH);
  const cy = base - trunkH - r + 1;
  if (P.bare) {
    pline(c, x, base - trunkH, x + off - r + 1, cy - 1, P.trunk);
    pline(c, x, base - trunkH, x + off + r - 1, cy - 2, P.trunk);
    pline(c, x, base - trunkH, x + off, cy - r + 1, P.trunk);
    if (s.snowCover) {
      px(c, x + off - r + 1, cy - 2, P.snow);
      px(c, x + off + r - 1, cy - 3, P.snow);
      px(c, x + off, cy - r, P.snow);
    }
    return;
  }
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.8) continue;
      let col = P.tree;
      if (dx + dy < -r * 0.6) col = P.treeHi;
      else if (dx + dy > r * 0.7) col = P.treeShade;
      if (s.snowCover && dy < -r * 0.35) col = P.snow;
      else if (P.blossom && (((dx + 17) * 73856093) ^ ((dy + 29) * 19349663)) % 6 === 0) col = P.blossom;
      px(c, x + off + dx, cy + dy, col);
    }
  }
}

/** Triangular pine. */
export function pixPine(c: Ctx, x: number, base: number, h: number, P: Palette, s: SceneState, off = 0): void {
  px(c, x, base - 2, P.trunk, 1, 2);
  const top = base - 2 - h;
  const hi = lighten(P.evergreen, 0.12);
  for (let i = 0; i < h; i++) {
    const half = Math.floor((i * 0.55) + ((i % 3) === 2 ? -1 : 0));
    const lean = Math.round(off * (1 - i / h));
    const y = top + i;
    px(c, x - half + lean, y, P.evergreen, half * 2 + 1, 1);
    px(c, x - half + lean, y, hi, Math.max(1, half), 1);
    if (s.snowCover && (i % 3 === 0)) px(c, x - half + lean, y, P.snow, half * 2 + 1, 1);
  }
}

/* ---------- internal: clouds, sky ---------- */

function makeCloud(w: number, h: number, circles: number[][], baseY: number, P: Palette): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  const inside = (x: number, y: number) => y <= baseY && circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) px(c, x, y, inside(x, y + 1) ? P.cloud : P.cloudShade);
  return cv;
}

function canvas(w = PW, h = PH): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

interface Particle { x: number; y: number; v: number; p: number }

/* ---------- renderer ---------- */

export class PixelRenderer {
  private ctx: Ctx;
  private sky = canvas();
  private land = canvas();
  private def!: PixelSceneDef;
  private s!: SceneState;
  private P!: Palette;
  private st: any;
  private clouds: { x: number; y: number; big: boolean }[] = [];
  private cloudImg!: { big: HTMLCanvasElement; small: HTMLCanvasElement };
  private stars: { x: number; y: number; p: number }[] = [];
  private drops: Particle[] = [];
  private flakes: Particle[] = [];
  private hail: Particle[] = [];
  private leaves: (Particle & { c: string })[] = [];
  private egg: { kind: EggKind; t0: number } | null = null;
  private fogLayer = canvas(PW + 4, PH);
  private fogAt = -1;
  private hs!: HolidayState;
  private spots: [number, number][] = [];
  private time = 0;
  private prev = 0;
  private raf = 0;
  private animated = true;
  private visible = true;

  constructor(cv: HTMLCanvasElement) {
    cv.width = PW;
    cv.height = PH;
    this.ctx = cv.getContext('2d')!;
  }

  set(def: PixelSceneDef, P: Palette, s: SceneState): void {
    this.def = def;
    this.s = s;
    this.P = P;
    const R = rng(s.seed);
    const n = Math.round(1 + s.cloudCover * 6);
    this.stars = Array.from({ length: 32 }, () => ({ x: Math.floor(R() * PW), y: Math.floor(R() * 48), p: R() * 6 }));
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (i * (PW + 40)) / n + R() * 12,
      y: s.cloudCover > 0.7 && i % 2 ? Math.floor(4 + R() * 14) : Math.floor(34 + R() * 12),
      big: R() > 0.45,
    }));
    this.cloudImg = {
      big: makeCloud(28, 12, [[6, 8, 5], [13, 5, 6], [20, 7, 5], [24, 9, 3]], 11, P),
      small: makeCloud(18, 9, [[5, 6, 4], [10, 4, 4], [14, 6, 3]], 8, P),
    };
    const nDrops = s.kind === 'pour' ? 130 : s.kind === 'rain' || s.kind === 'storm' || s.kind === 'sleet' ? (s.precip > 0 ? 80 : 0) : 0;
    this.drops = Array.from({ length: nDrops }, () => ({ x: R() * (PW + 40), y: R() * PH, v: 110 + R() * 50, p: 0 }));
    const nFlakes = s.kind === 'snow' ? 70 : s.kind === 'sleet' ? 30 : 0;
    this.flakes = Array.from({ length: nFlakes }, () => ({ x: R() * (PW + 30), y: R() * PH, v: 7 + R() * 9, p: R() * 6 }));
    this.hail = Array.from({ length: s.kind === 'hail' ? 50 : 0 }, () => ({ x: R() * (PW + 20), y: R() * PH, v: 140 + R() * 40, p: 0 }));
    const leafCols = s.season === 'autumn' ? ['#e8a33d', '#d9662f', '#c9483d'] : ['#e8a33d', '#7fb24a', '#a8c85a'];
    this.leaves = s.windAmt > 0.55 && !s.snowCover && def.leaves !== false
      ? Array.from({ length: 10 }, (_, i) => ({ x: R() * PW * 1.5, y: 30 + R() * 50, v: 55 + R() * 45, p: R() * 6, c: leafCols[i % 3] }))
      : [];
    this.st = def.init ? def.init(P, s, rng(s.seed + 7)) : undefined;
    this.fogAt = -1;
    this.hs = initHoliday(s, rng(s.seed + 9));
    this.spots = def.spots ?? [[24, def.walkY - 2], [70, def.walkY - 1], [113, def.walkY - 2], [143, def.walkY - 1]];
    this.buildStatic();
    this.frame(0);
    this.schedule();
  }

  setAnimated(on: boolean): void {
    this.animated = on;
    this.schedule();
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.schedule();
  }

  triggerEgg(kind: EggKind): void {
    this.egg = { kind, t0: this.time };
    this.schedule();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private schedule(): void {
    const run = this.animated && this.visible && !!this.def;
    if (run && !this.raf) {
      this.prev = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = (now - this.prev) / 1000;
    if (dt < 1 / FPS) return;
    this.prev = now;
    const step = Math.min(dt, 0.1);
    this.time += step;
    this.frame(step);
  };

  private buildStatic(): void {
    const P = this.P;
    const sc = this.sky.getContext('2d')!;
    const img = sc.createImageData(PW, PH);
    const bands = 8;
    const cols = Array.from({ length: bands }, (_, i) => {
      const k = i / (bands - 1);
      return hexToRgb(k < 0.6 ? mix(P.skyTop, P.skyMid, k / 0.6) : mix(P.skyMid, P.skyBot, (k - 0.6) / 0.4));
    });
    for (let y = 0; y < PH; y++) {
      const t = Math.min(1, y / 60) * (bands - 1);
      const b = Math.floor(t);
      const fr = t - b;
      for (let x = 0; x < PW; x++) {
        const col = cols[Math.min(bands - 1, fr > (BAYER[y & 3][x & 3] + 0.5) / 16 ? b + 1 : b)];
        const i = (y * PW + x) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
    sc.putImageData(img, 0, 0);
    const lc = this.land.getContext('2d')!;
    lc.clearRect(0, 0, PW, PH);
    this.def.drawLand(lc, P, this.s, rng(this.s.seed + 3));
  }

  private frame(dt: number): void {
    const c = this.ctx, P = this.P, s = this.s, t = this.time, wa = s.windAmt;
    c.drawImage(this.sky, 0, 0);

    // Stars fade in through nautical twilight: fewer of them while the sky is still blue.
    const starK = s.cloudCover < 0.55 ? Math.min(1, Math.max(0, (-6 - s.sunElev) / 6)) : 0;
    if (starK > 0) {
      for (const st of this.stars.slice(0, Math.round(this.stars.length * starK))) {
        const v = Math.sin(t * 1.7 + st.p);
        if (v > -0.35) px(c, st.x, st.y, v > 0.7 ? '#ffffff' : '#b9c6e6');
      }
    }

    const sp = 1.2 + wa * 9, span = PW + 40;
    for (const cl of this.clouds) {
      c.drawImage(cl.big ? this.cloudImg.big : this.cloudImg.small, Math.floor((((cl.x - t * sp) % span) + span) % span) - 30, cl.y);
    }

    drawHolidaySky(c, P, s, t, this.hs);
    this.drawEgg(c, 'sky');
    this.def.drawBack?.(c, P, s, t, dt, this.st);
    c.drawImage(this.land, 0, 0);
    this.def.drawProps?.(c, P, s, t, dt, this.st);
    drawHolidayGround(c, this.spots, P, s, t);
    if (isBlueHour(s)) drawPhotographer(c, P, t);
    this.drawEgg(c, 'ground');
    this.drawFx(c, dt);
  }

  private drawFx(c: Ctx, dt: number): void {
    const s = this.s, P = this.P, t = this.time, wa = s.windAmt, k = s.kind;
    if (k === 'rain' || k === 'pour' || k === 'storm' || k === 'hail' || k === 'sleet') {
      c.fillStyle = `rgba(20,30,45,${k === 'pour' || k === 'storm' ? 0.2 : 0.13})`;
      c.fillRect(0, 0, PW, PH);
    }
    if (k === 'fog') {
      // The dithered bands change slowly: rebuild the layer twice a second, slide it every frame.
      if (t - this.fogAt > 0.5 || t < this.fogAt) this.buildFog(t);
      c.drawImage(this.fogLayer, -(Math.floor(t * 3) & 3), 0);
    }
    if (this.drops.length) {
      c.fillStyle = 'rgba(195,222,255,.8)';
      for (const d of this.drops) {
        d.y += d.v * dt; d.x -= (10 + wa * 45) * dt;
        if (d.y > PH) { d.y = -3; d.x = Math.random() * (PW + 40); }
        c.fillRect(Math.floor(d.x), Math.floor(d.y), 1, 2);
      }
    }
    if (this.flakes.length) {
      c.fillStyle = P.snow;
      for (const fl of this.flakes) {
        fl.y += fl.v * dt; fl.x += (Math.sin(t * 1.4 + fl.p) * 5 - wa * 14) * dt;
        if (fl.y > PH) { fl.y = -1; fl.x = Math.random() * (PW + 30); }
        if (fl.x < -2) fl.x += PW + 20;
        c.fillRect(Math.floor(fl.x), Math.floor(fl.y), 1, 1);
      }
    }
    if (this.hail.length) {
      c.fillStyle = '#f2f6fa';
      for (const h of this.hail) {
        h.y += h.v * dt; h.x -= wa * 20 * dt;
        if (h.y > PH) { h.y = -2; h.x = Math.random() * (PW + 20); }
        c.fillRect(Math.floor(h.x), Math.floor(h.y), 1, 1);
      }
    }
    for (const l of this.leaves) {
      l.x -= l.v * dt;
      if (l.x < -3) { l.x = PW + Math.random() * 60; l.y = 30 + Math.random() * 50; }
      px(c, l.x, l.y + Math.sin(t * 4 + l.p) * 3, l.c, Math.floor(t * 8 + l.p) % 2 ? 2 : 1, 1);
    }
    if (s.lightning) {
      const phase = t % 7;
      if ((phase > 4.2 && phase < 4.3) || (phase > 4.42 && phase < 4.5)) {
        c.fillStyle = 'rgba(238,244,255,.75)';
        c.fillRect(0, 0, PW, PH);
        const bx = 40 + Math.floor((Math.floor(t / 7) * 37) % 80);
        const pts = [[bx, 18], [bx - 3, 26], [bx + 1, 26], [bx - 4, 36], [bx + 4, 25], [bx, 25], [bx + 3, 18]];
        for (let i = 0; i < 4; i++) pline(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#fff6c2');
      }
    }
  }

  private buildFog(t: number): void {
    const fc = this.fogLayer.getContext('2d')!;
    const img = fc.createImageData(PW + 4, PH);
    const [r, g, b] = hexToRgb(this.P.fog);
    for (let y = 46; y < PH; y++) {
      const band = Math.sin(y * 0.45 + t * 0.4) * 0.5 + 0.5;
      const limit = 0.15 + band * 0.35 + (y - 46) * 0.004;
      for (let x = 0; x < PW + 4; x++) {
        if ((BAYER[y & 3][x & 3] + 0.5) / 16 >= limit) continue;
        const i = (y * (PW + 4) + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    fc.putImageData(img, 0, 0);
    this.fogAt = t;
  }

  private drawEgg(c: Ctx, layer: 'sky' | 'ground'): void {
    if (!this.egg) return;
    const e = this.egg, age = this.time - e.t0, dur = PIXEL_EGG_DURATION[e.kind];
    if (age > dur) { this.egg = null; return; }
    const p = age / dur;
    if (layer === 'ground' && e.kind === 'ufo') {
      const x = Math.round(PW + 10 - p * (PW + 30) + (p > 0.4 && p < 0.55 ? (0.475 - p) * 60 : 0));
      const y = 43 + Math.round(Math.sin(age * 3) * 1.5);
      if (p > 0.42 && p < 0.55) {
        c.fillStyle = 'rgba(200,255,176,.3)';
        for (let i = 0; i < 28; i++) c.fillRect(x - 2 - Math.floor(i / 4), y + 3 + i, 5 + Math.floor(i / 2), 1);
      }
      sprite(c, ['..ccc..', '.ccccc.', 'ggggggg', 'GyGrGgG', '.ggggg.'], { c: '#bfe9ff', g: '#c5cfdb', G: '#9aa7b8', y: '#ffe066', r: '#ff7a7a' }, x - 3, y - 2);
    }
    if (layer === 'sky' && e.kind === 'balloon') {
      const x = Math.round(-10 + p * (PW + 20));
      const y = Math.round(70 - p * 55 + Math.sin(age) * 1);
      sprite(c, ['..rrr..', '.ryyyr.', 'rryyyrr', 'rryyyrr', '.ryyyr.', '..ryr..', '..k.k..', '..bbb..'], { r: '#ef5b5b', y: '#ffd166', k: '#5b4636', b: '#8b5a3c' }, x, y);
    }
    if (layer === 'ground' && e.kind === 'witch') drawWitch(c, p, age);
    if (layer === 'ground' && e.kind === 'sleigh') drawSleigh(c, p, age);
    if (layer === 'ground' && e.kind === 'bunny') drawBunny(c, p, age, this.def.walkY, this.P);
    if (layer === 'ground' && e.kind === 'cat') {
      const x = Math.round(-8 + p * (PW + 16));
      const step = Math.floor(age * 6) % 2;
      const fur = darken('#5a5a5a', this.P.nightK * 0.3);
      sprite(c, ['k.....k.k', 'k.....kkk', '.kkkkkkyk', '.kkkkkk..', step ? '.k.k..k.k' : 'k.k..k.k.'], { k: fur, y: '#ffe066' }, x, this.def.walkY - 5);
    }
  }
}
