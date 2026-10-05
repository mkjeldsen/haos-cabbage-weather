import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { f, mix, type Rand } from '../../util';
import { type FlatSceneDef, tree } from './engine';

/** Copenhagen street: Nyhavn-coloured townhouses, a copper spire and dome, cars, a yellow bus and lots of bikes. */

type Gable = 'eave' | 'gable' | 'step';
/** [x, width, eave row, roof type, wall, roof] in pixel-scene units (×3 here) so both styles show the same street. */
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
/** Background blocks [x, width, top] in pixel units. */
const BLOCKS = [[0, 12, 38], [9, 9, 34], [48, 14, 37], [60, 9, 33], [84, 12, 36], [118, 12, 35], [136, 10, 39], [146, 14, 34]];
const LAMPS = [102, 300, 420];
const TREES = [30, 192, 354];
const GROUND = 210;
const WET = ['rain', 'pour', 'storm', 'hail', 'sleet'];
const HEAVY = ['pour', 'storm', 'snow', 'sleet', 'hail'];

/** Window colour: at dusk/night a deterministic subset is lit. */
function win(P: Palette, R: Rand): string {
  return !P.lit ? P.window : R() < 0.42 ? P.window : P.shade('#41536a');
}

function skyline(P: Palette, R: Rand): string {
  const haze = mix(P.skyBot, P.shade('#7e8da0'), 0.5);
  const copper = mix(haze, P.shade('#5fa58c'), 0.75);
  const glow = mix(P.window, haze, 0.35);
  let o = '';
  for (const [x, w, top] of BLOCKS) {
    o += `<rect x="${x * 3}" y="${top * 3}" width="${w * 3}" height="${GROUND - top * 3}" fill="${haze}"/>`;
    if (P.lit) for (let k = 0; k < 3; k++) if (R() < 0.6) o += `<rect x="${f(x * 3 + 3 + R() * (w * 3 - 8))}" y="${f(top * 3 + 6 + R() * 22)}" width="3" height="3" fill="${glow}"/>`;
  }
  // Church tower with a green copper spire.
  o += `<rect x="96" y="90" width="18" height="${GROUND - 90}" fill="${haze}"/>
    <rect x="102" y="98" width="6" height="8" rx="3" fill="${mix(haze, '#000000', 0.25)}"/>
    <path d="M93 91 L105 38 L117 91Z" fill="${copper}"/><path d="M105 38 L117 91 H105Z" fill="${mix(copper, '#000000', 0.12)}"/>
    <path d="M105 38 V30 M102 33 H108" stroke="${copper}" stroke-width="1.4"/>`;
  // Domed church (Marmorkirken-ish).
  o += `<rect x="312" y="117" width="36" height="${GROUND - 117}" fill="${mix(haze, '#ffffff', 0.06)}"/>
    <path d="M312 118 A18 18 0 0 1 348 118Z" fill="${copper}"/><path d="M318 108 A12 13 0 0 1 328 100" stroke="${mix(copper, '#ffffff', 0.25)}" stroke-width="2" fill="none"/>
    <rect x="327" y="90" width="6" height="10" fill="${copper}"/><path d="M326 90 L330 82 L334 90Z" fill="${copper}"/>`;
  return o;
}

function house(i: number, P: Palette, s: SceneState, R: Rand): string {
  const [hx, hw, he, type, wallDay, roofDay] = HOUSES[i];
  const x = hx * 3, w = hw * 3, e = he * 3, cx = x + w / 2;
  const wall = P.shade(wallDay);
  const trim = P.house;
  const roof = s.snowCover ? P.snow : P.shade(roofDay);
  const cap = s.snowCover ? P.snow : trim;
  let o = `<rect x="${x}" y="${e}" width="${w}" height="${GROUND - e}" fill="${wall}"/>
    <rect x="${x + w - 2}" y="${e}" width="2" height="${GROUND - e}" fill="${mix(wall, '#000000', 0.1)}"/>`;

  if (type === 'eave') {
    o += `<rect x="${x + w - 13}" y="${e - 26}" width="5" height="12" fill="${P.shade('#7d4536')}"/>`;
    if (s.snowCover) o += `<rect x="${x + w - 13.5}" y="${e - 28}" width="6" height="3" rx="1.2" fill="${P.snow}"/>`;
    o += `<path d="M${x - 2} ${e} L${x + 5} ${e - 17} L${x + w - 5} ${e - 17} L${x + w + 2} ${e}Z" fill="${roof}"/>
      <rect x="${x - 2}" y="${e - 1.6}" width="${w + 4}" height="1.6" fill="${P.shade('#5a4a44')}"/>
      <path d="M${cx - 6} ${e - 2} V${e - 11} L${cx} ${e - 17} L${cx + 6} ${e - 11} V${e - 2}Z" fill="${trim}"/>
      <rect x="${cx - 3}" y="${e - 10}" width="6" height="7" fill="${win(P, R)}"/>`;
    if (s.snowCover) o += `<path d="M${cx - 7.5} ${e - 10} L${cx} ${e - 18.5} L${cx + 7.5} ${e - 10}Z" fill="${P.snow}"/>`;
  } else if (type === 'gable') {
    const top = e - w * 0.55;
    o += `<path d="M${x} ${e + 1} L${cx} ${f(top)} L${x + w} ${e + 1}Z" fill="${wall}"/>
      <path d="M${x - 1} ${e + 2} L${cx} ${f(top - 2)} L${x + w + 1} ${e + 2}" fill="none" stroke="${roof}" stroke-width="${s.snowCover ? 4.5 : 3.5}" stroke-linejoin="round"/>
      <circle cx="${cx}" cy="${f(e - (e - top) * 0.42)}" r="3.4" fill="${win(P, R)}" stroke="${trim}" stroke-width="1.2"/>`;
  } else {
    // Danish stepped gable: three levels, each capped with white trim (or snow).
    for (let k = 0; k < 3; k++) {
      const y = e - 6 * (k + 1);
      o += `<rect x="${x + 6 * k}" y="${y}" width="${w - 12 * k}" height="7" fill="${wall}"/>
        <rect x="${x + 6 * k - 1}" y="${y - 1}" width="8" height="${s.snowCover ? 3 : 2}" fill="${cap}"/>
        <rect x="${x + w - 6 * k - 7}" y="${y - 1}" width="8" height="${s.snowCover ? 3 : 2}" fill="${cap}"/>`;
    }
    o += `<circle cx="${cx}" cy="${e - 9}" r="3" fill="${win(P, R)}" stroke="${trim}" stroke-width="1.2"/>`;
  }
  o += `<rect x="${x}" y="${e}" width="${w}" height="3" fill="${trim}"/>`;

  // Upper-floor windows, some with flower boxes in the warm half of the year.
  const n = hw >= 14 ? 3 : 2;
  const flowers = (s.season === 'spring' || s.season === 'summer') && !s.snowCover;
  for (let y = e + 9; y + 11 <= 191; y += 15) {
    for (let k = 0; k < n; k++) {
      const wx = f(x + (w * (k + 0.5)) / n - 4);
      o += `<rect x="${wx}" y="${y}" width="8" height="11" fill="${win(P, R)}" stroke="${trim}" stroke-width="1.4"/>`;
      if (flowers && R() < 0.3) {
        o += `<rect x="${f(wx - 1)}" y="${y + 11}" width="10" height="2.6" fill="${P.shade('#7a5a3a')}"/>
          <circle cx="${f(wx + 1.5)}" cy="${y + 10.6}" r="1.6" fill="${P.shade('#e8505b')}"/><circle cx="${f(wx + 4.5)}" cy="${y + 10}" r="1.6" fill="${P.shade('#ffd166')}"/><circle cx="${f(wx + 7.5)}" cy="${y + 10.6}" r="1.6" fill="${P.shade('#e8505b')}"/>`;
      }
    }
  }

  // Ground floor: shop window (lit after dark), door, and the odd striped awning.
  const sw = Math.round(w * 0.42);
  o += `<rect x="${x + 3}" y="193" width="${sw}" height="12" fill="${P.lit ? P.window : P.shade('#6f8aa6')}" stroke="${trim}" stroke-width="1.2"/>
    <rect x="${f(x + w * 0.62)}" y="192" width="9" height="18" rx="1" fill="${P.shade(DOORS[i % 3])}"/>
    <rect x="${f(x + w * 0.62 - 1)}" y="191" width="11" height="2" fill="${trim}"/>`;
  if (AWNINGS.includes(i)) {
    const red = P.shade('#d64545');
    for (let k = 0; k < sw + 4; k += 4) o += `<rect x="${x + 1 + k}" y="186" width="4" height="6" fill="${(k / 4) % 2 ? trim : red}"/><circle cx="${x + 3 + k}" cy="192" r="2" fill="${(k / 4) % 2 ? trim : red}"/>`;
    if (s.snowCover) o += `<rect x="${x + 1}" y="184.5" width="${sw + 4}" height="2.5" rx="1" fill="${P.snow}"/>`;
  }
  return o;
}

function street(P: Palette, s: SceneState, R: Rand): string {
  let asph = P.shade('#5a5f69');
  let lane = P.shade('#6c717b');
  if (s.snowCover) {
    asph = mix(asph, P.snow, 0.35);
    lane = mix(lane, P.snow, 0.55);
  }
  const pave = s.snowCover ? P.snow : P.shade('#cdc6b8');
  const curb = P.shade('#a29c90');
  let o = `<rect y="${GROUND}" width="480" height="6" fill="${pave}"/>
    <rect y="216" width="480" height="3" fill="${curb}"/>
    <rect y="219" width="480" height="9" fill="${lane}"/>
    <rect y="228" width="480" height="3" fill="${curb}"/>
    <rect y="231" width="480" height="27" fill="${asph}"/>
    <rect y="258" width="480" height="3" fill="${curb}"/>
    <rect y="261" width="480" height="3" fill="${pave}"/>`;
  const dash = P.shade('#ece8da');
  for (let x = 6; x < 480; x += 36) o += `<rect x="${x}" y="243" width="18" height="2.4" fill="${dash}" opacity=".8"/>`;
  // Painted bike symbols in the bike lane.
  for (const bx of [150, 390]) {
    o += `<g transform="translate(${bx} 226)" stroke="${dash}" stroke-width=".9" fill="none" opacity="${s.snowCover ? 0.25 : 0.6}"><circle cx="-4" cy="-2.6" r="2.4"/><circle cx="4" cy="-2.6" r="2.4"/><path d="M-4 -2.6 L-1 -2.6 L2 -6 M4 -2.6 L2 -6.5"/></g>`;
  }
  if (s.snowCover) {
    const track = P.shade('#5a5f69');
    o += `<rect y="238" width="480" height="3" fill="${track}" opacity=".45"/><rect y="253" width="480" height="3" fill="${track}" opacity=".45"/>`;
  }
  if (WET.includes(s.kind)) {
    for (let i = 0; i < 10; i++) o += `<rect x="${f(R() * 460)}" y="${f(233 + R() * 22)}" width="${f(14 + R() * 26)}" height="1.3" rx=".6" fill="#ffffff" opacity=".13"/>`;
    // Street lamps mirrored in the wet asphalt.
    if (P.lit) {
      for (const lx of LAMPS) for (let k = 0; k < 5; k++) {
        const w = 12 - k * 2;
        o += `<rect x="${lx + 8 - w / 2}" y="${234 + k * 5}" width="${w}" height="1.8" rx=".9" fill="#ffe2a0" opacity="${f(0.42 - k * 0.07, 2)}"/>`;
      }
    }
  }
  if (s.season === 'autumn' && !s.snowCover) {
    const cols = ['#e8a33d', '#d9662f', '#c9483d'].map(P.shade);
    for (let i = 0; i < 16; i++) o += `<ellipse cx="${f(R() * 480)}" cy="${f(211 + R() * 4)}" rx="2" ry="1" fill="${cols[i % 3]}"/>`;
  }
  return o;
}

/** Copenhagen street lamp; base on the pavement. */
function lamp(x: number, P: Palette, s: SceneState): string {
  const pole = P.shade('#3a3f47');
  let o = `<g transform="translate(${x} 214)">`;
  if (P.lit) o += `<path d="M5 -45 L-14 0 L30 0 L11 -45Z" fill="#ffe7a3" opacity=".13"/>`;
  o += `<rect x="-1.3" y="-48" width="2.6" height="48" fill="${pole}"/>
    <path d="M0 -47 Q0 -52 6 -52 H8" stroke="${pole}" stroke-width="2" fill="none"/>
    <path d="M3 -53 H13 L15 -46 H1Z" fill="${pole}"/>
    <ellipse cx="8" cy="-45.6" rx="5.5" ry="1.5" fill="${P.lit ? '#fff3b0' : P.shade('#d8d4c8')}"/>`;
  if (s.snowCover) o += `<path d="M2.5 -53 Q8 -57 13.5 -53Z" fill="${P.snow}"/>`;
  if (P.lit) o += `<circle cx="8" cy="-44" r="16" fill="#ffe7a3" opacity=".16"/><circle cx="8" cy="-45" r="6" fill="#fff3b0" opacity=".35"/>`;
  return o + '</g>';
}

/** Dannebrog on a facade pole. It droops in calm air and flies (to the left, with the wind) when it blows. */
function flag(P: Palette, s: SceneState): string {
  const wa = s.windAmt;
  const droop = f((1 - Math.min(1, wa * 1.4)) * 62);
  const amp = f(3 + wa * 9);
  const dur = f(2.2 - wa * 1.4, 2);
  return `<path d="M279 188 L270 177" stroke="${P.shade('#e8e4da')}" stroke-width="1.6" stroke-linecap="round"/>
    <g transform="translate(270 177) rotate(-${droop})"><g class="city-flag" style="--amp:${amp}deg;animation-duration:${dur}s">
      <rect x="-19" y="0" width="19" height="12" fill="${P.shade('#c8102e')}"/>
      <rect x="-8" y="0" width="3" height="12" fill="${P.house}"/><rect x="-19" y="4.5" width="19" height="3" fill="${P.house}"/>
    </g></g>`;
}

type RiderKind = 'bike' | 'cargo' | 'umbrella';

/** Cyclist facing right with wheels on y=0 (flip for right-to-left). */
function cyclist(P: Palette, s: SceneState, coat: string, helm: string, kind: RiderKind): string {
  const ink = P.shade('#2b2f36');
  const skin = P.shade('#f0c7a0');
  const pants = P.shade('#33404f');
  const front = kind === 'cargo' ? 19 : 9;
  const wheel = (cx: number) => `<circle cx="${cx}" cy="-5" r="5" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
  const leg = (d: number) => `<g transform="translate(-4 -15)"><g class="city-pedal" style="animation-delay:-${d}s"><path d="M0 0 L5 5 L3 10" stroke="${pants}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
  let o = wheel(-9) + wheel(front) + leg(0);
  o += `<path d="M-9 -5 L-1 -5 L${kind === 'cargo' ? 8 : 5} -${kind === 'cargo' ? 5 : 14} M-1 -5 L-4 -15 M${front} -5 L4 -16 M2 -17 H6" stroke="${ink}" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  o += `<path d="M-4 -15 L0 -27" stroke="${coat}" stroke-width="5.5" stroke-linecap="round"/>`;
  o += kind === 'umbrella'
    ? `<path d="M0 -25 L4 -22" stroke="${coat}" stroke-width="2.4" stroke-linecap="round"/>`
    : `<path d="M0 -25 L5 -17" stroke="${coat}" stroke-width="2.4" stroke-linecap="round"/>`;
  o += leg(0.3);
  o += `<circle cx="1.5" cy="-31" r="3.6" fill="${skin}"/><path d="M-2.3 -31.5 A3.9 3.9 0 0 1 5.3 -31.5Z" fill="${helm}"/>`;
  if (kind === 'cargo') {
    // Christiania bike with a passenger in the box.
    o += `<circle cx="15" cy="-19" r="3" fill="${skin}"/><path d="M12 -19.5 A3 3 0 0 1 18 -19.5Z" fill="${P.shade('#e8505b')}"/>
      <rect x="8" y="-17" width="15" height="10" rx="1.5" fill="${P.shade('#b07f4f')}"/><rect x="8" y="-17" width="15" height="2" fill="${P.shade('#8a5f38')}"/>`;
  }
  if (kind === 'umbrella') {
    o += `<g transform="translate(4 -22) rotate(${f(s.windAmt * 24)})"><path d="M0 0 V-15" stroke="${ink}" stroke-width="1"/>
      <path d="M-12 -13 Q0 -28 12 -13 Q6 -15.5 0 -13 Q-6 -15.5 -12 -13Z" fill="${P.shade('#e04f7a')}"/></g>`;
  }
  if (P.lit) {
    const fx = kind === 'cargo' ? 23 : 6;
    o += `<path d="M${fx} -14 L${fx + 26} -18 L${fx + 26} -4Z" fill="#fff6cf" opacity=".14"/><circle cx="${fx}" cy="-14" r="1.4" fill="#fff6cf"/><circle cx="-11" cy="-11" r="1.3" fill="#ff4d4d"/>`;
  }
  return o;
}

/** Car facing right, wheels on y=0. */
function car(body: string, P: Palette, s: SceneState): string {
  const glass = P.lit ? P.shade('#8fa6bd') : P.shade('#bcd6ea');
  const wheel = (cx: number) => `<circle cx="${cx}" cy="-4.5" r="4.5" fill="#24272c"/><circle cx="${cx}" cy="-4.5" r="1.8" fill="${P.shade('#b9bec6')}"/>`;
  let o = P.lit ? '<path d="M23 -8 L74 -17 L74 2Z" fill="#fff3b0" opacity=".18"/><circle cx="-23" cy="-9" r="4" fill="#ff4d4d" opacity=".3"/>' : '';
  o += `<path d="M-24 -5 Q-24 -12 -18 -12.5 L-11 -13 L-5 -20 L8 -20 L14 -13 L20 -12.4 Q24 -11.5 24 -6 V-4 H-24Z" fill="${body}"/>
    <path d="M-8.5 -13 L-3.8 -18.4 H0.6 V-13Z M2.6 -13 V-18.4 H7.2 L11.8 -13Z" fill="${glass}"/>
    <rect x="-24" y="-7" width="48" height="2" fill="${mix(body, '#000000', 0.18)}"/>
    ${wheel(-13)}${wheel(13)}
    <rect x="21.6" y="-10" width="2.4" height="2.6" rx=".8" fill="${P.lit ? '#fff6cf' : P.shade('#f4f1e2')}"/>
    <rect x="-24" y="-10.5" width="2" height="3" fill="${P.lit ? '#ff4d4d' : P.shade('#b8322c')}"/>`;
  if (s.snowCover) o += `<path d="M-5.5 -19.6 Q1.3 -24 8.5 -19.6Z" fill="${P.snow}"/>`;
  return o;
}

/** Yellow city bus facing right, wheels on y=0. */
function bus(P: Palette, s: SceneState): string {
  const yel = P.shade('#f4c430');
  const dk = mix(yel, '#000000', 0.22);
  const glass = P.lit ? '#ffe9a6' : P.shade('#bcd6ea');
  const wheel = (cx: number) => `<circle cx="${cx}" cy="-5" r="5" fill="#24272c"/><circle cx="${cx}" cy="-5" r="2" fill="${P.shade('#b9bec6')}"/>`;
  let o = P.lit ? '<path d="M47 -9 L100 -18 L100 2Z" fill="#fff3b0" opacity=".18"/>' : '';
  o += `<rect x="-48" y="-31" width="96" height="27" rx="4" fill="${yel}"/><rect x="-48" y="-12" width="96" height="3" fill="${dk}"/>`;
  for (let i = 0; i < 5; i++) o += `<rect x="${-43 + i * 12}" y="-26" width="10" height="9" rx="1" fill="${glass}"/>`;
  o += `<rect x="20" y="-25" width="8" height="19" rx="1" fill="${glass}" opacity=".85"/>
    <path d="M32 -27 H44 Q48 -27 48 -22 V-15 H32Z" fill="${glass}"/>
    <rect x="32" y="-30" width="12" height="2.4" fill="${P.lit ? '#ffb347' : dk}"/>
    ${wheel(-30)}${wheel(30)}
    <rect x="45.5" y="-11" width="2.5" height="3" fill="${P.lit ? '#fff6cf' : P.shade('#f4f1e2')}"/>
    <rect x="-48" y="-12" width="2" height="4" fill="${P.lit ? '#ff4d4d' : P.shade('#b8322c')}"/>`;
  if (s.snowCover) o += '<rect x="-46" y="-34" width="92" height="4" rx="2" fill="' + P.snow + '"/>';
  return o;
}

export const city: FlatSceneDef = {
  walkY: 215,
  land(P: Palette, s: SceneState, R: Rand) {
    let o = `<style>
      .flat-scene .city-pedal { animation: city-pedal .6s ease-in-out infinite; }
      .flat-scene .city-flag  { animation: city-flag ease-in-out infinite; }
      @keyframes city-pedal { 0%, 100% { transform: rotate(-24deg); } 50% { transform: rotate(20deg); } }
      @keyframes city-flag  { 0%, 100% { transform: skewY(calc(var(--amp) * -1)); } 50% { transform: skewY(var(--amp)) scaleX(.9); } }
    </style>`;
    o += skyline(P, R);
    for (let i = 0; i < HOUSES.length; i++) o += house(i, P, s, R);
    o += street(P, s, R);
    o += flag(P, s);
    for (const x of LAMPS) o += lamp(x, P, s);
    for (const x of TREES) o += tree(x, 214, 1.25, P, s, R);

    // Bike lane runs right-to-left (far side of the street). Heavy weather leaves one brave soul with an umbrella.
    const riders: [string, string, RiderKind, number, number][] = HEAVY.includes(s.kind)
      ? [['#3c6e9e', '#2b2f36', 'umbrella', 22, 4]]
      : s.kind === 'rain'
        ? [['#3c6e9e', '#2b2f36', 'umbrella', 20, 3], ['#e0b44a', '#c94f4f', 'bike', 15, 11]]
        : [['#c94f4f', '#2b2f36', 'bike', 15, 2], ['#3c6e9e', '#e0b44a', 'cargo', 24, 9], ['#e0b44a', '#3c6e9e', 'bike', 19, 15]];
    for (const [coat, helm, kind, dur, del] of riders) {
      o += `<g transform="translate(0 228)"><g class="drive" style="--from:520px;--to:-60px;animation-duration:${dur}s;animation-delay:-${del}s"><g transform="scale(-1 1)">${cyclist(P, s, P.shade(coat), P.shade(helm), kind)}</g></g></g>`;
    }

    // Far lane, right-to-left: a blue car followed by a yellow bus. Near lane, left-to-right: three cars.
    o += `<g transform="translate(0 241)"><g class="drive" style="--from:520px;--to:-440px;animation-duration:24s;animation-delay:-6s">
      <g transform="scale(-1 1)">${car(P.shade('#3f7fc1'), P, s)}</g><g transform="translate(200 0) scale(-1 1)">${bus(P, s)}</g></g></g>`;
    o += `<g transform="translate(0 257)"><g class="drive" style="--from:-40px;--to:1080px;animation-duration:15s">
      ${car(P.shade('#d2453c'), P, s)}<g transform="translate(-230 0)">${car(P.shade('#eef0f2'), P, s)}</g><g transform="translate(-560 0)">${car(P.shade('#4f9d6a'), P, s)}</g></g></g>`;
    return o;
  },
};
