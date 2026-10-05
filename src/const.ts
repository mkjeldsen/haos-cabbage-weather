import type { CabbageWeatherConfig } from './types';

export const CARD_VERSION = '0.1.2';

/** Config merged over the defaults; undefined/null values don't erase a default. */
export function withDefaults<T extends object>(config: T): typeof DEFAULTS & T {
  const clean = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined && v !== null)) as T;
  return { ...DEFAULTS, ...clean };
}

export const DEFAULTS: Required<Omit<CabbageWeatherConfig, 'type' | 'entity' | 'name' | 'debug_date'>> = {
  scene: 'rural',
  style: 'pixel',
  show_hourly: true,
  show_daily: false,
  hours: 24,
  days: 7,
  metrics: ['temperature', 'feels_like', 'precipitation_probability', 'precipitation', 'wind', 'humidity', 'cloud_coverage', 'uv_index'],
  animations: true,
  easter_eggs: true,
  show_snark: true,
  sun_entity: 'sun.sun',
};
