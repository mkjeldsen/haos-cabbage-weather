import type { SceneId } from '../types';
import type { FlatSceneDef } from './flat/engine';
import type { PixelSceneDef } from './pixel/engine';
import { forest as flatForest } from './flat/forest';
import { rural as flatRural } from './flat/rural';
import { city as flatCity } from './flat/city';
import { seaside as flatSeaside } from './flat/seaside';
import { forest as pixelForest } from './pixel/forest';
import { rural as pixelRural } from './pixel/rural';
import { city as pixelCity } from './pixel/city';
import { seaside as pixelSeaside } from './pixel/seaside';

export const SCENE_IDS: SceneId[] = ['forest', 'rural', 'city', 'seaside'];

export const FLAT_SCENES: Record<SceneId, FlatSceneDef> = {
  forest: flatForest,
  rural: flatRural,
  city: flatCity,
  seaside: flatSeaside,
};

export const PIXEL_SCENES: Record<SceneId, PixelSceneDef> = {
  forest: pixelForest,
  rural: pixelRural,
  city: pixelCity,
  seaside: pixelSeaside,
};
