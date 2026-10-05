import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { f, type Rand } from '../../util';
import { type FlatSceneDef, tree } from './engine';

/** Rural Denmark: wind turbines on the hills, a farm, a grazing cow and a tractor on the road. */

function turbine(x: number, hub: number, sc: number, P: Palette, s: SceneState, delay: number): string {
  const dur = 1 / (0.1 + s.windAmt * 1.1);
  const blades = [0, 120, 240].map((a) => `<path transform="rotate(${a})" d="M-1.6 0 Q-2.6 -18 0 -36 Q1.4 -18 1.6 0Z" fill="${P.tower}"/>`).join('');
  return `<g transform="translate(${x} ${hub}) scale(${sc})">
    <path d="M-1.2 0 L1.2 0 L2.6 72 L-2.6 72Z" fill="${P.tower}"/>
    <rect x="-2" y="-2.2" width="7" height="4.4" rx="1.5" fill="${P.tower}"/>
    <g class="spin" style="animation-duration:${f(dur, 2)}s;animation-delay:${delay}s">${blades}</g>
    <circle r="2.6" fill="${P.tower}"/></g>`;
}

function farm(P: Palette, snowy: boolean): string {
  const wins = [238, 247, 272, 281].map((x) => `<rect x="${x}" y="182" width="5" height="5" rx=".8" fill="${P.window}"/>`).join('');
  return `<rect x="232" y="176" width="58" height="18" fill="${P.house}"/>
    <rect x="270" y="154" width="5" height="9" fill="${P.house}"/>
    <path d="M228 178 L294 178 L284 160 L238 160Z" fill="${P.roof}"/>
    ${wins}<rect x="257" y="183" width="7" height="11" rx="1" fill="${P.shade('#7a4f35')}"/>
    <rect x="293" y="180" width="32" height="15" fill="${P.barn}"/>
    <path d="M290 182 L328 182 L309 166Z" fill="${snowy ? P.roof : P.shade('#8f3229')}"/>
    <path d="M303 195 V185 H315 V195 M303 185 L315 195 M315 185 L303 195" stroke="${P.house}" stroke-width="1.2" fill="none" opacity=".8"/>`;
}

function cow(x: number, y: number, P: Palette): string {
  const white = P.shade('#f7f7f2');
  const black = P.shade('#2b2b2b');
  const pink = P.shade('#f2a3b0');
  const legs = [-9, -5, 5, 9].map((lx) => `<rect x="${lx - 1.2}" y="-8" width="2.4" height="8" rx="1" fill="${black}"/>`).join('');
  return `<g transform="translate(${x} ${y})">${legs}
    <path d="M12.5 -15 q4 2 3 9" stroke="${black}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="-12" rx="13" ry="7" fill="${white}"/>
    <ellipse cx="4" cy="-14" rx="4" ry="3" fill="${black}"/><ellipse cx="-5" cy="-10" rx="3" ry="2.2" fill="${black}"/>
    <ellipse cx="3" cy="-5.3" rx="2.5" ry="1.6" fill="${pink}"/>
    <g transform="translate(-11 -14)"><g class="rural-graze">
      <ellipse cx="-1" cy="-3.5" rx="2.6" ry="1.2" fill="${black}"/>
      <ellipse cx="-6" cy="2" rx="6" ry="4.5" fill="${white}"/>
      <ellipse cx="-10" cy="4" rx="3" ry="2.6" fill="${pink}"/>
      <circle cx="-6" cy="0.5" r=".9" fill="#222"/></g></g></g>`;
}

function tractor(P: Palette): string {
  const green = P.shade('#4f9d3a');
  const wheel = (cx: number, cy: number, r: number, dur: number) =>
    `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="#2a2a2a"/><g class="spin" style="animation-duration:${dur}s"><circle r="${f(r * 0.45)}" fill="${P.shade('#ffd23f')}"/><rect x="-.8" y="${f(-r * 0.9)}" width="1.6" height="${f(r * 1.8)}" fill="#2a2a2a"/></g></g>`;
  const puffs = [0, 1, 2].map((k) => `<g transform="translate(26 -29)"><circle class="puff" r="3" fill="#d3d8de" style="animation-delay:-${f(k * 0.6)}s"/></g>`).join('');
  const lamp = P.lit ? '<path d="M34 -12 L78 -22 L78 -1Z" fill="#fff3b0" opacity=".22"/><circle cx="34" cy="-12" r="1.8" fill="#fff3b0"/>' : '';
  return `<g transform="translate(0 249)"><g class="drive" style="animation-duration:34s"><g class="bounce">
    ${puffs}${lamp}
    <rect x="25" y="-28" width="2.4" height="11" fill="#444"/>
    <rect x="12" y="-17" width="22" height="10" rx="2" fill="${green}"/>
    <rect x="-2" y="-30" width="16" height="22" rx="2" fill="${green}"/>
    <rect x="1" y="-27" width="10" height="9" rx="1" fill="${P.lit ? '#ffe9a6' : '#cfe9ff'}" opacity=".9"/>
    ${wheel(5, -8, 8, 1.1)}${wheel(28, -5, 5, 0.7)}
  </g></g></g>`;
}

export const rural: FlatSceneDef = {
  walkY: 238,
  land(P: Palette, s: SceneState, R: Rand) {
    let o = `<style>
      .flat-scene .rural-graze { animation: rural-graze 7s ease-in-out infinite; }
      @keyframes rural-graze { 0%, 62%, 100% { transform: rotate(0deg); } 70%, 90% { transform: rotate(-22deg); } }
    </style>
    <defs><pattern id="rural-rows" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-10)"><rect width="12" height="5" fill="${P.stripe}"/></pattern></defs>`;
    o += turbine(380, 100, 1, P, s, 0) + turbine(440, 124, 0.62, P, s, -0.7);
    o += `<path d="M0 178 C 80 148, 160 158, 240 168 S 400 148, 480 162 V264 H0Z" fill="${P.far}"/>`;
    o += `<path d="M0 200 C 100 176, 200 184, 300 194 S 420 184, 480 190 V264 H0Z" fill="${P.mid}"/>`;
    o += `<path d="M0 206 C 60 190, 140 187, 215 193 L 222 228 L0 236Z" fill="url(#rural-rows)" opacity=".55"/>`;
    o += tree(212, 192, 0.85, P, s, R) + tree(340, 194, 0.75, P, s, R) + tree(356, 194, 0.6, P, s, R);
    o += farm(P, s.snowCover);
    o += `<path d="M0 226 C 120 213, 300 219, 480 223 V264 H0Z" fill="${P.front}"/>`;
    o += `<path d="M0 242 C 150 234, 330 238, 480 240 V252 C 330 250, 150 246, 0 254Z" fill="${P.road}"/>`;
    o += tree(30, 236, 1.35, P, s, R) + tree(452, 237, 1.5, P, s, R);
    // Cows go inside when it snows; the barn is warmer.
    if (!s.snowCover) o += cow(112, 232, P);
    o += tractor(P);
    return o;
  },
};
