import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { darken, f, lighten, mix, type Rand } from '../../util';
import { type FlatSceneDef, sway } from './engine';

/** Danish west coast (Skagen): a lighthouse on a dune headland, a sailboat, bathing huts and marram grass. */

const HZ = 158;
const GRASS = { spring: '#9dbb68', summer: '#8fae5c', autumn: '#bba763', winter: '#a3a07a' } as const;
const HUTS = ['#e45b4f', '#f3c64f', '#5aa0d8', '#7cc08a'];

/** Nobody sails in a gale, a downpour or a snow shower: the boat is pulled up on the beach instead. */
const boatOut = (s: SceneState) => s.windAmt <= 0.75 && !['storm', 'pour', 'hail', 'snow', 'sleet'].includes(s.kind);
const choppy = (s: SceneState) => s.kind === 'storm' || s.windAmt > 0.6;

function waveRow(y: number, wl: number, h: number, op: number, sw: number, P: Palette, s: SceneState, R: Rand): string {
  const wa = s.windAmt;
  const hh = h * (1 + wa * 1.6) * (s.kind === 'storm' ? 1.4 : 1);
  const w = wl * (choppy(s) ? 0.62 : 0.5);
  const speed = (3 + wa * 14) * (wl / 40);
  let d = '';
  for (let x = -wl; x < 480 + wl; x += wl) {
    d += choppy(s) ? `M${f(x)} ${y} l${f(w / 2)} ${f(-hh)} l${f(w / 2)} ${f(hh)}` : `M${f(x)} ${y} q${f(w / 2)} ${f(-hh * 2)} ${f(w)} 0`;
  }
  return `<g class="seaside-heave" style="--hv:${f(0.5 + wa * 1.8)}px;animation-duration:${f(3.4 - wa * 1.6, 2)}s;animation-delay:-${f(R() * 3, 2)}s"><path class="seaside-roll" d="${d}" style="--wl:${wl}px;animation-duration:${f(wl / speed, 2)}s" stroke="${P.waterHi}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${op}"/></g>`;
}

function whitecaps(P: Palette, s: SceneState, R: Rand): string {
  const n = Math.max(0, Math.round((s.windAmt - 0.4) * 26)) + (s.kind === 'storm' ? 6 : 0);
  const foam = P.shade('#f4fbff');
  let o = '';
  for (let i = 0; i < n; i++) {
    const y = 163 + R() * 42;
    o += `<g transform="translate(${f(R() * 330)} ${f(y)}) scale(${f(0.6 + (y - 160) / 45, 2)})"><path class="seaside-cap" d="M-5 0 Q-1 -4 0 -4 Q1 -4 5 0Z" fill="${foam}" style="animation-duration:${f(2.2 + R() * 1.6, 2)}s;animation-delay:-${f(R() * 4, 2)}s"/></g>`;
  }
  return o;
}

function boat(P: Palette, s: SceneState, R: Rand): string {
  const wa = s.windAmt;
  const dur = f(150 - wa * 80);
  const sail = P.shade('#fbfaf5');
  const light = P.lit ? '<circle cx="0" cy="-35" r="1.5" fill="#fff3b0"/>' : '';
  // Heels (and streams its pennant) to the left: downwind, like the engine's rain and leaves.
  return `<g transform="translate(0 182)"><g class="drive" style="--from:-40px;--to:520px;animation-duration:${dur}s;animation-delay:-${f(R() * dur)}s"><g class="bob" style="animation-duration:${f(3.2 - wa * 1.4, 2)}s">
    <g transform="rotate(${f(-(3 + wa * 16))})"><g class="sway" style="--amp:${f(1.5 + wa * 3)}deg;animation-duration:${f(3.6 - wa * 1.6, 2)}s">
      <rect x="-.8" y="-34" width="1.6" height="30" fill="${P.shade('#6b4a33')}"/>
      <path d="M-1.6 -32 L-1.6 -6 L-18 -6Z" fill="${sail}"/>
      <path d="M1.6 -30 L1.6 -7 L13 -7Z" fill="${P.shade('#efe9dc')}"/>
      <path d="M0 -34 L-8 -32.5 L0 -31Z" fill="${P.shade('#d23c3c')}"/>
      <path d="M-16 -5 L16 -5 L11 1 L-12 1Z" fill="${P.shade('#2f4f7a')}"/>
      <path d="M-15.2 -3.4 H15" stroke="${sail}" stroke-width=".8"/>${light}
    </g></g>
    <path d="M-18 1.5 q4.5 -2 9 0 t9 0 t9 0 t9 0" stroke="${P.waterHi}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".85"/>
  </g></g></g>`;
}

function dinghy(x: number, y: number, P: Palette): string {
  return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="15" ry="2" fill="${darken(P.sand, 0.25)}" opacity=".4"/>
    <path d="M-13 0 Q-12 -7 0 -7 Q12 -7 13 0Z" fill="${P.shade('#2f4f7a')}"/><path d="M-12.4 -2.5 H12.4" stroke="${P.shade('#fbfaf5')}" stroke-width="1"/></g>`;
}

function hut(x: number, base: number, col: string, P: Palette, s: SceneState): string {
  const wall = P.shade(col);
  const trim = P.shade('#fbfaf6');
  const roof = s.snowCover ? P.snow : P.shade('#4a4f57');
  return `<g transform="translate(${x} ${base})">
    <rect x="-2" y="-1.5" width="20" height="3" rx="1.5" fill="${darken(P.sand, 0.3)}" opacity=".35"/>
    <rect x="0" y="-14" width="16" height="14" fill="${wall}"/>
    <path d="M4 -14 V0 M12 -14 V0" stroke="${darken(wall, 0.18)}" stroke-width=".8"/>
    <rect x="5.5" y="-10" width="5" height="10" fill="${trim}"/>
    <path d="M-2.5 -13 L8 -22 L18.5 -13Z" fill="${roof}"/>
    <path d="M-2.5 -13 L8 -22 L18.5 -13" stroke="${trim}" stroke-width="1" fill="none" stroke-linejoin="round"/></g>`;
}

/** Marram tuft rooted at (x,y): leans downwind and sways harder with wind. */
function tuft(x: number, y: number, sc: number, col: string, s: SceneState, R: Rand): string {
  const blades = `<path d="M0 0 Q-2 -6 -7 -11 M0 0 Q0 -7 1 -15 M0 0 Q2 -5 6 -11 M0 0 Q-1 -4 -3 -9 M0 0 Q1 -4 4 -7" stroke="${col}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
  return `<g transform="translate(${x} ${y}) scale(${sc}) rotate(${f(-s.windAmt * 14)})">${sway(blades, s, R, 1.4)}</g>`;
}

function lighthouse(x: number, y: number, P: Palette): string {
  const red = P.shade('#d64541');
  const dark = P.shade('#3b3f46');
  const glass = P.lit ? '#ffe28a' : P.shade('#bfe0ef');
  return `<g transform="translate(${x} ${y})">
    <path d="M-9 0 L-6 -58 L6 -58 L9 0Z" fill="${P.tower}"/>
    <path d="M-7.45 -30 L-6.93 -40 L6.93 -40 L7.45 -30Z" fill="${red}"/>
    <path d="M1 0 L1 -58 L6 -58 L9 0Z" fill="#000" opacity=".08"/>
    <rect x="-2.5" y="-9" width="5" height="9" rx="2.5" fill="${dark}"/>
    <rect x="-1" y="-24" width="2" height="4" rx="1" fill="${dark}"/><rect x="-1" y="-50" width="2" height="4" rx="1" fill="${dark}"/>
    <rect x="-9" y="-61" width="18" height="3" fill="${dark}"/>
    <rect x="-4.5" y="-71" width="9" height="10" fill="${glass}"/>
    <path d="M-4.5 -71 V-61 M4.5 -71 V-61 M0 -71 V-61" stroke="${dark}" stroke-width="1.2"/>
    <path d="M-6 -71 Q0 -80 6 -71Z" fill="${red}"/><rect x="-.8" y="-80" width="1.6" height="3" fill="${dark}"/></g>`;
}

/** Rotating lamp seen from the side: the beam swings out to one side, folds through the tower, then out the other. */
function beam(x: number, y: number): string {
  return `<defs><linearGradient id="seaside-beam-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3b0" stop-opacity=".55"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient>
    <radialGradient id="seaside-glow-g"><stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>
    <g transform="translate(${x} ${y})"><g class="seaside-beam"><path d="M0 -3 L190 -26 L190 26 L0 3Z" fill="url(#seaside-beam-g)"/></g>
    <circle class="seaside-glow" r="14" fill="url(#seaside-glow-g)"/></g>`;
}

function gull(y: number, sc: number, P: Palette, s: SceneState, R: Rand): string {
  const dur = f(46 - s.windAmt * 24);
  const wing = 'M-7 0 Q-3.5 -4 0 0 Q3.5 -4 7 0';
  return `<g class="drift" style="animation-duration:${dur}s;animation-delay:-${f(R() * dur)}s"><g transform="translate(0 ${y}) scale(${sc})"><g class="seaside-glide" style="animation-delay:-${f(R() * 5, 2)}s">
    <path d="${wing}" stroke="${P.shade('#5d6670')}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="${wing}" stroke="${P.shade('#fbfbf8')}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></g></g>`;
}

export const seaside: FlatSceneDef = {
  walkY: 254,
  leaves: false,
  land(P: Palette, s: SceneState, R: Rand) {
    const wa = s.windAmt;
    const grass = P.shade(GRASS[s.season]);
    const dune = s.snowCover ? darken(P.sand, 0.04) : mix(P.sand, grass, 0.28);
    const foam = P.shade('#f4fbff');
    let o = `<style>
      .flat-scene .seaside-roll  { animation: seaside-roll linear infinite; }
      .flat-scene .seaside-heave { animation: seaside-heave ease-in-out infinite; }
      .flat-scene .seaside-cap   { opacity: 0; animation: seaside-cap ease-out infinite; }
      .flat-scene .seaside-swash { animation: seaside-swash ease-in-out infinite; }
      .flat-scene .seaside-glide { animation: seaside-glide 5s ease-in-out infinite; }
      .flat-scene .seaside-beam  { animation: seaside-beam 8s infinite; }
      .flat-scene .seaside-glow  { animation: seaside-glow 8s ease-in-out infinite; }
      @keyframes seaside-roll  { from { transform: translateX(0); } to { transform: translateX(calc(var(--wl) * -1)); } }
      @keyframes seaside-heave { 0%, 100% { transform: translateY(calc(var(--hv) * -1)); } 50% { transform: translateY(var(--hv)); } }
      @keyframes seaside-cap   { 0%, 100% { opacity: 0; transform: scale(.3); } 40% { opacity: .95; transform: scale(1); } 70% { opacity: 0; transform: scale(1.3, .6); } }
      @keyframes seaside-swash { 0%, 100% { transform: translateY(0); opacity: .95; } 50% { transform: translateY(-3px); opacity: .45; } }
      @keyframes seaside-glide { 0%, 100% { transform: translateY(-4px) rotate(-5deg); } 50% { transform: translateY(4px) rotate(5deg); } }
      @keyframes seaside-beam  {
        0%   { transform: scaleX(1);    animation-timing-function: ease-in; }
        25%  { transform: scaleX(.01);  animation-timing-function: ease-out; }
        50%  { transform: scaleX(-1);   animation-timing-function: ease-in; }
        75%  { transform: scaleX(-.01); animation-timing-function: ease-out; }
        100% { transform: scaleX(1); }
      }
      @keyframes seaside-glow  { 0%, 15%, 35%, 100% { opacity: .45; transform: scale(1); } 25% { opacity: 1; transform: scale(1.9); } }
    </style>
    <defs><linearGradient id="seaside-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${darken(P.water, 0.14)}"/><stop offset=".3" stop-color="${P.water}"/><stop offset="1" stop-color="${lighten(P.water, 0.08)}"/></linearGradient></defs>`;

    // Sea: opaque, from the horizon down. Wave rows behind the boat, the boat, then rows in front of it.
    o += `<rect y="${HZ}" width="480" height="${264 - HZ}" fill="url(#seaside-sea)"/><rect y="${HZ}" width="480" height="1.2" fill="${darken(P.water, 0.3)}" opacity=".5"/>`;
    for (let i = 0; i < 9; i++) {
      o += `<rect x="${f(R() * 320)}" y="${f(161 + R() * 44)}" width="${f(4 + R() * 8)}" height="1" rx=".5" fill="${P.waterHi}" opacity=".35"/>`;
    }
    o += waveRow(165, 30, 1.2, 0.4, 1.1, P, s, R) + waveRow(174, 38, 1.6, 0.55, 1.3, P, s, R);
    if (boatOut(s)) o += boat(P, s, R);
    o += waveRow(189, 48, 2.2, 0.7, 1.6, P, s, R) + waveRow(203, 60, 2.8, 0.85, 1.9, P, s, R);
    o += whitecaps(P, s, R);

    // Headland with rocks at its foot, and the lighthouse on top.
    o += `<path d="M300 264 C 318 214, 340 186, 372 178 C 400 172, 440 174, 480 170 V264Z" fill="${dune}"/>`;
    o += `<g fill="${P.stone}"><ellipse cx="318" cy="216" rx="9" ry="5"/><ellipse cx="331" cy="210" rx="6" ry="4.5"/><ellipse cx="306" cy="220" rx="5" ry="3"/></g>`;
    o += `<g fill="${darken(P.stone, 0.18)}"><ellipse cx="320" cy="219" rx="7" ry="2"/><ellipse cx="332" cy="213" rx="4.5" ry="1.5"/></g>`;
    o += lighthouse(410, 177, P);

    // Beach: wet sand along the waterline, then the swash rolling up and back.
    o += `<path d="M0 216 C 120 210, 240 218, 330 220 S 430 226, 480 226 V264 H0Z" fill="${P.sand}"/>`;
    o += `<path d="M0 218 C 120 212, 240 220, 322 222" stroke="${darken(P.sand, 0.12)}" stroke-width="4" fill="none"/>`;
    o += `<path class="seaside-swash" style="animation-duration:${f(4.4 - wa * 2, 2)}s" d="M0 215 C 120 209, 240 217, 318 219" stroke="${foam}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;

    // Back dune on the left with the bathing huts in front of it.
    o += `<path d="M0 200 C 30 188, 70 182, 110 190 C 140 196, 165 208, 200 222 L0 222Z" fill="${dune}"/>`;
    o += tuft(14, 197, 0.9, grass, s, R) + tuft(52, 188, 1, grass, s, R) + tuft(128, 197, 0.9, grass, s, R) + tuft(160, 208, 0.8, grass, s, R);
    o += HUTS.map((col, i) => hut(28 + i * 23, 226, col, P, s)).join('');
    if (!boatOut(s)) o += dinghy(232, 232, P);
    o += tuft(362, 182, 0.9, grass, s, R) + tuft(446, 176, 1, grass, s, R) + tuft(470, 174, 0.8, grass, s, R);

    if (P.lit) o += beam(410, 111);
    if (s.time !== 'night' && s.kind !== 'storm') o += gull(132, 0.9, P, s, R) + gull(142, 0.65, P, s, R);

    // Foreground dune with marram grass.
    o += `<path d="M0 246 C 60 234, 120 234, 180 242 C 240 250, 300 248, 360 240 C 410 234, 450 236, 480 242 V264 H0Z" fill="${mix(dune, '#ffffff', 0.06)}"/>`;
    for (const [tx, ty, sc] of [[20, 244, 1.2], [70, 240, 1.4], [150, 243, 1.1], [250, 250, 1.3], [330, 247, 1.2], [400, 240, 1.5], [455, 241, 1.2]]) {
      o += tuft(tx, ty, sc, grass, s, R);
    }
    return o;
  },
};
