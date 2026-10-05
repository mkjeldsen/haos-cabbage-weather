import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { f, mix, type Rand, rng } from '../../util';
import { isBlueHour } from '../../palette';
import { PHOTOGRAPHER_CSS, photographerSvg } from './photographer';
import { bunnySvg, flatHolidayGround, flatHolidaySky, HOLIDAY_CSS, sleighSvg, witchSvg } from './holidays';

/**
 * Flat-vector scene engine.
 *
 * Every scene draws into a 480×264 viewBox. The engine paints sky, stars and clouds
 * behind the scene's `land()` markup, and weather effects in front of it. Header text
 * covers roughly y < 150, so interesting props belong in the lower half.
 *
 * Animation is CSS only (see FLAT_CSS). Animate an inner <g> and position it with an
 * outer <g transform="translate(..)">: the CSS transform replaces the SVG transform
 * attribute on the animated element, and rotations pivot on its local (0,0).
 */
export const VIEW_W = 480;
export const VIEW_H = 264;

export interface FlatSceneDef {
  /** SVG markup for land and props (no <svg> wrapper). May include its own <style> for scene keyframes. */
  land(P: Palette, s: SceneState, R: Rand): string;
  /** y (viewBox units) of the foreground walking line, used by the cat easter egg. */
  walkY: number;
  /** Set false for scenes without trees, so strong wind doesn't blow leaves through them. */
  leaves?: boolean;
  /** Free foreground ground points [x, y] for small holiday decorations (first one gets the Christmas tree). */
  spots?: [number, number][];
}

export type EggKind = 'ufo' | 'balloon' | 'cat' | 'witch' | 'sleigh' | 'bunny';

/* ---------- shared prop helpers ---------- */

/** Wrap content so it sways around its local origin (put the origin at the base). */
export function sway(content: string, s: SceneState, R: Rand, strength = 1): string {
  const amp = f((1 + s.windAmt * 6) * strength);
  const dur = f(3.2 - s.windAmt * 1.8 + R() * 0.6, 2);
  return `<g class="sway" style="--amp:${amp}deg;animation-duration:${dur}s;animation-delay:-${f(R() * 2, 2)}s">${content}</g>`;
}

/** Round deciduous tree with base at (x,y). Handles bare winter trees, spring blossom and snow caps. */
export function tree(x: number, y: number, scale: number, P: Palette, s: SceneState, R: Rand): string {
  let body = `<rect x="-1.6" y="-14" width="3.2" height="14" rx="1" fill="${P.trunk}"/>`;
  if (P.bare) {
    body += `<path d="M0 -12 L-7 -24 M0 -16 L6 -27 M0 -20 L0 -32 M-4 -19 L-9 -21 M3 -22 L8 -22" stroke="${P.trunk}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
    if (s.snowCover) body += `<g fill="${P.snow}"><ellipse cx="-6" cy="-24.5" rx="2.4" ry="1.1"/><ellipse cx="5.5" cy="-27.5" rx="2.4" ry="1.1"/><ellipse cx="0" cy="-32.5" rx="2" ry="1"/><ellipse cx="-8.5" cy="-21.5" rx="1.8" ry=".9"/></g>`;
  } else {
    body += `<circle cy="-22" r="10" fill="${P.tree}"/><circle cx="-3.5" cy="-25.5" r="5" fill="${P.treeHi}" opacity=".6"/>`;
    if (P.blossom) body += [[-4, -27], [4, -22], [-1, -17], [5, -28], [-6, -20]].map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="1.4" fill="${P.blossom}"/>`).join('');
    if (s.snowCover) body += `<ellipse cx="0" cy="-29" rx="7.5" ry="3.6" fill="${P.snow}"/>`;
  }
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${scale})">${sway(body, s, R)}</g>`;
}

/** Pine / spruce with base at (x,y). Evergreen in every season. */
export function pine(x: number, y: number, scale: number, P: Palette, s: SceneState, R: Rand): string {
  const g = P.evergreen;
  const hi = mix(g, '#ffffff', 0.12);
  let body = `<rect x="-1.4" y="-6" width="2.8" height="6" fill="${P.trunk}"/>
    <path d="M0 -38 L-8 -22 L-4 -22 L-11 -10 L-5 -10 L-13 -4 L13 -4 L5 -10 L11 -10 L4 -22 L8 -22Z" fill="${g}"/>
    <path d="M0 -38 L-8 -22 L-4 -22 L-11 -10 L-5 -10 L-13 -4 L0 -4Z" fill="${hi}" opacity=".5"/>`;
  if (s.snowCover) body += `<path d="M0 -38 L-5 -28 L5 -28Z M-6 -20 L-9 -14 L9 -14 L6 -20Z" fill="${P.snow}" opacity=".95"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${scale})">${sway(body, s, R, 0.5)}</g>`;
}

export function cloudShape(fill: string, shadeFill: string): string {
  return `<ellipse cx="0" cy="4" rx="26" ry="9" fill="${shadeFill}"/><g fill="${fill}"><ellipse cx="0" cy="0" rx="26" ry="10"/><circle cx="-11" cy="-6" r="11"/><circle cx="5" cy="-12" r="14"/><circle cx="19" cy="-4" r="9"/></g>`;
}

/* ---------- engine ---------- */

function sky(P: Palette, s: SceneState, R: Rand): string {
  let o = `<defs><linearGradient id="cw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.skyTop}"/><stop offset=".5" stop-color="${P.skyMid}"/><stop offset=".72" stop-color="${P.skyBot}"/></linearGradient></defs>
    <rect width="${VIEW_W}" height="${VIEW_H}" fill="url(#cw-sky)"/>`;
  // Stars fade in through nautical twilight.
  const starK = s.cloudCover < 0.55 ? Math.min(1, Math.max(0, (-6 - s.sunElev) / 6)) : 0;
  if (starK > 0) {
    o += `<g fill="#fff" opacity="${f(starK, 2)}">`;
    for (let i = 0; i < 45; i++) {
      o += `<circle class="twinkle" cx="${f(R() * VIEW_W)}" cy="${f(R() * 150)}" r="${f(0.6 + R() * 0.9, 2)}" style="animation-delay:-${f(R() * 4, 2)}s"/>`;
    }
    o += '</g>';
  }
  const n = Math.round(1 + s.cloudCover * 7);
  const dur = 90 - s.windAmt * 65;
  for (let i = 0; i < n; i++) {
    const high = s.cloudCover > 0.7 && i % 2 === 1;
    const y = high ? 14 + R() * 40 : 100 + R() * 42;
    const sc = high ? 0.8 + R() * 0.6 : 0.45 + R() * 0.55;
    const del = (i / n) * dur + R() * 5;
    o += `<g class="drift" style="animation-duration:${f(dur)}s;animation-delay:-${f(del)}s"><g transform="translate(0 ${f(y)}) scale(${f(sc, 2)})">${cloudShape(P.cloud, P.cloudShade)}</g></g>`;
  }
  return o;
}

function weatherFx(def: FlatSceneDef, P: Palette, s: SceneState, R: Rand): string {
  let o = '';
  const k = s.kind;
  const wet = k === 'rain' || k === 'pour' || k === 'storm' || k === 'hail' || k === 'sleet';
  if (wet) o += `<rect width="${VIEW_W}" height="${VIEW_H}" fill="#1b2635" opacity="${k === 'pour' || k === 'storm' ? 0.22 : 0.14}"/>`;

  if (k === 'fog') {
    for (let i = 0; i < 3; i++) {
      const y = 150 + i * 32;
      o += `<g class="drift" style="animation-duration:${70 + i * 25}s;animation-delay:-${f(R() * 60)}s"><g transform="translate(0 ${y})"><ellipse cx="0" cy="0" rx="260" ry="20" fill="${P.fog}" opacity=".55"/></g></g>`;
    }
    o += `<rect y="140" width="${VIEW_W}" height="${VIEW_H - 140}" fill="${P.fog}" opacity=".28"/>`;
  }

  const drops = (k === 'rain' || k === 'storm' || k === 'sleet' ? 90 : k === 'pour' ? 150 : 0) * (s.precip > 0 ? 1 : 0);
  if (drops) {
    const dx = -(20 + s.windAmt * 80);
    o += '<g stroke="rgba(205,228,255,.75)" stroke-width="1.4" stroke-linecap="round">';
    for (let i = 0; i < drops; i++) {
      o += `<g transform="translate(${f(R() * 560 - 20)} 0)"><line class="fall" x1="0" y1="0" x2="${f((dx * 11) / 320, 2)}" y2="11" style="--dx:${f(dx)}px;animation-duration:${f(0.55 + R() * 0.3, 2)}s;animation-delay:-${f(R(), 2)}s"/></g>`;
    }
    o += '</g>';
  }

  const flakes = k === 'snow' ? 70 : k === 'sleet' ? 30 : 0;
  if (flakes) {
    const dx = -(10 + s.windAmt * 80);
    o += `<g fill="${P.snow}" opacity=".92">`;
    for (let i = 0; i < flakes; i++) {
      o += `<g transform="translate(${f(R() * 540)} 0)"><g class="fall" style="--dx:${f(dx)}px;animation-duration:${f(6 + R() * 5, 2)}s;animation-delay:-${f(R() * 11, 2)}s"><circle class="flutter" r="${f(1.2 + R() * 1.4, 2)}" style="animation-delay:-${f(R() * 2.4, 2)}s"/></g></g>`;
    }
    o += '</g>';
  }

  if (k === 'hail') {
    o += '<g fill="#f2f6fa">';
    for (let i = 0; i < 60; i++) {
      o += `<g transform="translate(${f(R() * 500)} 0)"><circle class="fall" r="${f(1.4 + R(), 2)}" style="--dx:-${f(10 + s.windAmt * 40)}px;animation-duration:${f(0.45 + R() * 0.2, 2)}s;animation-delay:-${f(R(), 2)}s"/></g>`;
    }
    o += '</g>';
  }

  if (s.lightning) {
    const bx = 120 + R() * 240;
    o += `<rect class="flash" width="${VIEW_W}" height="${VIEW_H}" fill="#eef4ff"/>
      <path class="flash" d="M${f(bx)} 60 l-10 34 h9 l-12 38 l26 -46 h-10 l9 -26z" fill="#fff6c2"/>`;
  }

  if (s.windAmt > 0.55 && !s.snowCover && def.leaves !== false) {
    const cols = s.season === 'autumn' ? ['#e8a33d', '#d9662f', '#c9483d'] : s.season === 'spring' && P.blossom ? [P.blossom, '#7fb24a', '#f6c4d8'] : ['#e8a33d', '#7fb24a', '#a8c85a'];
    for (let i = 0; i < 12; i++) {
      o += `<g transform="translate(0 ${f(60 + R() * 170)})"><g class="blow" style="animation-duration:${f(2.5 + R() * 2.5, 2)}s;animation-delay:-${f(R() * 5, 2)}s"><ellipse rx="3.2" ry="1.6" fill="${cols[i % 3]}"/></g></g>`;
    }
  }
  return o;
}

export function renderFlatScene(def: FlatSceneDef, P: Palette, s: SceneState): string {
  const R = rng(s.seed);
  const spots = def.spots ?? [[70, def.walkY - 6], [210, def.walkY - 4], [340, def.walkY - 6], [430, def.walkY - 4]];
  return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky(P, s, R)}${flatHolidaySky(P, s, rng(s.seed + 4))}${def.land(P, s, rng(s.seed + 1))}${flatHolidayGround(spots, P, s, rng(s.seed + 5))}${isBlueHour(s) ? photographerSvg(P, VIEW_W, VIEW_H) : ''}${weatherFx(def, P, s, rng(s.seed + 2))}</svg>`;
}

/** One-shot easter egg overlay. The card removes it after EGG_DURATION seconds. */
export function renderFlatEgg(kind: EggKind, def: FlatSceneDef, P: Palette): string {
  let body = '';
  if (kind === 'ufo') {
    body = `<g transform="translate(0 128)"><g class="egg-ufo"><g class="bob">
      <path d="M-6 6 L-26 84 L26 84 L6 6Z" fill="#c8ffb0" class="beam"/>
      <ellipse cx="0" cy="-3" rx="8" ry="7" fill="#bfe9ff" opacity=".9"/>
      <ellipse cx="0" cy="3" rx="20" ry="6" fill="#9aa7b8"/><ellipse cx="0" cy="1.5" rx="20" ry="3.4" fill="#c5cfdb"/>
      <circle cx="-11" cy="4" r="1.6" fill="#ffe066"/><circle cx="0" cy="5.4" r="1.6" fill="#ff7a7a"/><circle cx="11" cy="4" r="1.6" fill="#7affc1"/>
    </g></g></g>`;
  } else if (kind === 'balloon') {
    body = `<g class="egg-balloon"><g class="bob">
      <path d="M0 -30 C 18 -30, 22 -10, 6 4 L-6 4 C -22 -10, -18 -30, 0 -30Z" fill="#ef5b5b"/>
      <path d="M0 -30 C 7 -30, 9 -10, 3 4 L-3 4 C -9 -10, -7 -30, 0 -30Z" fill="#ffd166"/>
      <path d="M-6 4 L-4 12 M6 4 L4 12" stroke="#5b4636" stroke-width=".8"/>
      <rect x="-5" y="12" width="10" height="7" rx="1.5" fill="#8b5a3c"/>
    </g></g>`;
  } else if (kind === 'witch') {
    body = witchSvg();
  } else if (kind === 'sleigh') {
    body = sleighSvg();
  } else if (kind === 'bunny') {
    body = bunnySvg(def.walkY, P);
  } else {
    const fur = mix('#3a3a3a', P.skyBot, 0.1);
    body = `<g transform="translate(0 ${def.walkY})"><g class="egg-cat"><g class="bounce">
      <path d="M-11 -6 q-6 -2 -6 -10" stroke="${fur}" stroke-width="2" fill="none" stroke-linecap="round" class="tail"/>
      <ellipse cx="0" cy="-6" rx="11" ry="5" fill="${fur}"/>
      <circle cx="11" cy="-10" r="4.6" fill="${fur}"/>
      <path d="M8 -13 l1 -5 l3 4Z M12 -14 l2 -5 l2 5Z" fill="${fur}"/>
      <circle cx="12.6" cy="-10.6" r=".9" fill="#ffe066"/>
      <rect x="-8" y="-3" width="2" height="4" fill="${fur}"/><rect x="6" y="-3" width="2" height="4" fill="${fur}"/>
    </g></g></g>`;
  }
  return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
}

export const EGG_DURATION = { ufo: 13, balloon: 32, cat: 15, witch: 14, sleigh: 16, bunny: 12 } as const;

/** Shared animation classes for flat scenes. Scene-specific keyframes live in the scene's own <style>. */
export const FLAT_CSS = `
  .flat-scene .drift   { animation: cw-drift linear infinite; }
  .flat-scene .spin    { animation: cw-spin linear infinite; }
  .flat-scene .sway    { animation: cw-sway ease-in-out infinite; }
  .flat-scene .drive   { animation: cw-drive linear infinite; }
  .flat-scene .bounce  { animation: cw-bounce .45s ease-in-out infinite; }
  .flat-scene .bob     { animation: cw-bob 3s ease-in-out infinite; }
  .flat-scene .puff    { animation: cw-puff 1.8s ease-out infinite; }
  .flat-scene .fall    { animation: cw-fall linear infinite; }
  .flat-scene .flutter { animation: cw-flutter 2.4s ease-in-out infinite; }
  .flat-scene .blow    { animation: cw-blow linear infinite; }
  .flat-scene .twinkle { animation: cw-twinkle 3.5s ease-in-out infinite; }
  .flat-scene .flash   { opacity: 0; animation: cw-flash 7s linear infinite; }
  .flat-scene .egg-ufo     { animation: cw-ufo 13s linear 1 forwards; }
  .flat-scene .egg-ufo .beam { animation: cw-beam 13s linear 1 forwards; opacity: 0; }
  .flat-scene .egg-balloon { animation: cw-balloon 32s linear 1 forwards; }
  .flat-scene .egg-cat     { animation: cw-cat 15s linear 1 forwards; }
  .flat-scene.paused * { animation-play-state: paused !important; }

  @keyframes cw-drift   { from { transform: translateX(570px); } to { transform: translateX(-90px); } }
  @keyframes cw-spin    { to { transform: rotate(360deg); } }
  @keyframes cw-sway    { 0%, 100% { transform: rotate(calc(var(--amp) * -1)); } 50% { transform: rotate(var(--amp)); } }
  @keyframes cw-drive   { from { transform: translateX(var(--from, -60px)); } to { transform: translateX(var(--to, 540px)); } }
  @keyframes cw-bounce  { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
  @keyframes cw-bob     { 0%, 100% { transform: translateY(-1.5px); } 50% { transform: translateY(1.5px); } }
  @keyframes cw-puff    { from { transform: translate(0, 0) scale(.4); opacity: .75; } to { transform: translate(-9px, -16px) scale(1.5); opacity: 0; } }
  @keyframes cw-fall    { from { transform: translate(0, -30px); } to { transform: translate(var(--dx), 290px); } }
  @keyframes cw-flutter { 0%, 100% { transform: translateX(-3px); } 50% { transform: translateX(3px); } }
  @keyframes cw-blow    { from { transform: translate(520px, 0) rotate(0deg); } to { transform: translate(-40px, 36px) rotate(-900deg); } }
  @keyframes cw-twinkle { 0%, 100% { opacity: .9; } 50% { opacity: .2; } }
  @keyframes cw-flash   { 0%, 60%, 62.5%, 64%, 100% { opacity: 0; } 61%, 63.2% { opacity: .85; } }
  @keyframes cw-ufo     { 0% { transform: translate(520px, 0); } 40%, 55% { transform: translate(240px, 6px); } 100% { transform: translate(-60px, -20px); } }
  @keyframes cw-beam    { 0%, 41% { opacity: 0; } 44%, 52% { opacity: .3; } 55%, 100% { opacity: 0; } }
  @keyframes cw-balloon { from { transform: translate(-30px, 200px); } to { transform: translate(520px, 40px); } }
  @keyframes cw-cat     { from { transform: translateX(-30px); } to { transform: translateX(520px); } }
${HOLIDAY_CSS}${PHOTOGRAPHER_CSS}`;
