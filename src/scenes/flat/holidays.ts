import type { Palette } from '../../palette';
import type { SceneState } from '../../types';
import { f, type Rand } from '../../util';

/** Hidden holiday layers for flat scenes: sky (behind the land) and ground decorations (in front). */

const FW_COLORS = ['#ff5d73', '#ffd166', '#7bdff2', '#b892ff', '#8ef29a', '#ffffff'];
const EGG_COLORS = ['#ff9ec7', '#8fd3ff', '#ffe066', '#b5e48c', '#c3a6ff'];

function bats(R: Rand): string {
  let o = '';
  for (let i = 0; i < 4; i++) {
    const y = 96 + R() * 46, dur = 8 + R() * 6, sc = 0.7 + R() * 0.5;
    o += `<g transform="translate(0 ${f(y)})"><g class="drive" style="--from:520px;--to:-40px;animation-duration:${f(dur)}s;animation-delay:-${f(R() * dur)}s"><g class="bob" style="animation-duration:${f(0.9 + R() * 0.6, 2)}s"><g transform="scale(${f(sc, 2)})">
      <g class="hw-flap" style="animation-delay:-${f(R() * 0.3, 2)}s"><path d="M0 0 C-3 -4 -7 -5 -11 -2 C-8 -2 -7 0 -7 2 C-5 0 -3 0 0 2 C3 0 5 0 7 2 C7 0 8 -2 11 -2 C7 -5 3 -4 0 0Z" fill="#1b1b24"/></g>
      <ellipse rx="1.8" ry="2.6" fill="#1b1b24"/><path d="M-1.6 -2 l.4 -2 l.8 1.2 M1.6 -2 l-.4 -2 l-.8 1.2" stroke="#1b1b24" stroke-width=".9"/>
    </g></g></g></g>`;
  }
  return o;
}

function fireworks(s: SceneState, R: Rand): string {
  const show = s.holiday === 'newyear';
  const n = show ? 11 : 3;
  let o = '';
  for (let i = 0; i < n; i++) {
    const x = 30 + R() * 420, y = 60 + R() * 76;
    const dur = show ? 2.8 + R() * 1.4 : 6 + R() * 4;
    const delay = f(R() * dur, 2);
    const col = FW_COLORS[Math.floor(R() * FW_COLORS.length)];
    const radius = 14 + R() * 14;
    let rays = '';
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      rays += `<line x1="${f(c * 3)}" y1="${f(sn * 3)}" x2="${f(c * radius)}" y2="${f(sn * radius)}"/><circle cx="${f(c * radius)}" cy="${f(sn * radius)}" r="1.5"/>`;
    }
    o += `<g transform="translate(${f(x)} ${f(y)})">
      <circle class="fw-rocket" r="1.4" fill="#fff6d0" style="--h:${f(230 - y)}px;animation-duration:${f(dur, 2)}s;animation-delay:-${delay}s"/>
      <g class="fw-burst" style="animation-duration:${f(dur, 2)}s;animation-delay:-${delay}s" stroke="${col}" fill="${col}" stroke-width="1.6" stroke-linecap="round">${rays}</g>
    </g>`;
  }
  return o;
}

export function flatHolidaySky(P: Palette, s: SceneState, R: Rand): string {
  if (s.holiday === 'halloween' && P.nightK > 0) return bats(R);
  if (s.holiday === 'newyear' || (s.holiday === 'nye' && P.nightK > 0)) return fireworks(s, R);
  return '';
}

function pumpkin(P: Palette, R: Rand): string {
  const orange = P.shade('#f28c28');
  const face = P.lit ? '#ffd36b' : P.shade('#5a2a0a');
  const flick = P.lit ? ` class="hw-flicker" style="animation-delay:-${f(R() * 2, 2)}s"` : '';
  // The flicker animates opacity, so the glow's own transparency lives on a wrapper.
  return `${P.lit ? `<g opacity=".22"><circle cy="-6" r="12" fill="#ffb347"${flick}/></g>` : ''}
    <ellipse cy="-6" rx="8" ry="6.2" fill="${orange}"/>
    <ellipse cx="-3.6" cy="-6" rx="3.2" ry="5.8" fill="#000" opacity=".12"/><ellipse cx="3.6" cy="-6" rx="3.2" ry="5.8" fill="#000" opacity=".12"/>
    <rect x="-1" y="-14.5" width="2" height="3.6" rx=".6" fill="${P.shade('#4f7a2a')}"/>
    <g fill="${face}"${flick}><path d="M-5 -8.5 L-2.4 -8.5 L-3.7 -10.8Z M2.4 -8.5 L5 -8.5 L3.7 -10.8Z M-5 -4.5 L-3 -3 L-1.5 -4.5 L0 -3 L1.5 -4.5 L3 -3 L5 -4.5 L4 -2.2 L-4 -2.2Z"/></g>`;
}

function christmasTree(P: Palette, R: Rand): string {
  const lights = [[-3, -27], [3, -23], [-5, -19], [5, -15], [-1, -13], [-7, -9], [2, -8], [7, -7]];
  const bulbs = lights.map(([x, y], i) => `<circle class="twinkle" cx="${x}" cy="${y}" r="1.4" fill="${FW_COLORS[i % 5]}" style="animation-duration:${f(1.2 + R() * 1.2, 2)}s;animation-delay:-${f(R() * 2, 2)}s"/>`).join('');
  const box = (x: number, w: number, h: number, c: string, rib: string) =>
    `<rect x="${x}" y="${-h}" width="${w}" height="${h}" rx=".8" fill="${P.shade(c)}"/><rect x="${x + w / 2 - 0.8}" y="${-h}" width="1.6" height="${h}" fill="${P.shade(rib)}"/>`;
  return `<rect x="-1.6" y="-6" width="3.2" height="6" fill="${P.trunk}"/>
    <path d="M0 -34 L-9 -20 L-5 -20 L-12 -5 L12 -5 L5 -20 L9 -20Z" fill="${P.evergreen}"/>
    <path d="M-7 -22 Q0 -17 7 -21 M-10 -9 Q0 -4 10 -9" stroke="#e8c15a" stroke-width=".8" fill="none" opacity=".8"/>
    ${bulbs}
    <path class="twinkle" style="animation-duration:2.4s" d="M0 -39.5 L1.4 -36 L5 -36 L2 -33.8 L3.2 -30.4 L0 -32.4 L-3.2 -30.4 L-2 -33.8 L-5 -36 L-1.4 -36Z" fill="#ffd166"/>
    ${box(-15, 7, 5, '#d64545', '#ffd166')}${box(9, 6, 4, '#3d8bfd', '#ffffff')}`;
}

function easterNest(P: Palette, R: Rand, i: number): string {
  const egg = (x: number, c: string, tilt: number) =>
    `<g transform="translate(${x} -4) rotate(${tilt})"><ellipse rx="3" ry="4" fill="${P.shade(c)}"/><path d="M-3 -.5 Q0 1 3 -.5" stroke="${P.shade('#ffffff')}" stroke-width="1" fill="none"/></g>`;
  const daffodil = (x: number, h: number) =>
    `<path d="M${x} 0 V${-h}" stroke="${P.shade('#4f8a3a')}" stroke-width="1.2"/><path d="M${x} ${-h + 2} q-3 -1 -4 -4" stroke="${P.shade('#4f8a3a')}" stroke-width="1" fill="none"/>
     <g transform="translate(${x} ${-h})"><circle r="3.4" fill="${P.shade('#ffe066')}"/><circle r="1.6" fill="${P.shade('#ff9f1c')}"/></g>`;
  return `${daffodil(-6, 11 + R() * 3)}${daffodil(6, 9 + R() * 3)}${egg(-1, EGG_COLORS[i % 5], -12 + R() * 24)}${i % 2 ? egg(4, EGG_COLORS[(i + 2) % 5], 10) : ''}`;
}

export function flatHolidayGround(spots: [number, number][], P: Palette, s: SceneState, R: Rand): string {
  const at = (x: number, y: number, body: string, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})">${body}</g>`;
  switch (s.holiday) {
    case 'halloween': return spots.slice(0, 3).map(([x, y], i) => at(x, y, pumpkin(P, R), i === 1 ? 0.8 : 1)).join('');
    case 'christmas': return spots.length ? at(spots[0][0], spots[0][1], christmasTree(P, R)) : '';
    case 'easter': return spots.map(([x, y], i) => at(x, y, easterNest(P, R, i), 0.9)).join('');
  }
  return '';
}

/* ---------- one-shot holiday visitors ---------- */

export function witchSvg(): string {
  return `<g transform="translate(0 116)"><g class="egg-witch"><g class="bob" style="animation-duration:1.6s">
    <path d="M-16 4 L18 1" stroke="#5b3a22" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M18 1 L27 -3 L28 2 L27 7Z" fill="#8a6a3a"/>
    <path d="M-2 3 L6 -10 L10 2Z" fill="#1b1b24"/>
    <path d="M6 -10 L14 -4 L9 0Z" fill="#1b1b24" opacity=".85"/>
    <circle cx="3" cy="-12" r="3.2" fill="#9bd16a"/>
    <path d="M-3 -13 L9 -15 M2 -14.5 L4.5 -24 L6.5 -14.8" stroke="#1b1b24" stroke-width="1.6" fill="#1b1b24" stroke-linejoin="round"/>
    <path d="M7 1 L5 7 M3 1 L2 6" stroke="#1b1b24" stroke-width="1.2"/>
  </g></g></g>`;
}

export function sleighSvg(): string {
  const deer = (x: number, rudolph: boolean, delay: number) => `<g transform="translate(${x} 0)">
    <g class="sl-gallop" style="animation-delay:${delay}s"><path d="M-6 0 L-8 7 M-3 0 L-4 7 M4 0 L5 7 M7 0 L9 6" stroke="#7a4f2f" stroke-width="1.3" stroke-linecap="round"/></g>
    <ellipse cx="0" cy="-2" rx="9" ry="4" fill="#9a6a44"/>
    <path d="M7 -4 L11 -10 L13 -9 L10 -3Z" fill="#9a6a44"/><ellipse cx="13" cy="-10" rx="3.2" ry="2.2" fill="#9a6a44"/>
    <path d="M11 -12 L9 -17 M9 -15 L7 -16 M12.5 -12 L13 -17 M13 -15 L15 -16" stroke="#5b3a22" stroke-width="1" stroke-linecap="round"/>
    <circle cx="16" cy="-10" r="${rudolph ? 1.8 : 1}" fill="${rudolph ? '#ff3b3b' : '#3a2a20'}"/>
    ${rudolph ? '<circle cx="16" cy="-10" r="4.5" fill="#ff3b3b" opacity=".3" class="twinkle" style="animation-duration:1s"/>' : ''}
  </g>`;
  return `<g transform="translate(0 112)"><g class="egg-sleigh"><g class="bob" style="animation-duration:2.2s">
    <path d="M10 -6 L30 -6 M10 -6 L56 -8" stroke="#e8c15a" stroke-width=".8" fill="none"/>
    <path d="M-12 -2 L-14 -10 L-8 -10 L-6 -4 L10 -4 L12 -10 L14 -10 L12 2 L-10 2Z" fill="#d64545"/>
    <path d="M-16 5 L12 5 Q16 5 16 1" stroke="#e8c15a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="-9" cy="-11" rx="5" ry="4.5" fill="#8b5a3c"/>
    <rect x="-1" y="-15" width="9" height="11" rx="3" fill="#d64545"/>
    <circle cx="3.5" cy="-17.5" r="3.4" fill="#f2c7a5"/><path d="M0.5 -16.5 Q3.5 -10 6.5 -16.5Z" fill="#ffffff"/>
    <path d="M0 -19 L3.5 -26 L7.5 -19Z" fill="#d64545"/><circle cx="3.5" cy="-26" r="1.4" fill="#ffffff"/>
    ${deer(34, false, -0.15)}${deer(58, true, 0)}
  </g></g></g>`;
}

export function bunnySvg(walkY: number, P: Palette): string {
  const fur = P.shade('#cdb79e');
  return `<g transform="translate(0 ${walkY})"><g class="egg-bunny"><g class="bn-hop">
    <circle cx="-8" cy="-7" r="2.6" fill="${P.shade('#ffffff')}"/>
    <ellipse cx="0" cy="-6" rx="8" ry="5.5" fill="${fur}"/>
    <circle cx="7" cy="-11" r="4.2" fill="${fur}"/>
    <ellipse cx="5.5" cy="-19" rx="1.6" ry="5" fill="${fur}" transform="rotate(-12 5.5 -19)"/>
    <ellipse cx="8.5" cy="-19" rx="1.6" ry="5" fill="${fur}" transform="rotate(10 8.5 -19)"/>
    <ellipse cx="5.6" cy="-19" rx=".7" ry="3.4" fill="${P.shade('#f2a3b0')}" transform="rotate(-12 5.6 -19)"/>
    <circle cx="8.6" cy="-11.5" r=".9" fill="#222"/><circle cx="11" cy="-10" r=".8" fill="${P.shade('#f2a3b0')}"/>
    <ellipse cx="3" cy="-1" rx="3.5" ry="1.5" fill="${fur}"/>
  </g></g></g>`;
}

export const HOLIDAY_CSS = `
  .flat-scene .hw-flap  { animation: cw-flap .28s ease-in-out infinite; }
  .flat-scene .hw-flicker { animation: cw-flicker 1.8s steps(6) infinite; }
  .flat-scene .fw-rocket { opacity: 0; animation: cw-fw-rocket linear infinite; }
  .flat-scene .fw-burst  { opacity: 0; animation: cw-fw-burst ease-out infinite; }
  .flat-scene .egg-witch  { animation: cw-witch 14s linear 1 forwards; }
  .flat-scene .egg-sleigh { animation: cw-sleigh 16s linear 1 forwards; }
  .flat-scene .egg-bunny  { animation: cw-bunny 12s linear 1 forwards; }
  .flat-scene .bn-hop     { animation: cw-hop .55s ease-in-out infinite; }
  .flat-scene .sl-gallop  { animation: cw-gallop .3s ease-in-out infinite; }

  @keyframes cw-flap    { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(.25); } }
  @keyframes cw-flicker { 0%, 100% { opacity: 1; } 30% { opacity: .75; } 55% { opacity: .95; } 80% { opacity: .65; } }
  @keyframes cw-fw-rocket { 0% { transform: translateY(var(--h)); opacity: 0; } 3% { opacity: 1; } 24% { transform: translateY(0); opacity: 1; } 25%, 100% { transform: translateY(0); opacity: 0; } }
  @keyframes cw-fw-burst  { 0%, 24% { transform: scale(.1); opacity: 0; } 26% { opacity: 1; } 55% { transform: scale(1); opacity: .9; } 72%, 100% { transform: scale(1.1) translateY(5px); opacity: 0; } }
  @keyframes cw-witch   { from { transform: translateX(520px); } to { transform: translateX(-50px); } }
  @keyframes cw-sleigh  { from { transform: translate(-90px, 20px); } to { transform: translate(540px, -30px); } }
  @keyframes cw-bunny   { 0% { transform: translateX(-20px); } 45%, 55% { transform: translateX(230px); } 100% { transform: translateX(510px); } }
  @keyframes cw-hop     { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  @keyframes cw-gallop  { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(-18deg); } }
`;
