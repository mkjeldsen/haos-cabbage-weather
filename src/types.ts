import type { Holiday } from './holidays';

export type SceneId = 'forest' | 'rural' | 'city' | 'seaside';
export type ArtStyle = 'pixel' | 'flat';
export type TimeOfDay = 'day' | 'dawn' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Weather as the scene understands it, derived from the HA condition. */
export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'pour' | 'snow' | 'sleet' | 'hail' | 'storm';

export type MetricId =
  | 'temperature'
  | 'feels_like'
  | 'precipitation_probability'
  | 'precipitation'
  | 'wind'
  | 'humidity'
  | 'cloud_coverage'
  | 'uv_index';

/** Everything a scene renderer needs. Kept small and serialisable so it can be diffed cheaply. */
export interface SceneState {
  kind: WeatherKind;
  /** Coarse time of day, for props (owl at night, lamps…). Derived from sunElev. */
  time: TimeOfDay;
  /** Sun elevation in degrees, quantised to 2° and clamped to ±14 so day and night never re-render. Drives the sky. */
  sunElev: number;
  /** Morning (sun rising) vs evening. */
  rising: boolean;
  season: Season;
  /** 0 = calm, 1 = gale (≈14 m/s and up). Drives sway, turbine speed, cloud speed, slanted rain. */
  windAmt: number;
  /** 0..1 cloud density. */
  cloudCover: number;
  /** 0..1 precipitation intensity (0 when nothing falls). */
  precip: number;
  lightning: boolean;
  /** Ground is white: snowing now, or a winter day at or below freezing. */
  snowCover: boolean;
  /** Daily seed so random placement is stable across re-renders. */
  seed: number;
  /** Hidden holiday surprises (only when easter eggs are enabled). */
  holiday: Holiday | null;
}

export interface CabbageWeatherConfig {
  type: string;
  entity: string;
  name?: string;
  scene?: SceneId;
  style?: ArtStyle;
  show_hourly?: boolean;
  show_daily?: boolean;
  hours?: number;
  days?: number;
  metrics?: MetricId[];
  animations?: boolean;
  easter_eggs?: boolean;
  show_snark?: boolean;
  sun_entity?: string;
  /** Hidden (YAML only): pretend it is this moment, e.g. "2026-12-31T23:58" or "2026-10-31". */
  debug_date?: string;
}

/** Normalised forecast point (units as reported by the entity). */
export interface ForecastPoint {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  apparent_temperature?: number;
  precipitation?: number;
  precipitation_probability?: number;
  wind_speed?: number;
  wind_gust_speed?: number;
  wind_bearing?: number | string;
  humidity?: number;
  cloud_coverage?: number;
  uv_index?: number;
  is_daytime?: boolean;
}

/* Minimal slices of the HA frontend types we use. */
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  config: { latitude: number; longitude: number; time_zone?: string; unit_system?: Record<string, string> };
  locale?: { language: string };
  language?: string;
  themes?: { darkMode?: boolean };
  connection: {
    subscribeMessage<T>(callback: (msg: T) => void, msg: Record<string, unknown>): Promise<() => Promise<void> | void>;
  };
}
