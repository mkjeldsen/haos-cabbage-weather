import type { Palette } from '../../palette';
import type { SceneState, Season } from '../../types';
import { f, mix, type Rand } from '../../util';
import { type FlatSceneDef, pine, tree } from './engine';

/**
 * Danish parcelhuskvarter: a yellow-brick bungalow behind a beech hedge, a carport, a white "vinkelhus",
 * a trampoline in the back garden, a robot lawnmower and Dannebrog on the garden flagpole.
 * Layout is in pixel-scene units ×3 (roughly), so both styles show the same street.
 */

const WET = ['rain', 'pour', 'storm', 'hail', 'sleet'];
/** Weather that keeps the kid off the trampoline and the mower in its dock. */
const INDOORS = ['rain', 'pour', 'storm', 'snow', 'sleet', 'hail'];
/** Beech hedge: keeps its brown leaves all winter. */
const BEECH: Record<Season, string> = { spring: '#6aa84a', summer: '#4f8c3e', autumn: '#b4793a', winter: '#9a6a3c' };
/** Rooftops of the next street over [x, width, roof]. */
const DISTANT: [number, number, string][] = [[196, 30, '#a24a3a'], [236, 34, '#4f4646'], [420, 30, '#a24a3a'], [455, 30, '#4f4646']];
const POLE_X = 280;
const FLAG_TOP = 149;
const MOW_X = 300, MOW_Y = 219, MOW_RUN = 92;

/** Window colour: at dusk/night a deterministic subset is lit. */
function win(P: Palette, R: Rand): string {
  return !P.lit ? P.window : R() < 0.55 ? P.window : P.shade('#41536a');
}

/** Wide Danish window with mullions and a sill. */
function pane(x: number, y: number, w: number, h: number, panes: number, frame: string, P: Palette, R: Rand): string {
  let o = `<rect x="${x - 1.5}" y="${y - 1.5}" width="${w + 3}" height="${h + 3}" fill="${frame}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${win(P, R)}"/>`;
  for (let k = 1; k < panes; k++) o += `<rect x="${f(x + (w * k) / panes - 0.7)}" y="${y}" width="1.4" height="${h}" fill="${frame}"/>`;
  return o + `<rect x="${x - 2.5}" y="${y + h + 1.5}" width="${w + 5}" height="1.6" fill="${mix(frame, '#000000', 0.2)}"/>`;
}

function backdrop(P: Palette, s: SceneState, R: Rand): string {
  let o = `<path d="M0 180 C 60 170, 130 174, 200 172 S 330 166, 400 172 S 460 176, 480 170 V264 H0Z" fill="${P.far}"/>`;
  for (const [x, w, roofDay] of DISTANT) {
    const roof = s.snowCover ? mix(P.snow, P.far, 0.3) : mix(P.shade(roofDay), P.far, 0.5);
    o += `<rect x="${x}" y="171" width="${w}" height="10" fill="${mix(P.shade('#efe6d4'), P.far, 0.5)}"/>
      <path d="M${x - 3} ${172} L${x + 5} 163 L${x + w - 5} 163 L${x + w + 3} 172Z" fill="${roof}"/>`;
    if (P.lit && R() < 0.7) o += `<rect x="${f(x + 4 + R() * (w - 10))}" y="174" width="3" height="3" fill="${mix(P.window, P.far, 0.3)}"/>`;
  }
  o += tree(98, 178, 1.4, P, s, R) + pine(304, 182, 1.25, P, s, R);
  o += `<path d="M0 194 C 120 188, 300 190, 480 192 V264 H0Z" fill="${P.mid}"/>`;
  // Back-garden plank fence.
  const wood = P.shade('#a07850');
  o += `<rect x="212" y="182" width="80" height="14" fill="${wood}"/>`;
  for (let x = 215; x < 292; x += 5) o += `<rect x="${x}" y="182" width="1" height="14" fill="${mix(wood, '#000000', 0.25)}" opacity=".6"/>`;
  if (s.snowCover) o += `<rect x="211" y="180.5" width="82" height="3" rx="1.4" fill="${P.snow}"/>`;
  return o;
}

/** Trampoline with safety net in the back garden; the kid bounces when the weather allows. */
function trampoline(P: Palette, s: SceneState, kid: boolean): string {
  const ink = P.shade('#2b2f36');
  const pad = P.shade('#3d7fc4');
  const mat = s.snowCover ? P.snow : P.shade('#23262c');
  const netTop = 'M-21 -26 Q-16 -22 -11 -24 Q0 -20 11 -24 Q16 -22 21 -26';
  let o = `<g transform="translate(240 190)">
    <path d="M-19 1 Q-17 7 -19 12 M19 1 Q17 7 19 12 M-6 3 Q-4 8 -6 12 M6 3 Q4 8 6 12" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M-21 0 V-26 M21 0 V-26" stroke="${ink}" stroke-width="1.3"/>
    <ellipse rx="22" ry="4" fill="${pad}"/><ellipse rx="19" ry="2.8" fill="${mat}"/>`;
  if (kid) {
    const shirt = P.shade('#e8505b');
    const skin = P.shade('#f0c7a0');
    o += `<g class="suburb-shadow"><ellipse rx="5" ry="1.2" fill="#000" opacity=".3"/></g>
      <g class="suburb-jump">
        <path d="M-2 0 L-1.5 -6 M2 0 L1.5 -6" stroke="${P.shade('#3c6e9e')}" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="-3.2" y="-12.5" width="6.4" height="7.5" rx="2" fill="${shirt}"/>
        <path d="M-3 -11 L-6.5 -16.5 M3 -11 L6.5 -16.5" stroke="${shirt}" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="-6.6" cy="-16.8" r="1" fill="${skin}"/><circle cx="6.6" cy="-16.8" r="1" fill="${skin}"/>
        <circle cy="-15.8" r="3.2" fill="${skin}"/>
        <path d="M-3.3 -16 A3.3 3.3 0 0 1 3.3 -16 Z M2.6 -17.5 q3 1 2.4 4" fill="${P.shade('#8a5a2b')}" stroke="${P.shade('#8a5a2b')}" stroke-width=".8"/>
      </g>`;
  }
  o += `<path d="${netTop} V0 Q0 6 -21 0Z" fill="${ink}" opacity=".12"/>
    <path d="${netTop}" stroke="${ink}" stroke-width="1" fill="none" opacity=".7"/>
    <path d="M-11 3 V-24 M11 3 V-24" stroke="${ink}" stroke-width="1.3"/>
    <path d="M-22 0 A22 4 0 0 0 22 0" stroke="${pad}" stroke-width="2" fill="none"/>`;
  return o + '</g>';
}

function chimneySmoke(x: number, y: number, s: SceneState): string {
  let o = '';
  for (let k = 0; k < 3; k++) {
    o += `<g transform="translate(${x} ${y})"><circle class="suburb-smoke" r="3.2" fill="#d3d8de" style="--dx:-${f(8 + s.windAmt * 34)}px;animation-delay:-${f(k * 0.9, 2)}s"/></g>`;
  }
  return o;
}

/** Yellow-brick bungalow with a red tiled hip roof. */
function houseA(P: Palette, s: SceneState, R: Rand): string {
  const brick = P.shade('#e0bb6c');
  const roof = s.snowCover ? P.roof : P.shade('#b5523b');
  const roofDk = P.shade('#8f3d2c');
  let o = `<rect x="108" y="150" width="9" height="20" fill="${P.shade('#9a4a36')}"/><rect x="106.5" y="148" width="12" height="3" fill="${P.shade('#6e3628')}"/>`;
  if (s.snowCover) o += `<rect x="106" y="145.6" width="13" height="3" rx="1.4" fill="${P.snow}"/>`;
  o += `<rect x="28" y="180" width="120" height="26" fill="${brick}"/>`;
  for (let y = 184; y < 203; y += 4) o += `<rect x="28" y="${y}" width="120" height=".7" fill="${mix(brick, '#ffffff', 0.35)}" opacity=".55"/>`;
  o += `<rect x="28" y="203" width="120" height="3" fill="${P.shade('#8a7f74')}"/>
    <path d="M20 181 L46 157 L130 157 L156 181Z" fill="${roof}"/>`;
  if (!s.snowCover) {
    for (const y of [163, 169, 175]) {
      const inset = ((181 - y) * 26) / 24;
      o += `<rect x="${f(20 + inset)}" y="${y}" width="${f(136 - 2 * inset)}" height=".9" fill="${roofDk}" opacity=".4"/>`;
    }
    o += `<rect x="45" y="156" width="86" height="2" fill="${roofDk}"/>`;
  }
  o += `<rect x="20" y="180" width="136" height="2.4" fill="${P.shade('#5a4a44')}"/>`;
  o += pane(36, 186, 26, 13, 3, P.house, P, R) + pane(96, 186, 22, 13, 2, P.house, P, R) + pane(125, 186, 17, 13, 2, P.house, P, R);
  // Front door, a strip of glass, and the lamp beside it.
  o += `<rect x="71" y="184" width="13" height="22" rx="1" fill="${P.shade('#3f5e4a')}"/>
    <rect x="73.5" y="187" width="3" height="15" fill="${P.lit ? P.window : P.shade('#9fb7cc')}" opacity=".9"/>
    <circle cx="81" cy="196" r=".9" fill="${P.shade('#e8c15a')}"/>`;
  if (P.lit) o += `<circle cx="89.5" cy="190" r="9" fill="#ffe7a3" opacity=".2"/>`;
  o += `<rect x="88" y="187" width="3" height="5" rx="1" fill="${P.lit ? '#fff3b0' : P.shade('#3a3f47')}"/>`;
  return o;
}

/** Car facing right, wheels on y=0. */
function car(body: string, P: Palette, s: SceneState): string {
  const glass = P.lit ? P.shade('#8fa6bd') : P.shade('#bcd6ea');
  const wheel = (cx: number) => `<circle cx="${cx}" cy="-4.5" r="4.5" fill="#24272c"/><circle cx="${cx}" cy="-4.5" r="1.8" fill="${P.shade('#b9bec6')}"/>`;
  let o = `<path d="M-24 -5 Q-24 -12 -18 -12.5 L-11 -13 L-5 -20 L8 -20 L14 -13 L20 -12.4 Q24 -11.5 24 -6 V-4 H-24Z" fill="${body}"/>
    <path d="M-8.5 -13 L-3.8 -18.4 H0.6 V-13Z M2.6 -13 V-18.4 H7.2 L11.8 -13Z" fill="${glass}"/>
    <rect x="-24" y="-7" width="48" height="2" fill="${mix(body, '#000000', 0.18)}"/>
    ${wheel(-13)}${wheel(13)}
    <rect x="21.6" y="-10" width="2.4" height="2.6" rx=".8" fill="${P.shade('#f4f1e2')}"/>
    <rect x="-24" y="-10.5" width="2" height="3" fill="${P.shade('#b8322c')}"/>`;
  if (s.snowCover) o += `<path d="M-5.5 -19.6 Q1.3 -24 8.5 -19.6Z" fill="${P.snow}"/>`;
  return o;
}

function carport(P: Palette, s: SceneState): string {
  const wood = P.shade('#6b5444');
  let o = `<rect x="150" y="182" width="64" height="30" fill="#000" opacity=".1"/>
    <rect x="154" y="182" width="3" height="30" fill="${wood}"/><rect x="207" y="182" width="3" height="30" fill="${wood}"/>
    <g transform="translate(182 212)">${car(P.shade('#d2453c'), P, s)}</g>
    <rect x="150" y="177" width="64" height="5" fill="${wood}"/><rect x="150" y="181" width="64" height="1.5" fill="${P.house}"/>`;
  if (s.snowCover) o += `<rect x="149" y="174.6" width="66" height="3.2" rx="1.5" fill="${P.snow}"/>`;
  return o;
}

/** White-rendered "vinkelhus": main block with a dark tiled roof and a gabled wing facing the street. */
function houseB(P: Palette, s: SceneState, R: Rand): string {
  const render = P.house;
  const roof = s.snowCover ? P.roof : P.shade('#4a4d55');
  const roofDk = P.shade('#363940');
  const frame = P.shade('#3c3f44');
  const plinth = P.shade('#8a8f96');
  let o = `<rect x="384" y="147" width="8" height="18" fill="${P.shade('#5d5f66')}"/><rect x="383" y="145.5" width="10" height="2.5" fill="${roofDk}"/>`;
  if (s.snowCover) o += `<rect x="382.5" y="143.2" width="11" height="3" rx="1.4" fill="${P.snow}"/>`;
  o += `<rect x="332" y="178" width="80" height="26" fill="${render}"/>
    <rect x="410" y="178" width="2" height="26" fill="${mix(render, '#000000', 0.1)}"/>
    <rect x="332" y="201" width="80" height="3" fill="${plinth}"/>
    <path d="M326 179 L346 156 L398 156 L418 179Z" fill="${roof}"/>`;
  if (!s.snowCover) for (const y of [162, 168, 174]) {
    const inset = ((179 - y) * 20) / 23;
    o += `<rect x="${f(326 + inset)}" y="${y}" width="${f(92 - 2 * inset)}" height=".9" fill="${roofDk}" opacity=".45"/>`;
  }
  o += `<rect x="324" y="178" width="96" height="2.2" fill="${roofDk}"/>`;
  o += pane(352, 185, 14, 12, 1, frame, P, R) + pane(391, 185, 15, 12, 2, frame, P, R);
  o += `<rect x="372" y="183" width="10" height="21" rx="1" fill="${P.shade('#2f4c6e')}"/>
    <rect x="374" y="186" width="6" height="5" fill="${P.lit ? P.window : P.shade('#9fb7cc')}" opacity=".9"/>`;
  // Wing with its gable to the street.
  o += `<path d="M290 208 V183 L313 163 L336 183 V208Z" fill="${render}"/>
    <rect x="290" y="205" width="46" height="3" fill="${plinth}"/>
    <path d="M285.5 186.5 L313 160 L340.5 186.5" fill="none" stroke="${roof}" stroke-width="${s.snowCover ? 5 : 4.2}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M309 177 h8 l-4 -5z" fill="${win(P, R)}" stroke="${frame}" stroke-width="1"/>`;
  o += pane(298, 188, 30, 13, 4, frame, P, R);
  if ((s.season === 'spring' || s.season === 'summer') && !s.snowCover) {
    const cols = ['#e8505b', '#ffd166', '#f6c4d8', '#b892ff'].map(P.shade);
    for (let x = 293; x < 408; x += 5) {
      if (x < 316 || (x > 366 && x < 386)) continue;
      o += `<circle cx="${x}" cy="${x < 336 ? 209 : 205.5}" r="1.7" fill="${cols[(x / 5) % 4 | 0]}"/>`;
    }
  }
  return o;
}

/** Dannebrog by day; the long "vimpel" pennant from sunset to sunrise. Built as a hinged chain so it ripples, blowing left. */
function flag(P: Palette, s: SceneState): string {
  const wa = s.windAmt;
  const up = s.sunElev >= 0;
  const red = P.shade('#c8102e');
  const white = P.house;
  const n = up ? 4 : 6;
  const L = up ? 22 : 46;
  const H = up ? 16 : 6;
  const w = L / n;
  // Total downward bend in calm air, spread over the hinges; the wind straightens it.
  const droop = (1 - Math.min(1, wa * (up ? 1.5 : 1.8))) * (up ? 70 : 85);
  const bend = droop / (n - 1);
  const amp = up ? 3 + wa * 6 : 4 + wa * 7;
  const dur = f(1.7 - wa * 1.1, 2);
  const seg = (i: number): string => {
    const xa = -i * w; // hoist side of this segment, in flag coordinates
    const xb = xa - w;
    const sx = (x: number) => f(x - xa, 2); // to segment-local x
    const over = i < n - 1 ? 0.5 : 0;
    if (up) {
      let o = `<rect x="${sx(xb - over)}" y="${-H / 2}" width="${f(w + over, 2)}" height="${H}" fill="${red}"/>
        <rect x="${sx(xb - over)}" y="-1.2" width="${f(w + over, 2)}" height="2.4" fill="${white}"/>`;
      const v0 = Math.max(xb, -9.6), v1 = Math.min(xa, -7.2);
      if (v1 > v0) o += `<rect x="${sx(v0)}" y="${-H / 2}" width="${f(v1 - v0, 2)}" height="${H}" fill="${white}"/>`;
      return o;
    }
    const hh = (x: number) => 3 * (1 - (0.72 * -x) / L);
    const ha = hh(xa), hb = hh(xb), xe = xb - over;
    const tip = i === n - 1 ? `L${sx(xb + 6)} 0 ` : '';
    let o = `<path d="M${sx(xa)} ${f(-ha, 2)} L${sx(xe)} ${f(-hb, 2)} ${tip}L${sx(xe)} ${f(hb, 2)} L${sx(xa)} ${f(ha, 2)}Z" fill="${red}"/>`;
    if (i < n - 1) o += `<path d="M${sx(xa)} ${f(-ha * 0.3, 2)} L${sx(xe)} ${f(-hb * 0.3, 2)} L${sx(xe)} ${f(hb * 0.3, 2)} L${sx(xa)} ${f(ha * 0.3, 2)}Z" fill="${white}"/>`;
    return o;
  };
  // Innermost (fly end) first; each segment hangs off the previous one's free edge.
  let chain = '';
  for (let i = n - 1; i >= 1; i--) {
    const a = f(amp * (0.6 + i / n), 2);
    chain = `<g class="suburb-flap" style="--b:${f(-bend, 2)}deg;--a:${a}deg;animation-duration:${dur}s;animation-delay:-${f(dur * (1 - i * 0.18), 2)}s">${seg(i)}${chain ? `<g transform="translate(${f(-w, 2)} 0)">${chain}</g>` : ''}</g>`;
  }
  const pole = P.shade('#f2f5f7');
  return `<rect x="${POLE_X - 1}" y="${FLAG_TOP - 3}" width="2.2" height="${214 - FLAG_TOP + 3}" fill="${pole}"/>
    <path d="M${POLE_X + 1.6} ${FLAG_TOP} V197" stroke="${P.shade('#9aa3ad')}" stroke-width=".5"/>
    <circle cx="${POLE_X + 0.1}" cy="${FLAG_TOP - 4}" r="2" fill="${P.shade('#e8c15a')}"/>
    <g transform="translate(${POLE_X - 1} ${FLAG_TOP + H / 2})">${seg(0)}<g transform="translate(${f(-w, 2)} 0)">${chain}</g></g>`;
}

/** Robot lawnmower facing right, wheels on y=0. */
function mower(P: Palette): string {
  const skirt = P.shade('#3a3d44');
  return `<circle cx="-5" cy="-2" r="2" fill="#24272c"/><circle cx="5" cy="-2" r="2" fill="#24272c"/>
    <path d="M-8 -2.5 Q-8 -7.5 -2 -8 L3 -8 Q8 -7.5 8.5 -3 L8.5 -2.5Z" fill="${P.shade('#e8702a')}"/>
    <rect x="-8" y="-3.4" width="16.5" height="1.8" rx=".8" fill="${skirt}"/>
    <rect x="-2" y="-9.2" width="4" height="1.4" rx=".6" fill="${skirt}"/>
    <circle cx="6" cy="-5" r=".8" fill="${P.shade('#7cfc9a')}"/>`;
}

function dock(P: Palette, s: SceneState): string {
  const grey = P.shade('#5d6168');
  let o = `<rect x="-12" y="-1.5" width="24" height="2.5" rx="1" fill="${grey}"/>
    <rect x="-11" y="-11" width="2" height="10" fill="${grey}"/><rect x="9" y="-11" width="2" height="10" fill="${grey}"/>
    <path d="M-13 -10 Q0 -16 13 -10 L12 -8.6 Q0 -13.4 -12 -8.6Z" fill="${grey}"/>`;
  if (s.snowCover) o += `<path d="M-13 -10.5 Q0 -17.5 13 -10.5 Q0 -14.5 -13 -10.5Z" fill="${P.snow}"/>`;
  return o;
}

function snowman(P: Palette): string {
  const shadow = mix(P.snow, '#7f93b0', 0.3);
  const ink = P.shade('#2b2f36');
  return `<path d="M-6 -16 L-14 -21 M6 -16 L13 -22" stroke="${P.trunk}" stroke-width="1.2" stroke-linecap="round"/>
    <ellipse cy="-6" rx="8" ry="6.5" fill="${P.snow}"/><ellipse cx="3" cy="-4.5" rx="5" ry="4" fill="${shadow}" opacity=".45"/>
    <circle cy="-16" r="5.5" fill="${P.snow}"/><circle cy="-24.5" r="4" fill="${P.snow}"/>
    <rect x="-4.6" y="-21" width="9.2" height="2.2" rx="1" fill="${P.shade('#d64545')}"/>
    <circle cx="-1.5" cy="-25.5" r=".7" fill="${ink}"/><circle cx="1.5" cy="-25.5" r=".7" fill="${ink}"/>
    <path d="M0 -24 L5.5 -23.2 L0 -22.6Z" fill="${P.shade('#f28c28')}"/>
    <circle cy="-15" r=".8" fill="${ink}"/><circle cy="-12" r=".8" fill="${ink}"/>
    <rect x="-4.6" y="-29.4" width="9.2" height="1.4" fill="${ink}"/><rect x="-3" y="-34" width="6" height="5" fill="${ink}"/>`;
}

function bollard(x: number, y: number, P: Palette, s: SceneState): string {
  const pole = P.shade('#3a3f47');
  let o = `<g transform="translate(${x} ${y})">`;
  if (P.lit) o += `<ellipse rx="13" ry="3" fill="#ffe7a3" opacity=".18"/><circle cy="-12" r="8" fill="#ffe7a3" opacity=".22"/>`;
  o += `<rect x="-1.6" y="-10" width="3.2" height="10" fill="${pole}"/>
    <rect x="-2.6" y="-14" width="5.2" height="4" rx="1" fill="${P.lit ? '#fff3b0' : P.shade('#d8d4c8')}"/>
    <rect x="-3.2" y="-15.4" width="6.4" height="1.8" rx=".6" fill="${pole}"/>`;
  if (s.snowCover) o += `<rect x="-3.4" y="-17.2" width="6.8" height="2.2" rx="1" fill="${P.snow}"/>`;
  return o + '</g>';
}

function hedge(x0: number, x1: number, top: number, bottom: number, col: string, P: Palette, s: SceneState, R: Rand): string {
  const w = x1 - x0;
  let o = `<rect x="${x0}" y="${top + 3}" width="${w}" height="${bottom - top - 3}" fill="${col}"/>`;
  for (let x = x0 + 3; x < x1 - 1; x += 6) o += `<circle cx="${x}" cy="${top + 4}" r="4" fill="${col}"/>`;
  o += `<rect x="${x0}" y="${bottom - 4}" width="${w}" height="4" fill="${mix(col, '#000000', 0.25)}" opacity=".7"/>`;
  const hi = mix(col, '#ffffff', 0.18);
  for (let i = 0; i < w / 7; i++) o += `<circle cx="${f(x0 + 2 + R() * (w - 4))}" cy="${f(top + 3 + R() * (bottom - top - 8))}" r="1.4" fill="${hi}" opacity=".8"/>`;
  if (s.snowCover) o += `<rect x="${x0 - 1}" y="${top - 0.5}" width="${w + 2}" height="4" rx="2" fill="${P.snow}"/>`;
  return o;
}

function mailbox(P: Palette, s: SceneState): string {
  const red = P.shade('#c8102e');
  let o = `<g transform="translate(64 232)"><rect x="-1.2" y="-12" width="2.4" height="12" fill="${P.shade('#3a3f47')}"/>
    <path d="M-6.5 -12 V-18.5 Q-6.5 -22.5 0 -22.5 Q6.5 -22.5 6.5 -18.5 V-12Z" fill="${red}"/>
    <rect x="-4" y="-18" width="8" height="1.4" rx=".6" fill="${mix(red, '#000000', 0.5)}"/>
    <path d="M-3 -15 h6" stroke="${P.shade('#ffd166')}" stroke-width="1"/>`;
  if (s.snowCover) o += `<path d="M-7 -19 Q0 -26 7 -19 Q0 -21.5 -7 -19Z" fill="${P.snow}"/>`;
  return o + '</g>';
}

function street(P: Palette, s: SceneState, R: Rand): string {
  let asph = P.shade('#5a5f69');
  if (s.snowCover) asph = mix(asph, P.snow, 0.4);
  const pave = s.snowCover ? P.snow : P.shade('#cdc6b8');
  const joint = mix(pave, '#000000', 0.12);
  const curb = P.shade('#a29c90');
  let o = `<rect y="228" width="480" height="6" fill="${pave}"/>`;
  if (!s.snowCover) for (let x = 6; x < 480; x += 14) o += `<rect x="${x}" y="228" width=".8" height="6" fill="${joint}"/>`;
  o += `<rect y="234" width="480" height="2" fill="${curb}"/>
    <rect y="236" width="480" height="22" fill="${asph}"/>
    <ellipse cx="318" cy="247" rx="7" ry="2" fill="${mix(asph, '#000000', 0.2)}"/>
    <rect y="258" width="480" height="2" fill="${curb}"/>
    <rect y="260" width="480" height="4" fill="${P.front}"/>`;
  if (s.snowCover) {
    const track = P.shade('#5a5f69');
    o += `<rect y="241" width="480" height="3" fill="${track}" opacity=".4"/><rect y="252" width="480" height="3" fill="${track}" opacity=".4"/>`;
  }
  if (WET.includes(s.kind)) {
    for (let i = 0; i < 10; i++) o += `<rect x="${f(R() * 460)}" y="${f(238 + R() * 18)}" width="${f(14 + R() * 26)}" height="1.3" rx=".6" fill="#ffffff" opacity=".13"/>`;
  }
  if (s.season === 'autumn' && !s.snowCover) {
    const cols = ['#e8a33d', '#d9662f', '#c9483d'].map(P.shade);
    for (let i = 0; i < 22; i++) {
      const y = i < 12 ? 229 + R() * 5 : 208 + R() * 18;
      o += `<ellipse cx="${f(R() * 480)}" cy="${f(y)}" rx="2" ry="1" fill="${cols[i % 3]}"/>`;
    }
  }
  return o;
}

export const suburb: FlatSceneDef = {
  walkY: 233,
  spots: [[404, 226], [78, 231], [230, 232], [262, 222]],
  land(P: Palette, s: SceneState, R: Rand) {
    const kid = s.time !== 'night' && !INDOORS.includes(s.kind) && s.windAmt <= 0.6;
    const mowing = !P.lit && s.season !== 'winter' && !s.snowCover && !INDOORS.includes(s.kind);
    let o = `<style>
      .flat-scene .suburb-jump   { animation: suburb-jump .9s infinite; }
      .flat-scene .suburb-shadow { animation: suburb-shadow .9s infinite; }
      .flat-scene .suburb-flap   { animation: suburb-flap ease-in-out infinite; }
      .flat-scene .suburb-mow    { animation: suburb-mow 30s linear infinite; }
      .flat-scene .suburb-smoke  { animation: suburb-smoke 2.7s ease-out infinite; }
      @keyframes suburb-jump {
        0%, 100% { transform: translateY(1px); animation-timing-function: cubic-bezier(.2,.6,.5,1); }
        50% { transform: translateY(-13px); animation-timing-function: cubic-bezier(.5,0,.8,.4); }
      }
      @keyframes suburb-shadow {
        0%, 100% { transform: scale(1); animation-timing-function: cubic-bezier(.2,.6,.5,1); }
        50% { transform: scale(.45); animation-timing-function: cubic-bezier(.5,0,.8,.4); }
      }
      @keyframes suburb-flap { 0%, 100% { transform: rotate(calc(var(--b) - var(--a))); } 50% { transform: rotate(calc(var(--b) + var(--a))); } }
      @keyframes suburb-mow {
        0% { transform: translateX(0) scaleX(1); }
        45% { transform: translateX(${MOW_RUN}px) scaleX(1); }
        50% { transform: translateX(${MOW_RUN}px) scaleX(-1); }
        95% { transform: translateX(0) scaleX(-1); }
        100% { transform: translateX(0) scaleX(1); }
      }
      @keyframes suburb-smoke { from { transform: translate(0, 0) scale(.4); opacity: .7; } to { transform: translate(var(--dx), -18px) scale(1.6); opacity: 0; } }
    </style>`;
    o += backdrop(P, s, R);
    o += trampoline(P, s, kid);
    o += `<rect y="204" width="480" height="24" fill="${P.front}"/><rect y="204" width="480" height="1.4" fill="${mix(P.front, '#ffffff', 0.12)}"/>`;
    o += tree(452, 210, 1.5, P, s, R);
    if (s.season === 'winter') o += chimneySmoke(112.5, 146, s) + chimneySmoke(388, 144, s);
    o += houseA(P, s, R) + carport(P, s) + houseB(P, s, R);
    o += flag(P, s);

    // Driveway, garden path and stepping stones.
    const pave = s.snowCover ? mix(P.snow, '#7f93b0', 0.12) : P.shade('#bdb6a8');
    o += `<rect x="150" y="212" width="64" height="16" fill="${pave}"/><rect x="71" y="206" width="14" height="22" fill="${pave}"/>`;
    if (!s.snowCover) {
      for (let y = 216; y < 228; y += 5) o += `<rect x="150" y="${y}" width="64" height=".8" fill="${mix(pave, '#000000', 0.12)}"/>`;
      for (const [x, y] of [[377, 209], [375, 215], [378, 221]]) o += `<ellipse cx="${x}" cy="${y}" rx="4" ry="1.6" fill="${pave}"/>`;
    }

    // Robot mower: out on the lawn by day, in its dock otherwise.
    o += `<g transform="translate(${MOW_X} ${MOW_Y})">${dock(P, s)}</g>`;
    if (mowing) {
      o += `<g transform="translate(${MOW_X} ${MOW_Y})"><g class="suburb-mow" style="animation-delay:-${f(R() * 30, 1)}s"><g class="bounce" style="animation-duration:.6s">${mower(P)}</g></g></g>`;
    } else {
      o += `<g transform="translate(${MOW_X} ${MOW_Y})">${mower(P)}</g>`;
    }
    o += bollard(212, 226, P, s);
    if (s.snowCover) o += `<g transform="translate(350 224)">${snowman(P)}</g>`;

    o += tree(12, 214, 1.5, P, s, R);
    const beech = P.shade(BEECH[s.season]);
    o += hedge(-2, 70, 212, 229, beech, P, s, R) + hedge(86, 150, 212, 229, beech, P, s, R);
    o += mailbox(P, s);
    o += street(P, s, R);
    return o;
  },
};
