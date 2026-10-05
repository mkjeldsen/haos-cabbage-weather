/**
 * Dev harness: renders the real card against a fake Home Assistant (weather entity, sun.sun and
 * a forecast subscription). Controls are mirrored in the URL so a state can be linked.
 */
import '../src/cabbage-weather-card';
import type { ForecastPoint, HomeAssistant } from '../src/types';

if (!customElements.get('ha-card')) {
  customElements.define('ha-card', class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{display:block;background:var(--card-background-color);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.12);color:var(--primary-text-color)}</style><slot></slot>`;
    }
  });
}

const CONDITIONS = ['sunny', 'clear-night', 'partlycloudy', 'cloudy', 'fog', 'rainy', 'pouring', 'snowy', 'snowy-rainy', 'hail', 'lightning', 'lightning-rainy', 'windy', 'windy-variant', 'exceptional'];
const q = new URLSearchParams(location.search);
const ui = {
  condition: q.get('condition') ?? 'partlycloudy',
  temp: Number(q.get('temp') ?? 14),
  wind: Number(q.get('wind') ?? 18),
  elevation: Number(q.get('elev') ?? 30),
  scene: q.get('scene') ?? 'rural',
  layout: q.get('layout') ?? 'both',
  daily: q.get('daily') !== '0',
  dark: q.get('dark') === '1',
  month: Number(q.get('month') ?? new Date().getMonth()),
};

const listeners = new Map<string, (msg: { forecast: ForecastPoint[] }) => void>();

function forecast(type: string): ForecastPoint[] {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const wet = /rain|pour|snow|hail|lightning/.test(ui.condition);
  if (type === 'hourly') {
    return Array.from({ length: 48 }, (_, i) => {
      const t = new Date(now.getTime() + i * 3600000);
      const h = t.getHours();
      const temp = ui.temp + 4 * Math.sin(((h - 9) / 24) * Math.PI * 2) - 4 * Math.sin(((now.getHours() - 9) / 24) * Math.PI * 2);
      const night = h < 7 || h >= 19;
      const cycle = ['sunny', 'partlycloudy', 'cloudy', 'rainy'];
      const condition = i < 6 ? ui.condition : night && i % 5 ? 'clear-night' : cycle[Math.floor(i / 6) % 4];
      return {
        datetime: t.toISOString(),
        condition: condition === 'sunny' && night ? 'clear-night' : condition,
        temperature: Math.round(temp * 10) / 10,
        precipitation: wet && i < 6 ? 1.2 + (i % 3) * 0.8 : condition === 'rainy' ? 0.6 : 0,
        precipitation_probability: wet && i < 6 ? 80 : condition === 'rainy' ? 60 : 10,
        wind_speed: ui.wind + 3 * Math.sin(i / 4),
        wind_gust_speed: ui.wind * 1.6 + 2,
        wind_bearing: (220 + i * 7) % 360,
        humidity: 70 + 15 * Math.sin(i / 6),
        cloud_coverage: condition === 'sunny' || condition === 'clear-night' ? 5 : condition === 'partlycloudy' ? 45 : 90,
        uv_index: night ? 0 : Math.max(0, 4 * Math.sin(((h - 6) / 14) * Math.PI)),
      };
    });
  }
  return Array.from({ length: 10 }, (_, i) => {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    return {
      datetime: t.toISOString(),
      condition: i === 0 ? ui.condition : ['sunny', 'partlycloudy', 'rainy', 'cloudy', 'snowy-rainy'][i % 5],
      temperature: Math.round(ui.temp + 3 + 3 * Math.sin(i)),
      templow: Math.round(ui.temp - 4 + 2 * Math.cos(i)),
      precipitation: i % 5 === 2 ? 4.3 : i % 5 === 4 ? 1.1 : 0,
    };
  });
}

function hass(): HomeAssistant {
  const now = Date.now();
  const rising = new Date(now + 3600000 * ((ui.elevation < 0 ? 6 : 20))).toISOString();
  const setting = new Date(now + 3600000 * ((ui.elevation < 0 ? 18 : 5))).toISOString();
  return {
    states: {
      'weather.forecast_home': {
        entity_id: 'weather.forecast_home',
        state: ui.condition,
        attributes: {
          friendly_name: 'Hjem',
          temperature: ui.temp,
          humidity: 72,
          wind_speed: ui.wind,
          wind_bearing: 225,
          wind_gust_speed: ui.wind * 1.6,
          cloud_coverage: 60,
          temperature_unit: '°C',
          wind_speed_unit: 'km/h',
          precipitation_unit: 'mm',
          supported_features: 3,
        },
      },
      'sun.sun': {
        entity_id: 'sun.sun',
        state: ui.elevation > 0 ? 'above_horizon' : 'below_horizon',
        attributes: { elevation: ui.elevation, rising: q.get('rising') === '1', next_rising: rising, next_setting: setting },
      },
    },
    config: { latitude: 55.7, longitude: 12.5 },
    themes: { darkMode: ui.dark },
    connection: {
      subscribeMessage: async (cb: any, msg: any) => {
        const key = `${msg.forecast_type}:${Math.random()}`;
        listeners.set(key, () => cb({ forecast: forecast(msg.forecast_type) }));
        setTimeout(() => cb({ forecast: forecast(msg.forecast_type) }), 150);
        return () => { listeners.delete(key); };
      },
    },
  };
}

// Pretend it's another month (?month=0–11) or an exact moment (?date=2026-12-31T23:59), for seasons and holidays.
const RealDate = Date;
if (q.has('month') || q.has('date')) {
  const target = q.has('date') ? new RealDate(q.get('date')!).getTime() : new RealDate(new RealDate().getFullYear(), ui.month, 15).getTime();
  const offset = target - RealDate.now();
  (globalThis as any).Date = class extends RealDate {
    constructor(...args: any[]) { super(...((args.length ? args : [RealDate.now() + offset]) as [])); }
    static now() { return RealDate.now() + offset; }
  };
}

function controls(): void {
  const el = document.getElementById('controls');
  if (!el) return;
  const opt = (k: string, list: string[]) => `<label>${k} <select data-k="${k}">${list.map((o) => `<option ${String((ui as any)[k]) === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  const num = (k: string, min: number, max: number) => `<label>${k} <input type="number" data-k="${k}" min="${min}" max="${max}" value="${(ui as any)[k]}" style="width:4.5em"></label>`;
  el.innerHTML = [
    opt('condition', CONDITIONS),
    opt('scene', ['forest', 'rural', 'suburb', 'city', 'seaside']),
    opt('layout', ['both', 'pixel', 'flat']),
    num('temp', -20, 40), num('wind', 0, 90), num('elevation', -30, 60), num('month', 0, 11),
    `<label><input type="checkbox" data-k="daily" ${ui.daily ? 'checked' : ''}> daily</label>`,
    `<label><input type="checkbox" data-k="dark" ${ui.dark ? 'checked' : ''}> dark</label>`,
    ...['ufo', 'balloon', 'cat'].map((k) => `<button data-egg="${k}">${k}</button>`),
  ].join(' ');
  el.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const k = t.dataset.k!;
    (ui as any)[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
    const p = new URLSearchParams();
    p.set('condition', ui.condition); p.set('scene', ui.scene); p.set('layout', ui.layout); p.set('temp', String(ui.temp));
    p.set('wind', String(ui.wind)); p.set('elev', String(ui.elevation)); p.set('month', String(ui.month));
    if (!ui.daily) p.set('daily', '0'); if (ui.dark) p.set('dark', '1');
    location.search = p.toString();
  });
  el.addEventListener('click', (e) => {
    const k = (e.target as HTMLElement).dataset.egg;
    if (k) document.querySelectorAll('cabbage-weather-card').forEach((c) => c.triggerEgg(k as any));
  });
}

function mount(): void {
  document.body.classList.toggle('dark', ui.dark);
  const grid = document.getElementById('cards')!;
  const styles = ui.layout === 'both' ? ['pixel', 'flat'] : [ui.layout];
  const h = hass();
  for (const style of styles) {
    const card = document.createElement('cabbage-weather-card');
    card.setConfig({ type: 'custom:cabbage-weather-card', entity: 'weather.forecast_home', scene: ui.scene as any, style: style as any, show_daily: ui.daily, debug_date: q.get('debug') ?? undefined });
    card.hass = h;
    const wrap = document.createElement('div');
    if (q.get('shot') !== '1') wrap.innerHTML = `<h3>${style}</h3>`;
    wrap.append(card);
    grid.append(wrap);
  }
}

// ?editor=1[&lang=da]: render the card editor with simple stand-ins for HA's ha-form / ha-alert.
if (q.get('editor') === '1') {
  if (!customElements.get('ha-form')) {
    customElements.define('ha-form', class extends HTMLElement {
      schema: any[] = []; data: any = {}; computeLabel: any; computeHelper: any;
      connectedCallback() { requestAnimationFrame(() => this.draw()); }
      draw() {
        const flat = (list: any[]): any[] => list.flatMap((f) => (f.schema ? flat(f.schema) : [f]));
        this.innerHTML = flat(this.schema).map((f) => {
          const opts = f.selector?.select?.options?.map((o: any) => o.label).join(' · ');
          const help = this.computeHelper?.(f);
          return `<div style="padding:6px 0;border-bottom:1px solid var(--divider-color)"><b>${this.computeLabel?.(f)}</b>
            <code style="color:var(--secondary-text-color)">${JSON.stringify(this.data[f.name] ?? '')}</code>
            ${opts ? `<div style="font-size:12px">${opts}</div>` : ''}${help ? `<div style="font-size:12px;color:var(--secondary-text-color)">${help}</div>` : ''}</div>`;
        }).join('');
      }
    });
    customElements.define('ha-alert', class extends HTMLElement {
      connectedCallback() { this.style.cssText = 'display:block;margin-top:12px;padding:10px 12px;border-radius:8px;background:rgba(3,169,244,.12)'; this.insertAdjacentHTML('afterbegin', `<b>${(this as any).title || ''}</b>`); }
    });
  }
  const ed = document.createElement('cabbage-weather-card-editor') as any;
  const h = { ...hass(), locale: { language: q.get('lang') ?? 'en' } };
  ed.hass = h;
  ed.setConfig({ type: 'custom:cabbage-weather-card', entity: 'weather.forecast_home', style: q.get('style') ?? undefined });
  document.getElementById('cards')!.append(ed);
} else {
// ?shot=1: only the card, at a fixed width, for README screenshots.
if (q.get('shot') === '1') {
  document.body.classList.add('shot');
  document.querySelector('h1')?.remove();
  document.getElementById('controls')?.remove();
}
controls();
mount();
}
