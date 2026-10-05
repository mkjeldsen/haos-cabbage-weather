/**
 * Scene lab: renders scenes in both art styles under any weather/time/season.
 * State is mirrored in the URL (?scene=city&kind=rain&time=night&season=winter&wind=0.8&snow=1)
 * so a specific combination can be linked or screenshotted.
 */
import { palette } from '../src/palette';
import { quantiseElevation, timeFromElevation } from '../src/data';
import { FLAT_SCENES, PIXEL_SCENES, SCENE_IDS } from '../src/scenes';
import { FLAT_CSS, renderFlatEgg, renderFlatScene, EGG_DURATION, type EggKind } from '../src/scenes/flat/engine';
import { PixelRenderer } from '../src/scenes/pixel/engine';
import type { Holiday } from '../src/holidays';
import type { SceneId, SceneState, Season, WeatherKind } from '../src/types';

const KINDS: WeatherKind[] = ['clear', 'partly', 'cloudy', 'fog', 'rain', 'pour', 'snow', 'sleet', 'hail', 'storm'];
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const CLOUD: Record<WeatherKind, number> = { clear: 0.1, partly: 0.4, cloudy: 0.85, fog: 0.7, rain: 0.85, pour: 1, snow: 0.8, sleet: 0.85, hail: 0.9, storm: 1 };
const PRECIP: Record<WeatherKind, number> = { clear: 0, partly: 0, cloudy: 0, fog: 0, rain: 0.6, pour: 1, snow: 0.6, sleet: 0.6, hail: 0.7, storm: 0.8 };

const q = new URLSearchParams(location.search);
const ui = {
  scene: (q.get('scene') ?? 'all') as SceneId | 'all',
  kind: (q.get('kind') ?? 'clear') as WeatherKind,
  elev: Number(q.get('elev') ?? 30),
  rising: q.get('rising') === '1',
  season: (q.get('season') ?? 'summer') as Season,
  wind: Number(q.get('wind') ?? 0.2),
  snow: q.get('snow') === '1',
  animate: q.get('animate') !== '0',
  guides: q.get('guides') === '1',
  holiday: q.get('holiday') ?? 'none',
};

const style = document.createElement('style');
style.textContent = FLAT_CSS;
document.head.append(style);

const renderers: PixelRenderer[] = [];

function state(): SceneState {
  return {
    kind: ui.kind,
    time: timeFromElevation(ui.elev, ui.rising),
    sunElev: quantiseElevation(ui.elev),
    rising: ui.rising,
    season: ui.season,
    windAmt: ui.wind,
    cloudCover: CLOUD[ui.kind],
    precip: PRECIP[ui.kind],
    lightning: ui.kind === 'storm',
    snowCover: ui.snow || ui.kind === 'snow',
    seed: 20261005,
    holiday: ui.holiday === 'none' ? null : (ui.holiday as Holiday),
  };
}

function select<T extends string>(label: string, key: keyof typeof ui, options: readonly T[]): string {
  const opts = options.map((o) => `<option ${ui[key] === o ? 'selected' : ''}>${o}</option>`).join('');
  return `<label>${label} <select data-key="${key}">${opts}</select></label>`;
}

function controls(): void {
  const el = document.getElementById('controls')!;
  el.innerHTML = [
    select('Scene', 'scene', ['all', ...SCENE_IDS]),
    select('Weather', 'kind', KINDS),
    `<label>Sun <input type="range" min="-20" max="30" step="1" value="${ui.elev}" data-key="elev"> <output id="elevOut">${ui.elev}°</output></label>`,
    `<label><input type="checkbox" data-key="rising" ${ui.rising ? 'checked' : ''}> Morning</label>`,
    select('Season', 'season', SEASONS),
    select('Holiday', 'holiday', ['none', 'halloween', 'christmas', 'nye', 'newyear', 'easter']),
    `<label>Wind <input type="range" min="0" max="1" step="0.05" value="${ui.wind}" data-key="wind"></label>`,
    `<label><input type="checkbox" data-key="snow" ${ui.snow ? 'checked' : ''}> Snow cover</label>`,
    `<label><input type="checkbox" data-key="animate" ${ui.animate ? 'checked' : ''}> Animate</label>`,
    `<label><input type="checkbox" data-key="guides" ${ui.guides ? 'checked' : ''}> Header guide</label>`,
    ...(['ufo', 'balloon', 'cat', 'witch', 'sleigh', 'bunny'] as EggKind[]).map((k) => `<button data-egg="${k}">${k}</button>`),
  ].join('');
  el.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const key = t.dataset.key as keyof typeof ui;
    if (!key) return;
    (ui as any)[key] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
    if (key === 'elev') document.getElementById('elevOut')!.textContent = `${ui.elev}°`;
    sync();
  });
  el.addEventListener('click', (e) => {
    const k = (e.target as HTMLElement).dataset.egg as EggKind | undefined;
    if (k) triggerEgg(k);
  });
}

function sync(): void {
  const p = new URLSearchParams();
  if (q.get('bundle')) p.set('bundle', q.get('bundle')!);
  p.set('scene', ui.scene); p.set('kind', ui.kind); p.set('elev', String(ui.elev)); if (ui.rising) p.set('rising', '1'); p.set('season', ui.season);
  p.set('wind', String(ui.wind)); if (ui.snow) p.set('snow', '1'); if (!ui.animate) p.set('animate', '0'); if (ui.guides) p.set('guides', '1'); if (ui.holiday !== 'none') p.set('holiday', ui.holiday);
  history.replaceState(null, '', `?${p}`);
  render();
}

function render(): void {
  document.body.classList.toggle('guides', ui.guides);
  renderers.splice(0).forEach((r) => r.destroy());
  const s = state();
  const P = palette(s);
  const ids = ui.scene === 'all' ? SCENE_IDS : [ui.scene];
  const grid = document.getElementById('grid')!;
  grid.innerHTML = ids
    .map((id) => `
      <div class="cell"><h3>${id} · flat</h3><div class="frame flat-scene ${ui.animate ? '' : 'paused'}" data-flat="${id}">${renderFlatScene(FLAT_SCENES[id], P, s)}<div class="guide"></div></div></div>
      <div class="cell"><h3>${id} · pixel</h3><div class="frame"><canvas data-pixel="${id}"></canvas><div class="guide"></div></div></div>`)
    .join('');
  grid.querySelectorAll<HTMLCanvasElement>('canvas[data-pixel]').forEach((cv) => {
    const r = new PixelRenderer(cv);
    r.set(PIXEL_SCENES[cv.dataset.pixel as SceneId], P, s);
    r.setAnimated(ui.animate);
    renderers.push(r);
  });
}

function triggerEgg(kind: EggKind): void {
  const P = palette(state());
  document.querySelectorAll<HTMLElement>('[data-flat]').forEach((frame) => {
    const egg = document.createElement('div');
    egg.className = 'egg';
    egg.innerHTML = renderFlatEgg(kind, FLAT_SCENES[frame.dataset.flat as SceneId], P);
    frame.append(egg);
    setTimeout(() => egg.remove(), EGG_DURATION[kind] * 1000);
  });
  renderers.forEach((r) => r.triggerEgg(kind));
}

controls();
render();
