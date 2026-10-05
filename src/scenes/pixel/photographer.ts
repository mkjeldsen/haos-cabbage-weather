import type { Palette } from '../../palette';
import { type Ctx, PH, px, PW, sprite } from './draw';

/** Blue-hour photographer in the bottom-right corner, facing into the scene behind a tripod. */
const STAND = [
  '........hh..',
  '.......hhhh.',
  '.......ffff.',
  '........ff..',
  '..ccc..jjjj.',
  'lccccjjjjjjj',
  '..cc...jjjj.',
  '...t...jjjj.',
  '..t.t..jjjj.',
  '..t.t..pppp.',
  '.t...t.p..p.',
  '.t...t.p..p.',
  't.....tp..p.',
  't.....tbb.bb',
];
// Leaning in to the viewfinder: head and shoulders one pixel forward.
const LEAN = [
  '.......hh...',
  '......hhhh..',
  '......ffff..',
  '.......ff...',
  '..ccc.jjjj..',
  'lccccjjjjjj.',
  '..cc...jjjj.',
  ...STAND.slice(7),
];

export function drawPhotographer(c: Ctx, P: Palette, t: number): void {
  const x = PW - 16, y = PH - STAND.length;
  const phase = t % 7;
  const leaning = phase > 2.8 && phase < 5.3;
  sprite(c, leaning ? LEAN : STAND, {
    h: P.shade('#e8c15a'), f: P.shade('#e8b796'), j: P.shade('#c94f3d'), p: P.shade('#2e3a52'),
    b: P.shade('#1d2230'), c: P.shade('#1d2230'), t: P.shade('#1d2230'), l: P.shade('#1d2230'),
  }, x, y);
  if (phase > 3.9 && phase < 4.05) px(c, x - 1, y + 5, '#eaf4ff');
  if (Math.floor(t * 1.6) % 2) px(c, x + 4, y + 4, '#ff4d4d');
}
