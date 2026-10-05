import type { SceneState, Season, WeatherKind } from './types';
import { clamp, darken, mix } from './util';

/**
 * One palette shared by every scene and both art styles. Scenes may derive extra
 * colours from these (e.g. `mix(P.house, '#000', .1)`), but should not hardcode
 * time-of-day colours themselves — that is what `P.nightK` and `shade()` are for.
 */
export interface Palette {
  skyTop: string;
  /** Middle of the sky gradient (carries the pink band at sunrise/sunset). */
  skyMid: string;
  skyBot: string;
  /** Ground layers, back to front. */
  far: string;
  mid: string;
  front: string;
  /** Field rows / lawn stripes. */
  stripe: string;
  road: string;
  tree: string;
  treeHi: string;
  treeShade: string;
  trunk: string;
  /** Spring blossom accent, or null outside spring. */
  blossom: string | null;
  /** Deciduous trees are bare in winter (scenes add snow on branches when snowCover). Evergreens keep `tree`. */
  bare: boolean;
  evergreen: string;
  house: string;
  roof: string;
  barn: string;
  window: string;
  /** Windows/lamps are lit (dawn, dusk, night). */
  lit: boolean;
  /** Light structures: wind turbines, lighthouse, poles. */
  tower: string;
  water: string;
  waterHi: string;
  sand: string;
  stone: string;
  snow: string;
  cloud: string;
  cloudShade: string;
  fog: string;
  /** 0 = full daylight, ~0.4 at sunset, 1 = night. Continuous with the sun's elevation. */
  nightK: number;
  /** 0..1, how much golden-hour light there is (peaks with the sun just above the horizon). */
  warmK: number;
  /** Apply the current time-of-day lighting to any daylight colour. */
  shade: (dayColor: string) => string;
}

/**
 * Clear-sky colours by sun elevation in degrees: [elevation, top, middle, horizon].
 * Night → nautical twilight → blue hour (−6° to −4°) → afterglow → golden hour → day.
 * These are evening colours; mornings get a cooler, pinker horizon (see skyAt).
 */
const SKY_KEYS: [number, string, string, string][] = [
  [-18, '#070d24', '#0d1838', '#1a2a50'],
  [-12, '#0b1638', '#14254f', '#24386a'],
  [-8, '#10224f', '#1a3570', '#2d5394'],
  [-6, '#15307e', '#2552aa', '#4a80d2'],
  [-4, '#1d3f90', '#3a64b5', '#8a90c8'],
  [-1, '#2f4a8c', '#8a7aa8', '#f2a07a'],
  [2, '#3e63a8', '#c99aa0', '#ffb27a'],
  [6, '#3f86d0', '#8fbbe0', '#ffd6a0'],
  [12, '#3d9be9', '#7cc1f2', '#a8dbff'],
];

function skyAt(elev: number, rising: boolean): [string, string, string] {
  const k = SKY_KEYS;
  let out: [string, string, string];
  if (elev <= k[0][0]) out = [k[0][1], k[0][2], k[0][3]];
  else if (elev >= k[k.length - 1][0]) out = [k[k.length - 1][1], k[k.length - 1][2], k[k.length - 1][3]];
  else {
    const i = k.findIndex((row) => row[0] > elev);
    const a = k[i - 1], b = k[i], t = (elev - a[0]) / (b[0] - a[0]);
    out = [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)];
  }
  if (rising) {
    // Dawn light is cooler and pinker than the orange of an evening.
    const dawnK = clamp(1 - Math.abs(elev - 0.5) / 7) * 0.4;
    out = [out[0], mix(out[1], '#d8a6c8', dawnK), mix(out[2], '#ffc3cf', dawnK)];
  }
  return out;
}

const SEASON_DAY: Record<Season, { far: string; mid: string; front: string; stripe: string; tree: string; treeHi: string }> = {
  spring: { far: '#93cc80', mid: '#6cb85c', front: '#58a94f', stripe: '#a5cf6a', tree: '#4a9a48', treeHi: '#8fd17a' },
  summer: { far: '#86c07a', mid: '#5fa955', front: '#4c9a48', stripe: '#86b94e', tree: '#3e8a43', treeHi: '#6dbb5f' },
  autumn: { far: '#a4b878', mid: '#8aa456', front: '#7a9646', stripe: '#c9a95a', tree: '#c7772e', treeHi: '#e6a845' },
  winter: { far: '#9aab92', mid: '#7f9479', front: '#6f866b', stripe: '#a59f86', tree: '#6b5a4a', treeHi: '#8a7866' },
};

const SNOW_DAY = { far: '#e3ecf4', mid: '#d9e5ef', front: '#edf3f8', stripe: '#cbd8e4', road: '#c4d0dc' };

const CLOUD: Record<WeatherKind, string> = {
  clear: '#ffffff', partly: '#ffffff', cloudy: '#e4e9ef', fog: '#dfe3e8', rain: '#8b96a4', pour: '#6f7a88',
  storm: '#58616f', snow: '#e6ebf0', sleet: '#c9d0d8', hail: '#9aa4b1',
};

/** How strongly the sky is pulled towards grey, and which grey. */
const OVERCAST: Partial<Record<WeatherKind, [string, number]>> = {
  partly: ['#b5c4d2', 0.12],
  cloudy: ['#9ba6b2', 0.6],
  fog: ['#c3cad1', 0.78],
  rain: ['#76818f', 0.75],
  pour: ['#5f6a78', 0.85],
  storm: ['#3d4554', 0.85],
  hail: ['#76818f', 0.75],
  snow: ['#c5ced8', 0.6],
  sleet: ['#a9b3be', 0.65],
};

const NIGHT_TINT = '#0e1d2e';
const DUSK_TINT = '#5a3b52';

/**
 * Blue hour worth photographing: sun 4–6° below the horizon (quantised, so roughly −7° to −3°)
 * under a clear-ish, dry sky.
 */
export function isBlueHour(s: SceneState): boolean {
  return s.sunElev >= -6 && s.sunElev <= -4 && s.cloudCover <= 0.5 && s.precip === 0 && s.kind !== 'fog';
}

/** Darkness of the landscape: 0 with the sun 8° up, 1 once it is 10° below the horizon (smoothstep). */
export function nightFactor(elev: number): number {
  const t = clamp((8 - elev) / 18);
  return t * t * (3 - 2 * t);
}

export function palette(s: SceneState): Palette {
  const nightK = nightFactor(s.sunElev);
  const warmK = clamp(1 - Math.abs(s.sunElev - 1.5) / 7.5);
  const shade = (c: string) => mix(mix(c, DUSK_TINT, warmK * 0.22), NIGHT_TINT, nightK * 0.72);

  const wet = s.kind === 'rain' || s.kind === 'pour' || s.kind === 'storm' || s.kind === 'hail';
  const ground = { ...SEASON_DAY[s.season], road: '#d8b77a' };
  if (s.snowCover) Object.assign(ground, SNOW_DAY);
  if (wet) for (const k of Object.keys(ground) as (keyof typeof ground)[]) ground[k] = mix(ground[k], '#1d2733', 0.15);
  if (s.kind === 'fog') for (const k of Object.keys(ground) as (keyof typeof ground)[]) ground[k] = mix(ground[k], '#c3cad1', 0.3);

  // Snow is lit by the moon: keep it brighter than other ground at night.
  const g = (c: string) => (s.snowCover && c !== ground.tree && c !== ground.treeHi ? mix(c, '#3a4d6e', nightK * 0.5) : shade(c));

  // Blue hour and golden glow need a clear-ish sky: overcast pulls everything towards grey.
  let [skyTop, skyMid, skyBot] = skyAt(s.sunElev, s.rising);
  const oc = OVERCAST[s.kind];
  if (oc) {
    const grey = mix(oc[0], '#141a26', nightK * 0.85);
    skyTop = mix(skyTop, grey, oc[1]);
    skyMid = mix(skyMid, grey, oc[1] * 0.92);
    skyBot = mix(skyBot, grey, oc[1] * 0.85);
  }
  const glow = warmK * (1 - (oc ? oc[1] : 0));

  // Coast colours get the same wet/fog treatment as the ground.
  const tint = (c: string) => (wet ? mix(c, '#1d2733', 0.15) : s.kind === 'fog' ? mix(c, '#c3cad1', 0.3) : c);
  const tree = shade(ground.tree);
  // Clouds catch the sunset on their undersides.
  const cloud = mix(mix(CLOUD[s.kind], '#27314a', nightK * 0.65), skyBot, glow * 0.45);

  return {
    skyTop,
    skyMid,
    skyBot,
    far: g(ground.far),
    mid: g(ground.mid),
    front: g(ground.front),
    stripe: g(ground.stripe),
    road: g(ground.road),
    tree,
    treeHi: s.snowCover ? mix('#eef4f9', '#3a4d6e', nightK * 0.5) : shade(ground.treeHi),
    treeShade: darken(tree, 0.2),
    trunk: shade('#6b4a33'),
    blossom: s.season === 'spring' ? shade('#f6c4d8') : null,
    bare: s.season === 'winter',
    evergreen: shade('#2f6b45'),
    house: shade('#f6f1e7'),
    roof: s.snowCover ? mix('#eef3f7', '#3a4d6e', nightK * 0.5) : shade('#8b6a4a'),
    barn: shade('#c9483d'),
    window: s.sunElev < 3 ? '#ffd36b' : '#56708c',
    lit: s.sunElev < 3,
    tower: shade('#f2f5f7'),
    water: shade(tint(mix('#3f9fd8', skyBot, 0.25))),
    waterHi: shade('#a6def7'),
    sand: shade(s.snowCover ? '#e8eef4' : tint('#ecd59a')),
    stone: shade(tint('#9aa3ad')),
    snow: mix('#f4f8fb', '#3a4d6e', nightK * 0.5),
    cloud,
    cloudShade: mix(cloud, '#3a4658', 0.22),
    fog: mix('#dfe4ea', '#2a3446', nightK * 0.7),
    nightK,
    warmK: glow,
    shade,
  };
}
