import type { Palette } from '../../palette';

/**
 * Blue-hour photographer: stands in the bottom-right corner, nearest the viewer, behind a tripod
 * aimed into the scene. Leans in to the viewfinder every few seconds; the shutter blinks at the lens.
 */
export function photographerSvg(P: Palette, viewW: number, viewH: number): string {
  const ink = P.shade('#1d2230');
  const coat = P.shade('#c94f3d');
  const pants = P.shade('#2e3a52');
  const skin = P.shade('#e8b796');
  const hat = P.shade('#e8c15a');
  return `<g transform="translate(${viewW - 34} ${viewH})">
    <g stroke="${ink}" stroke-width="1.6" stroke-linecap="round">
      <path d="M-20 -27 L-29 0 M-20 -27 L-13 0 M-20 -27 L-20 -1"/>
    </g>
    <g transform="translate(-20 -30)">
      <rect x="-6" y="-4.5" width="11" height="7" rx="1.4" fill="${ink}"/>
      <rect x="-10" y="-3.5" width="4.5" height="5" rx="1" fill="${ink}"/>
      <rect x="-1.5" y="-6.5" width="4" height="2.4" rx=".6" fill="${ink}"/>
      <circle class="ph-led" cx="3.4" cy="-2.5" r=".8" fill="#ff4d4d"/>
      <g class="ph-shutter"><circle cx="-10.5" cy="-1" r="3" fill="#eaf4ff" opacity=".9"/></g>
    </g>
    <rect x="-3.6" y="-17" width="3.2" height="17" rx="1.2" fill="${pants}"/>
    <rect x="1" y="-17" width="3.2" height="17" rx="1.2" fill="${pants}"/>
    <rect x="-4.5" y="-1.6" width="5" height="2.4" rx="1" fill="${ink}"/><rect x=".4" y="-1.6" width="5" height="2.4" rx="1" fill="${ink}"/>
    <g transform="translate(0 -16)"><g class="ph-lean">
      <path d="M-6 0 L-5.5 -17 Q0 -21 5.5 -17 L6 0Z" fill="${coat}"/>
      <path d="M-5 -14 Q-12 -12 -15 -13" stroke="${coat}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <circle cx="-15.5" cy="-13" r="1.6" fill="${skin}"/>
      <rect x="-2" y="-21" width="4" height="3" fill="${skin}"/>
      <circle cx="-0.5" cy="-24.5" r="4.4" fill="${skin}"/>
      <path d="M-5 -25 Q-0.5 -32 4 -25Z" fill="${hat}"/><circle cx="-0.5" cy="-30.5" r="1.5" fill="${hat}"/>
      <path d="M-4.6 -20.5 Q0 -18 4.6 -20.5" stroke="${P.shade('#3d8bfd')}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    </g></g>
  </g>`;
}

export const PHOTOGRAPHER_CSS = `
  .flat-scene .ph-lean    { animation: cw-ph-lean 7s ease-in-out infinite; }
  .flat-scene .ph-shutter { opacity: 0; animation: cw-ph-shutter 7s linear infinite; }
  .flat-scene .ph-led     { animation: cw-twinkle 1.2s steps(2) infinite; }
  @keyframes cw-ph-lean    { 0%, 30%, 85%, 100% { transform: rotate(0deg); } 40%, 75% { transform: rotate(-11deg); } }
  @keyframes cw-ph-shutter { 0%, 55%, 57.5%, 100% { opacity: 0; } 56% { opacity: 1; } }
`;
