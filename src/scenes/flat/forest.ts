import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { darken, f, lighten, mix, type Rand } from '../../util';
import { type FlatSceneDef, pine, sway, tree } from './engine';

/** Danish forest clearing: rows of pines and beeches, a kid on a rope swing, a roe deer, an owl at night. */

const ridgeY = (x: number) => 170 + 5 * Math.sin(x / 55) + 3 * Math.sin(x / 21 + 1);
const midY = (x: number) => 196 + 4 * Math.sin(x / 70 + 2) + 2 * Math.sin(x / 31);
const frontY = (x: number) => 225 + 3 * Math.sin(x / 90 + 1);

/** Filled band from a sampled top edge down to the bottom of the frame. */
function band(yAt: (x: number) => number, fill: string): string {
  let d = `M0 ${f(yAt(0))}`;
  for (let x = 8; x <= 480; x += 8) d += ` L${x} ${f(yAt(x))}`;
  return `<path d="${d} V264 H0Z" fill="${fill}"/>`;
}

/** The kid stays in when it is dark, gusty or pouring. */
export function kidOutside(s: SceneState): boolean {
  const heavy = s.kind === 'pour' || s.kind === 'storm' || s.kind === 'hail' || s.precip > 0.6;
  return s.time !== 'night' && s.windAmt <= 0.6 && !heavy;
}

/** Far tree line: small silhouette pines and round trees on the ridge. */
function backRow(P: Palette, s: SceneState, R: Rand): string {
  const pineCol = mix(darken(P.evergreen, 0.18), P.far, 0.3);
  const roundCol = mix(darken(P.tree, 0.2), P.far, 0.3);
  // A scalloped wall of canopy behind the silhouettes makes the far woods read as dense.
  const wall = mix(darken(P.tree, 0.28), P.far, 0.4);
  let o = band((x) => ridgeY(x) - 9 - 5 * Math.abs(Math.sin(x / 9 + Math.sin(x / 37))), wall);
  for (let x = -6; x < 492; x += 10 + R() * 9) {
    const sc = f(0.5 + R() * 0.3, 2);
    const y = f(ridgeY(x) + 4);
    let body: string;
    if (R() < 0.62) {
      body = `<path d="M0 -36 L-7 -21 L-4 -21 L-10 -9 L-5 -9 L-12 0 L12 0 L5 -9 L10 -9 L4 -21 L7 -21Z" fill="${pineCol}"/>`;
      if (s.snowCover) body += `<path d="M0 -36 L-4.6 -26 L4.6 -26Z M-5 -19 L-7.5 -14 L7.5 -14 L5 -19Z" fill="${P.snow}" opacity=".85"/>`;
    } else if (P.bare) {
      body = `<path d="M0 0 V-24 M0 -10 L-8 -22 M0 -14 L7 -26 M-3 -17 L-10 -19" stroke="${roundCol}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    } else {
      body = `<rect x="-1.5" y="-10" width="3" height="10" fill="${roundCol}"/><circle cy="-20" r="11" fill="${roundCol}"/>`;
      if (s.snowCover) body += `<ellipse cy="-28" rx="8" ry="3.6" fill="${P.snow}" opacity=".85"/>`;
    }
    o += `<g transform="translate(${f(x)} ${y}) scale(${sc})">${sway(body, s, R, 0.35)}</g>`;
  }
  return o;
}

/** The big swing tree: trunk, a long branch to the right, a broad crown above. Swing pivots at (162, 165). */
function swingTree(P: Palette, s: SceneState, R: Rand): string {
  let o = `<path d="M50 254 C 60 222, 58 190, 60 146 L 76 146 C 76 190, 74 224, 86 254Z" fill="${P.trunk}"/>
    <path d="M72 172 C 110 163, 150 159, 196 161 L197 166 C 150 166, 112 172, 74 184Z" fill="${P.trunk}"/>
    <path d="M60 150 C 62 190, 62 222, 54 252" stroke="${darken(P.trunk, 0.18)}" stroke-width="3" fill="none" opacity=".6"/>`;
  if (s.snowCover) o += `<path d="M78 170 C 112 162, 150 158, 195 160" stroke="${P.snow}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;

  // Crown, in local coordinates around the top of the trunk (68, 150) so it can sway a little.
  let crown: string;
  if (P.bare) {
    crown = `<path d="M-8 2 C -7 -20, -6 -34, -3 -54 L 2 -54 C 3 -34, 6 -20, 8 2Z" fill="${P.trunk}"/>
      <g stroke="${P.trunk}" stroke-linecap="round" fill="none">
      <path d="M-5 -18 L-36 -46 M0 -30 L30 -62 M-1 -50 L-14 -80 M3 -38 L48 -44 M-6 -6 L-44 -22" stroke-width="4.5"/>
      <path d="M-36 -46 L-48 -62 M-36 -46 L-54 -46 M30 -62 L34 -80 M30 -62 L48 -72 M-14 -80 L-26 -92 M-14 -80 L-6 -96 M48 -44 L64 -54 M48 -44 L62 -38 M-44 -22 L-60 -32 M-1 -54 L6 -74 M16 -46 L18 -60" stroke-width="2"/></g>`;
  } else {
    const blobs: [number, number, number][] = [[-40, -22, 28], [0, -40, 40], [42, -26, 30], [72, -6, 20]];
    crown = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y + 4}" r="${r}" fill="${P.treeShade}"/>`).join('');
    crown += blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${P.tree}"/>`).join('');
    crown += blobs.map(([x, y, r]) => `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.5)}" fill="${P.treeHi}" opacity=".6"/>`).join('');
    if (P.blossom) {
      for (let i = 0; i < 22; i++) {
        const [bx, by, br] = blobs[i % blobs.length];
        const a = R() * Math.PI * 2, d = R() * br * 0.85;
        crown += `<circle cx="${f(bx + Math.cos(a) * d)}" cy="${f(by + Math.sin(a) * d)}" r="2" fill="${P.blossom}"/>`;
      }
    }
    if (s.snowCover) crown += blobs.map(([x, y, r]) => `<ellipse cx="${x}" cy="${f(y - r * 0.72)}" rx="${f(r * 0.7)}" ry="${f(r * 0.3)}" fill="${P.snow}"/>`).join('');
  }
  const amp = f(0.4 + s.windAmt * 1.6);
  const dur = f(4 - s.windAmt * 2 + R() * 0.5, 2);
  o += `<g transform="translate(68 150)"><g class="sway" style="--amp:${amp}deg;animation-duration:${dur}s">${crown}</g></g>`;
  return o;
}

function kid(P: Palette, s: SceneState): string {
  const skin = P.shade('#f4c8a2');
  const hair = P.shade('#8a5a2b');
  const shirt = P.shade(s.season === 'winter' || s.snowCover ? '#3f8fd0' : '#e8553f');
  const pants = P.shade('#3b5b8c');
  const shoe = P.shade('#3a2f2a');
  const ink = P.shade('#3a2a22');
  let head = `<circle cx="0" cy="33" r="7" fill="${skin}"/>`;
  if (s.season === 'winter' || s.snowCover) {
    const hat = P.shade('#e8553f');
    head += `<path d="M-7.4 32 A7.4 7.4 0 0 1 7.4 32Z" fill="${hat}"/><rect x="-7.8" y="30.5" width="15.6" height="2.6" rx="1.2" fill="${P.shade('#f6f1e7')}"/><circle cx="0" cy="24.6" r="2.2" fill="${P.shade('#f6f1e7')}"/>`;
  } else {
    head += `<path d="M-7.2 32 A7.2 7.2 0 0 1 7.2 32 Q3 29 0 30.5 Q-4 28.5 -7.2 32Z" fill="${hair}"/>`;
  }
  head += `<circle cx="-2.4" cy="34" r=".9" fill="${ink}"/><circle cx="2.4" cy="34" r=".9" fill="${ink}"/>
    <path d="M-2.2 36.6 Q0 38.4 2.2 36.6" stroke="${ink}" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
  return `<rect x="-6" y="56" width="4.4" height="11" rx="1.6" fill="${pants}"/><rect x="1.6" y="56" width="4.4" height="11" rx="1.6" fill="${pants}"/>
    <ellipse cx="-4" cy="67.5" rx="3" ry="1.8" fill="${shoe}"/><ellipse cx="4" cy="67.5" rx="3" ry="1.8" fill="${shoe}"/>
    <rect x="-7" y="40" width="14" height="17" rx="4.5" fill="${shirt}"/>
    <path d="M-5.5 43 L-8.6 47 M5.5 43 L8.6 47" stroke="${shirt}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="-9" cy="47" r="1.8" fill="${skin}"/><circle cx="9" cy="47" r="1.8" fill="${skin}"/>${head}`;
}

function swing(P: Palette, s: SceneState, R: Rand): string {
  const out = kidOutside(s);
  const rope = P.shade('#d8c39a');
  let body = `<path d="M-9 0 V56 M9 0 V56" stroke="${rope}" stroke-width="1.4"/>
    <rect x="-13" y="55" width="26" height="4.2" rx="1.2" fill="${P.shade('#8b5a3c')}"/>`;
  if (s.snowCover && !out) body += `<rect x="-12.5" y="53.2" width="25" height="2.4" rx="1.2" fill="${P.snow}"/>`;
  if (out) body += kid(P, s);
  // With a kid: a calm, wide pendulum. Empty: the wind pushes it around.
  const amp = out ? 20 : 3 + s.windAmt * 20;
  const dur = out ? 3.2 : 2.6 - s.windAmt * 0.9 + R() * 0.3;
  return `<g transform="translate(162 165)"><g class="sway" style="--amp:${f(amp)}deg;animation-duration:${f(dur, 2)}s">${body}</g></g>`;
}

/** Leg keyframes: steps only while the deer is walking (see forest-deer). */
function stepFrames(name: string, amp: number): string {
  const stops: string[] = [];
  for (let p = 0; p <= 100; p++) {
    const walking = (p > 20 && p < 42) || (p > 62 && p < 86);
    stops.push(`${p}%{transform:rotate(${walking ? (p % 2 ? amp : -amp) : 0}deg)}`);
  }
  return `@keyframes ${name}{${stops.join('')}}`;
}

/** Roe deer facing left, feet at local y=0. */
function deer(P: Palette, s: SceneState, R: Rand): string {
  const coat = P.shade(s.season === 'winter' || s.snowCover ? '#8c7864' : '#b8693a');
  const far = darken(coat, 0.22);
  const belly = P.shade('#ead7b8');
  const rump = P.shade('#f6f0e4');
  const ink = P.shade('#2b2320');
  const antler = P.shade('#d9c7a3');
  const leg = (x: number, cls: string, col: string) => `<g transform="translate(${x} -14)"><g class="${cls}"><rect x="-1.1" y="0" width="2.2" height="14" rx="1" fill="${col}"/><rect x="-1.1" y="12.4" width="2.2" height="1.6" fill="${ink}"/></g></g>`;
  return `<g transform="translate(0 229)"><g class="forest-deer" style="--d:-${f(R() * 40, 1)}s">
    ${leg(-7, 'forest-leg-b', far)}${leg(9, 'forest-leg-a', far)}
    <ellipse cx="0" cy="-18" rx="13" ry="6.5" fill="${coat}"/>
    <ellipse cx="0" cy="-14.5" rx="9" ry="2.6" fill="${belly}" opacity=".7"/>
    <ellipse cx="12" cy="-19" rx="3" ry="4" fill="${rump}"/>
    ${leg(-10, 'forest-leg-a', coat)}${leg(7, 'forest-leg-b', coat)}
    <g transform="translate(-9 -20)"><g class="forest-graze">
      <path d="M-2 2 L-7 -13 L-1 -14 L4 0Z" fill="${coat}"/>
      <path d="M-4 -16 l-1 -6 M-4 -19 l-3 -1 M-1 -16 l1 -6 M0 -19 l2.4 -1.6" stroke="${antler}" stroke-width="1.1" stroke-linecap="round"/>
      <path d="M-1 -15 l4 -4 l-.6 5Z" fill="${far}"/>
      <ellipse cx="-8" cy="-14" rx="6" ry="3.6" fill="${coat}" transform="rotate(14 -8 -14)"/>
      <circle cx="-13.2" cy="-12.6" r="1.1" fill="${ink}"/><circle cx="-7.2" cy="-15" r=".8" fill="${ink}"/>
    </g></g>
  </g></g>`;
}

function owl(P: Palette): string {
  const body = P.shade('#9a7650');
  const face = P.shade('#d8b98e');
  return `<g transform="translate(112 168)">
    <path d="M-6 -15 l-1 -5 l4 3Z M6 -15 l1 -5 l-4 3Z" fill="${body}"/>
    <ellipse cx="0" cy="-8" rx="6.5" ry="8.5" fill="${body}"/>
    <ellipse cx="0" cy="-11" rx="5.4" ry="4.4" fill="${face}"/>
    <path d="M-4 -3 q4 3 8 0" stroke="${face}" stroke-width=".8" fill="none" opacity=".7"/>
    <g transform="translate(0 -11.2)"><g class="forest-blink">
      <circle cx="-2.5" r="2.2" fill="#ffd84a"/><circle cx="2.5" r="2.2" fill="#ffd84a"/>
      <circle cx="-2.5" r="1" fill="#1c1a16"/><circle cx="2.5" r="1" fill="#1c1a16"/></g></g>
    <path d="M-.9 -9 L.9 -9 L0 -7Z" fill="${P.shade('#e2a03a')}"/>
    <path d="M-3 0 v1.6 M-1.6 0 v1.6 M1.6 0 v1.6 M3 0 v1.6" stroke="${P.shade('#e2a03a')}" stroke-width=".9"/>
  </g>`;
}

function log(P: Palette, s: SceneState): string {
  const wood = P.shade('#7a5537');
  let o = `<rect x="380" y="234" width="60" height="14" rx="6" fill="${wood}"/>
    <path d="M392 238 h18 M400 243 h22 M416 238 h14" stroke="${darken(wood, 0.25)}" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="381" cy="241" rx="5" ry="7" fill="${P.shade('#c99c64')}"/>
    <ellipse cx="381" cy="241" rx="2.6" ry="3.8" fill="none" stroke="${P.shade('#9c7346')}" stroke-width=".9"/>`;
  if (s.snowCover) o += `<path d="M383 235.5 Q384 230.5 392 231 L432 231 Q440 231 439 236 Z" fill="${P.snow}"/>`;
  else if (s.season === 'spring' || s.season === 'summer') o += `<ellipse cx="410" cy="234.5" rx="14" ry="2.6" fill="${P.shade('#6fa34a')}"/><ellipse cx="428" cy="235" rx="6" ry="2" fill="${P.shade('#6fa34a')}"/>`;
  return o;
}

function mushroom(x: number, y: number, sc: number, red: boolean, P: Palette): string {
  const cap = P.shade(red ? '#d6402f' : '#a9743f');
  const stem = P.shade('#f1e8d6');
  const dots = red ? `<circle cx="-2" cy="-7.4" r=".8" fill="${stem}"/><circle cx="1.8" cy="-8" r=".8" fill="${stem}"/><circle cx="0" cy="-6" r=".6" fill="${stem}"/>` : '';
  return `<g transform="translate(${x} ${y}) scale(${sc})"><rect x="-1.2" y="-6" width="2.4" height="6" rx=".8" fill="${stem}"/><path d="M-5 -5.2 Q0 -12 5 -5.2Z" fill="${cap}"/>${dots}</g>`;
}

export const forest: FlatSceneDef = {
  walkY: 252,
  spots: [[122, 248], [176, 246], [318, 248], [455, 252]],
  land(P: Palette, s: SceneState, R: Rand) {
    let o = `<style>
      .flat-scene .forest-deer { animation: forest-deer 40s linear infinite; animation-delay: var(--d, 0s); }
      .flat-scene .forest-deer .forest-leg-a { animation: forest-leg-a 40s linear infinite; animation-delay: var(--d, 0s); }
      .flat-scene .forest-deer .forest-leg-b { animation: forest-leg-b 40s linear infinite; animation-delay: var(--d, 0s); }
      .flat-scene .forest-deer .forest-graze { animation: forest-graze 40s ease-in-out infinite; animation-delay: var(--d, 0s); }
      .flat-scene .forest-blink { animation: forest-blink 4.6s linear infinite; }
      @keyframes forest-deer { 0%, 20% { transform: translateX(540px); } 42%, 62% { transform: translateX(345px); } 86%, 100% { transform: translateX(-60px); } }
      @keyframes forest-graze { 0%, 43% { transform: rotate(0deg); } 46%, 52% { transform: rotate(-80deg); } 54%, 55.5% { transform: rotate(-6deg); } 57.5%, 60% { transform: rotate(-80deg); } 62%, 100% { transform: rotate(0deg); } }
      @keyframes forest-blink { 0%, 88%, 100% { transform: scaleY(1); } 91% { transform: scaleY(.1); } 94% { transform: scaleY(1); } }
      ${stepFrames('forest-leg-a', 22)}${stepFrames('forest-leg-b', -22)}
    </style>`;
    o += backRow(P, s, R);
    o += band(ridgeY, P.far);

    // A smaller row of real trees between the far woods and the clearing.
    for (let x = 4; x < 490; x += 17 + R() * 10) {
      if (x > 296 && x < 340) continue;
      const sc = 0.55 + R() * 0.2;
      o += R() < 0.5 ? pine(x, ridgeY(x) + 15, sc, P, s, R) : tree(x, ridgeY(x) + 15, sc * 1.1, P, s, R);
    }

    // Middle row of real trees; a gap where the path enters the woods.
    o += band(midY, P.mid);
    const mids: [number, boolean][] = [[8, true], [118, false], [176, false], [192, true], [212, false], [230, true], [248, false], [266, true], [286, false], [348, true], [362, false], [380, true], [398, false], [416, true], [432, false], [450, true], [470, false], [486, true]];
    for (const [x, isPine] of mids) {
      const sc = 0.85 + R() * 0.3;
      o += isPine ? pine(x, midY(x) + 2, sc, P, s, R) : tree(x, midY(x) + 2, sc * 1.05, P, s, R);
    }

    o += band(frontY, P.front);
    o += `<path d="M236 264 C 252 242, 296 230, 314 ${f(midY(318) + 1)} L 327 ${f(midY(327) + 1)} C 322 230, 304 246, 318 264Z" fill="${P.road}"/>`;
    const tuft = darken(P.front, 0.16);
    o += `<g stroke="${tuft}" stroke-width="1.2" stroke-linecap="round" fill="none">`;
    for (let i = 0; i < 26; i++) {
      const x = R() * 480, y = 232 + R() * 30;
      if (x > 228 && x < 330 && y > 232) continue;
      o += `<path d="M${f(x - 2)} ${f(y)} l1 -4 M${f(x)} ${f(y)} v-5 M${f(x + 2)} ${f(y)} l-1 -4"/>`;
    }
    o += '</g>';

    if (s.time !== 'night') o += deer(P, s, R);
    o += log(P, s);
    if (s.season === 'autumn' && !s.snowCover) {
      o += mushroom(396, 251, 1.2, true, P) + mushroom(406, 250, 0.9, true, P) + mushroom(449, 250, 1, false, P) + mushroom(94, 255, 1.1, true, P) + mushroom(102, 254, 0.8, false, P);
    }

    o += swingTree(P, s, R);
    o += swing(P, s, R);
    if (s.time === 'night' && P.lit) o += owl(P);

    // Fireflies on summer nights.
    if (s.time === 'night' && s.season === 'summer' && s.precip === 0) {
      for (let i = 0; i < 7; i++) {
        o += `<g transform="translate(${f(120 + R() * 320)} ${f(200 + R() * 40)})"><g class="bob" style="animation-delay:-${f(R() * 3, 2)}s;animation-duration:${f(2.4 + R() * 2, 2)}s"><circle class="twinkle" r="1.5" fill="${lighten('#d9f56a', 0.2)}" style="animation-delay:-${f(R() * 3.5, 2)}s;animation-duration:${f(1.6 + R() * 1.5, 2)}s"/></g></g>`;
      }
    }

    o += pine(462, 262, 2.3, P, s, R);
    return o;
  },
};
