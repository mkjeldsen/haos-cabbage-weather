import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { renderFlatChart } from './chart/flat';
import { availableMetrics, buildChart, type ChartModel, METRIC_LABELS } from './chart/model';
import { renderPixelChart } from './chart/pixel';
import { CARD_VERSION, DEFAULTS } from './const';
import {
  conditionIcon, debugOffset, feelsLike, solarPosition, type IconKind, isNightAt, rainSoon, sceneState, sunTimes, toCelsius, toMs, todayRange, unitsOf,
  type Units, windArrow,
} from './data';
import './editor';
import { flatIcon, pixelIconUrl } from './icons';
import { palette } from './palette';
import { FLAT_SCENES, PIXEL_SCENES } from './scenes';
import { EGG_DURATION, FLAT_CSS, renderFlatEgg, renderFlatScene, type EggKind } from './scenes/flat/engine';
import { PixelRenderer } from './scenes/pixel/engine';
import { snark } from './snark';
import type { CabbageWeatherConfig, ForecastPoint, HomeAssistant, MetricId, SceneState } from './types';

type Config = CabbageWeatherConfig & typeof DEFAULTS;

const PIXEL_FONT_ID = 'cabbage-weather-pixel-font';
const WEEKDAYS = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const nf1 = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1 });
const INSTANCES = new Set<CabbageWeatherCard>();

const PIN = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const CALENDAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

/** Temperature (°C) → colour for the daily range bars. */
function tempColor(c: number): string {
  const stops: [number, string][] = [[-10, '#7fb2ff'], [0, '#9ad0ff'], [8, '#8fd19e'], [15, '#ffd166'], [22, '#ff9f1c'], [30, '#ef5b5b']];
  if (c <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (c <= stops[i][0]) return stops[i][1];
  return stops[stops.length - 1][1];
}

@customElement('cabbage-weather-card')
export class CabbageWeatherCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: Config;
  @state() private hourly: ForecastPoint[] | null = null;
  @state() private daily: ForecastPoint[] | null = null;
  @state() private metric: MetricId = 'temperature';
  @state() private egg: EggKind | null = null;
  @state() private visible = true;
  @state() private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  @query('canvas.scene-canvas') private sceneCanvas?: HTMLCanvasElement;
  @query('canvas.chart-canvas') private chartCanvas?: HTMLCanvasElement;

  private subs: Promise<() => unknown>[] = [];
  private subscribedTo?: string;
  private pixel?: PixelRenderer;
  private pixelCanvas?: HTMLCanvasElement;
  private pixelKey = '';
  private chartKey = '';
  private flatCache = { key: '', svg: '' };
  private scene?: { s: SceneState; key: string };
  private chart?: ChartModel;
  private eggTimer?: number;
  private clock?: number;
  private io?: IntersectionObserver;
  private motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  /** ms added to the clock for the scene, holidays and comments when debug_date is set. */
  private debugShift: number | null = null;

  static getConfigElement(): HTMLElement {
    return document.createElement('cabbage-weather-card-editor');
  }

  static getStubConfig(hass: HomeAssistant): Partial<CabbageWeatherConfig> {
    const entity = Object.keys(hass.states).find((id) => id.startsWith('weather.'));
    return { entity: entity ?? 'weather.forecast_home' };
  }

  setConfig(config: CabbageWeatherConfig): void {
    if (!config?.entity || !config.entity.startsWith('weather.')) throw new Error('Choose a weather entity (weather.*).');
    this.config = { ...DEFAULTS, ...config } as Config;
    this.debugShift = debugOffset(config.debug_date, new Date());
    if (this.config.style === 'pixel') ensurePixelFont();
  }

  getCardSize(): number {
    const c = this.config;
    return 4 + (c?.show_hourly ? 3 : 0) + (c?.show_daily ? Math.ceil((c.days ?? 7) * 0.6) : 0);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  /** Show an easter egg now. From the browser console: cabbageWeather.egg('ufo'). */
  triggerEgg(kind?: EggKind): void {
    const s = this.scene?.s;
    if (!s || !this.config) return;
    if (!kind) {
      const rough = s.precip > 0 || s.windAmt > 0.6;
      const r = Math.random();
      if (s.holiday === 'halloween') kind = r < 0.6 ? 'witch' : 'cat';
      else if (s.holiday === 'christmas') kind = r < 0.7 ? 'sleigh' : 'cat';
      else if (s.holiday === 'easter') kind = r < 0.7 || rough ? 'bunny' : 'balloon';
      else kind = s.time === 'night' ? (r < 0.5 ? 'ufo' : 'cat') : rough ? (r < 0.6 ? 'cat' : 'ufo') : r < 0.45 ? 'balloon' : r < 0.8 ? 'cat' : 'ufo';
    }
    if (this.config.style === 'pixel') {
      this.pixel?.triggerEgg(kind);
    } else {
      this.egg = kind;
      window.setTimeout(() => { if (this.egg === kind) this.egg = null; }, EGG_DURATION[kind] * 1000);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    INSTANCES.add(this);
    this.motionQuery.addEventListener('change', this.onMotion);
    document.addEventListener('visibilitychange', this.onVisibility);
    // Time of day, snark and the "now" cut-off of the chart drift with the clock, not only with state changes.
    this.clock = window.setInterval(() => this.requestUpdate(), 60000);
    if (this.hass && this.config) this.subscribe();
    this.scheduleEgg();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    INSTANCES.delete(this);
    this.motionQuery.removeEventListener('change', this.onMotion);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.clearInterval(this.clock);
    window.clearTimeout(this.eggTimer);
    this.io?.disconnect();
    this.io = undefined;
    this.unsubscribe();
    this.pixel?.destroy();
    this.pixel = undefined;
    this.pixelKey = '';
    this.chartKey = '';
  }

  private onMotion = () => { this.reducedMotion = this.motionQuery.matches; };
  private onVisibility = () => this.requestUpdate();

  private get motionOn(): boolean {
    return !!this.config?.animations && !this.reducedMotion;
  }

  /* ---------- forecast subscription ---------- */

  private subscribe(): void {
    this.unsubscribe();
    const hass = this.hass!, entityId = this.config!.entity;
    const ent = hass.states[entityId];
    this.subscribedTo = entityId;
    if (!ent) return;
    const features = Number(ent.attributes.supported_features ?? 0);
    const types: ('hourly' | 'daily')[] = [];
    if (features & 2) types.push('hourly');
    if (features & 1) types.push('daily');
    for (const type of types) {
      this.subs.push(
        hass.connection.subscribeMessage<{ forecast: ForecastPoint[] | null }>(
          (ev) => { if (type === 'hourly') this.hourly = ev.forecast ?? []; else this.daily = ev.forecast ?? []; },
          { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: entityId },
        ),
      );
    }
    if (!(features & 2)) this.hourly = [];
    if (!(features & 1)) this.daily = [];
  }

  private unsubscribe(): void {
    for (const p of this.subs) p.then((u) => u()).catch(() => undefined);
    this.subs = [];
    this.subscribedTo = undefined;
    this.hourly = null;
    this.daily = null;
  }

  /* ---------- lifecycle ---------- */

  protected willUpdate(changed: PropertyValues): void {
    if ((changed.has('hass') || changed.has('config')) && this.hass && this.config && this.isConnected && this.subscribedTo !== this.config.entity) {
      this.subscribe();
    }
  }

  protected firstUpdated(): void {
    this.io = new IntersectionObserver((entries) => { this.visible = entries.some((e) => e.isIntersecting); });
    this.io.observe(this);
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('config') || changed.has('reducedMotion')) this.scheduleEgg();
    const cfg = this.config;
    if (!cfg || !this.scene) return;
    const running = this.visible && !document.hidden;

    if (cfg.style === 'pixel') {
      const cv = this.sceneCanvas;
      if (cv && cv !== this.pixelCanvas) {
        this.pixel?.destroy();
        this.pixel = new PixelRenderer(cv);
        this.pixelCanvas = cv;
        this.pixelKey = '';
      }
      if (this.pixel) {
        const key = `${cfg.scene}|${this.scene.key}`;
        if (key !== this.pixelKey) {
          this.pixel.set(PIXEL_SCENES[cfg.scene], palette(this.scene.s), this.scene.s);
          this.pixelKey = key;
        }
        this.pixel.setAnimated(this.motionOn);
        this.pixel.setVisible(running);
      }
      const chartCv = this.chartCanvas;
      if (chartCv && this.chart) {
        const key = JSON.stringify(this.chart) + (this.hass?.themes?.darkMode ? 'd' : 'l');
        if (key !== this.chartKey || chartCv.width === 300) {
          renderPixelChart(chartCv, this.chart, this);
          this.chartKey = key;
        }
      } else {
        this.chartKey = '';
      }
    } else if (this.pixel) {
      this.pixel.destroy();
      this.pixel = undefined;
      this.pixelCanvas = undefined;
      this.pixelKey = '';
    }
  }

  private scheduleEgg(): void {
    window.clearTimeout(this.eggTimer);
    if (!this.isConnected || !this.config?.easter_eggs || !this.motionOn) return;
    // Holidays are busier: a visitor every 1–3 minutes instead of every 3–8.
    const delay = (this.scene?.s.holiday ? 60 + Math.random() * 120 : 180 + Math.random() * 300) * 1000;
    this.eggTimer = window.setTimeout(() => {
      if (this.visible && !document.hidden) this.triggerEgg();
      this.scheduleEgg();
    }, delay);
  }

  private moreInfo(): void {
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this.config!.entity }, bubbles: true, composed: true }));
  }

  /* ---------- render ---------- */

  private icon(kind: IconKind, onSky: boolean, cls: string): TemplateResult {
    return this.config!.style === 'pixel'
      ? html`<img class="${cls} pix" src=${pixelIconUrl(kind)} alt="" />`
      : html`<svg class=${cls} viewBox="0 0 32 32" aria-hidden="true">${unsafeSVG(flatIcon(kind, onSky))}</svg>`;
  }

  protected render() {
    const cfg = this.config;
    if (!cfg || !this.hass) return nothing;
    const ent = this.hass.states[cfg.entity];
    if (!ent) {
      return html`<ha-card><div class="missing">Kan ikke finde ${cfg.entity}. Vælg en vejr-entitet i kortets indstillinger.</div></ha-card>`;
    }

    // Forecasts and the chart always use real time; debug_date only moves the scene, holidays and comments.
    const realNow = new Date();
    const debug = this.debugShift !== null;
    const now = debug ? new Date(realNow.getTime() + this.debugShift!) : realNow;
    const sunEnt = this.hass.states[cfg.sun_entity];
    const fakeSun = debug ? solarPosition(now, this.hass.config.latitude, this.hass.config.longitude) : undefined;
    const sun = sunTimes(sunEnt);
    const u = unitsOf(ent);
    const a = ent.attributes;

    const s = sceneState(ent, sunEnt, this.hass.config.latitude, now, cfg.easter_eggs, fakeSun);
    const key = JSON.stringify(s);
    if (this.scene?.key !== key) this.scene = { s, key };

    const night = fakeSun ? fakeSun.elev < 0 : sunEnt ? sunEnt.state === 'below_horizon' : isNightAt(now.getTime(), sun);
    const temp = typeof a.temperature === 'number' ? a.temperature : undefined;
    const feels = feelsLike({ datetime: '', temperature: temp, wind_speed: a.wind_speed, humidity: a.humidity, apparent_temperature: a.apparent_temperature }, u);
    const range = todayRange(temp, this.hourly, this.daily, realNow);
    const name = cfg.name || a.friendly_name || cfg.entity;
    const line = cfg.show_snark
      ? snark({
          kind: s.kind,
          tempC: temp !== undefined ? toCelsius(temp, u.temperature) : 10,
          windMs: typeof a.wind_speed === 'number' ? toMs(a.wind_speed, u.wind) : 0,
          time: s.time,
          rainSoon: rainSoon(s.kind, this.hourly),
          holiday: s.holiday,
          now,
        })
      : '';
    const running = this.motionOn && this.visible && !document.hidden;

    let sceneArt: TemplateResult;
    if (cfg.style === 'flat') {
      const flatKey = `${cfg.scene}|${key}`;
      if (this.flatCache.key !== flatKey) {
        this.flatCache = { key: flatKey, svg: renderFlatScene(FLAT_SCENES[cfg.scene], palette(s), s) };
      }
      sceneArt = html`<div class="art flat-scene ${running ? '' : 'paused'}">
        ${unsafeHTML(this.flatCache.svg)}
        ${this.egg ? html`<div class="egg">${unsafeHTML(renderFlatEgg(this.egg, FLAT_SCENES[cfg.scene], palette(s)))}</div>` : nothing}
      </div>`;
    } else {
      sceneArt = html`<canvas class="art scene-canvas" width="160" height="88"></canvas>`;
    }

    return html`
      <ha-card class=${cfg.style}>
        <div class="scene" @click=${this.moreInfo} role="button" tabindex="0" aria-label=${`${name}: ${a.temperature}°`}>
          ${sceneArt}
          <div class="hdr">
            <div class="hbar">
              <span class="loc">${unsafeHTML(PIN)} ${name}</span>
              <span class="chips">
                ${typeof a.wind_speed === 'number' ? html`<span class="chip">Vind ${Math.round(a.wind_speed)} ${u.wind} <span class="arr">${windArrow(a.wind_bearing)}</span></span>` : nothing}
                ${typeof a.humidity === 'number' ? html`<span class="chip">Fugt ${Math.round(a.humidity)}%</span>` : nothing}
              </span>
            </div>
            <div class="now">
              ${this.icon(conditionIcon(ent.state, night), true, 'hicon')}
              <span class="temp">${temp !== undefined ? Math.round(temp) : '–'}°</span>
              <span class="meta">
                ${feels !== undefined ? html`<span>Føles som ${Math.round(feels)}°</span>` : nothing}
                ${range.hi !== undefined ? html`<span><span class="arr">↑</span>${Math.round(range.hi)}° <span class="arr">↓</span>${Math.round(range.lo!)}°</span>` : nothing}
              </span>
            </div>
            ${line ? html`<p class="snark">${line}</p>` : nothing}
          </div>
          ${debug ? html`<span class="debug">DEBUG ${now.toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' })} · sol ${Math.round(fakeSun!.elev)}°</span>` : nothing}
        </div>
        ${cfg.show_hourly ? this.renderHourly(u, sun, realNow) : nothing}
        ${cfg.show_daily ? this.renderDaily(u, realNow) : nothing}
      </ha-card>
    `;
  }

  private renderHourly(u: Units, sun: ReturnType<typeof sunTimes>, now: Date) {
    const cfg = this.config!;
    if (this.hourly === null) return html`<div class="section"><div class="stitle">${unsafeHTML(CLOCK)} TIMEPROGNOSE</div><div class="loading">Henter prognose…</div></div>`;
    if (!this.hourly.length) { this.chart = undefined; return nothing; }

    const available = availableMetrics(this.hourly);
    const tabs = cfg.metrics.filter((m) => available.includes(m));
    if (!tabs.length) tabs.push('temperature');
    const metric = tabs.includes(this.metric) ? this.metric : tabs[0];
    this.chart = buildChart(metric, this.hourly, cfg.hours, u, sun, now.getTime());

    return html`
      <div class="section">
        <div class="stitle">${unsafeHTML(CLOCK)} TIMEPROGNOSE</div>
        <div class="scroll" @pointerdown=${dragScroll}>
          ${cfg.style === 'flat' ? unsafeHTML(renderFlatChart(this.chart)) : html`<canvas class="chart-canvas"></canvas>`}
        </div>
        ${tabs.length > 1
          ? html`<div class="tabs" role="tablist">
              ${tabs.map((m) => html`<button role="tab" aria-selected=${m === metric} aria-pressed=${m === metric} @click=${() => { this.metric = m; }}>${METRIC_LABELS[m]}</button>`)}
            </div>`
          : nothing}
      </div>
    `;
  }

  private renderDaily(u: Units, now: Date) {
    const cfg = this.config!;
    if (this.daily === null) return nothing;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = this.daily.filter((d) => Date.parse(d.datetime) >= today - 3600000).slice(0, cfg.days);
    if (!days.length) return nothing;
    const lows = days.map((d) => d.templow ?? d.temperature ?? 0);
    const highs = days.map((d) => d.temperature ?? 0);
    const gmin = Math.min(...lows), gmax = Math.max(...highs);
    const span = Math.max(1, gmax - gmin);
    const toC = (v: number) => toCelsius(v, u.temperature);

    return html`
      <div class="section daily">
        <div class="stitle">${unsafeHTML(CALENDAR)} DAGLIG PROGNOSE</div>
        ${days.map((d, i) => {
          const date = new Date(d.datetime);
          const lo = lows[i], hi = highs[i];
          const isToday = date.toDateString() === now.toDateString();
          const precip = d.precipitation ?? 0;
          return html`<div class="day">
            <span class="dname">${isToday ? 'I dag' : WEEKDAYS[date.getDay()]}</span>
            ${this.icon(conditionIcon(d.condition, false), false, 'dicon')}
            <span class="dprecip">${precip > 0 ? `${nf1.format(precip)} ${u.precipitation}` : d.precipitation_probability ? `${d.precipitation_probability}%` : ''}</span>
            <span class="lo">${Math.round(lo)}°</span>
            <span class="bar"><span class="fill" style="left:${((lo - gmin) / span) * 100}%;width:${Math.max(4, ((hi - lo) / span) * 100)}%;background:linear-gradient(90deg, ${tempColor(toC(lo))}, ${tempColor(toC(hi))})"></span></span>
            <span class="hi">${Math.round(hi)}°</span>
          </div>`;
        })}
      </div>
    `;
  }

  static styles = [
    unsafeCSS(FLAT_CSS),
    css`
      :host {
        --cw-accent: #ff9f1c;
        --cw-rain: #3d8bfd;
        --cw-wind: #4fa89c;
        --cw-humidity: #3fb0c9;
        --cw-cloud: #8a9bb0;
        --cw-uv: #a66cff;
        display: block;
      }
      ha-card { overflow: hidden; container-type: inline-size; height: 100%; }
      .missing, .loading { padding: 16px; color: var(--secondary-text-color); }
      .debug {
        position: absolute; left: 8px; bottom: 8px; padding: 2px 8px; border-radius: 6px; pointer-events: none;
        font: 600 11px/1.6 ui-monospace, monospace; color: #fff; background: rgba(214,69,69,.85);
      }

      /* ---------- header scene ---------- */
      .scene { position: relative; aspect-ratio: 480 / 264; overflow: hidden; cursor: pointer; outline: none; }
      .art, .art > svg, .egg, .egg > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      canvas.scene-canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
      .hdr {
        position: absolute; inset: 0; color: #fff; display: flex; flex-direction: column; align-items: center;
        padding: 3cqw 4cqw; pointer-events: none;
        background: linear-gradient(180deg, rgba(8,20,45,.22) 0%, rgba(8,20,45,.12) 45%, rgba(8,20,45,0) 62%);
        text-shadow: 0 1px 3px rgba(0,30,60,.45), 0 0 10px rgba(0,30,60,.2);
      }
      .hbar { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 2cqw; font-size: max(11px, 3cqw); font-weight: 700; }
      .loc { display: inline-flex; align-items: center; gap: .8cqw; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .loc svg { width: max(10px, 2.8cqw); height: max(10px, 2.8cqw); flex: none; }
      .chips { display: flex; gap: 1.4cqw; flex: none; }
      .chip { font-size: max(10px, 2.6cqw); padding: .5cqw 1.6cqw; background: rgba(255,255,255,.2); border-radius: 99px; white-space: nowrap; }
      .now { display: flex; align-items: center; gap: 2cqw; margin-top: 1cqw; }
      .hicon { width: 12cqw; height: 12cqw; }
      img.pix { image-rendering: pixelated; image-rendering: crisp-edges; }
      .temp { font-size: 13cqw; font-weight: 700; line-height: 1; letter-spacing: -.02em; }
      .meta { display: flex; flex-direction: column; font-size: max(10px, 2.9cqw); font-weight: 600; line-height: 1.35; }
      .snark { margin: 1.4cqw 0 0; max-width: 80%; text-align: center; font-size: max(11px, 3.3cqw); font-weight: 600; line-height: 1.3; }

      /* ---------- sections ---------- */
      .section { padding: 12px 16px 14px; }
      .section + .section { border-top: 1px solid var(--divider-color); }
      .stitle { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: .06em; color: var(--secondary-text-color); }
      .stitle svg { width: 14px; height: 14px; }
      .scroll { overflow-x: auto; margin: 4px -16px 0; padding: 0 16px; scrollbar-width: thin; cursor: grab; user-select: none; }
      .scroll > svg, .scroll > canvas { display: block; }
      .scroll > canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
      .scroll text.hr { fill: var(--secondary-text-color); font-size: 12.5px; font-weight: 600; }
      .scroll text.ev { fill: var(--cw-accent); font-size: 11.5px; font-weight: 700; }
      .scroll text.val { fill: var(--primary-text-color); font-size: 15px; font-weight: 700; }
      .scroll text.zero { fill: var(--secondary-text-color); font-weight: 500; opacity: .6; }
      .scroll .axis { stroke: var(--divider-color); }
      .tabs { display: flex; gap: 6px; overflow-x: auto; padding-top: 10px; scrollbar-width: none; }
      .tabs button {
        flex: none; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
        padding: 5px 12px; border-radius: 99px; background: transparent;
        border: 1.5px solid var(--primary-color); color: var(--primary-color);
      }
      .tabs button[aria-pressed='true'] { background: var(--primary-color); color: var(--text-primary-color, #fff); }

      .day { display: grid; grid-template-columns: 3.2em 28px 4.6em 2.6em 1fr 2.6em; align-items: center; gap: 8px; padding: 6px 0; }
      .day + .day { border-top: 1px solid var(--divider-color); }
      .dname { font-weight: 600; }
      .dicon { width: 28px; height: 28px; }
      .dprecip { font-size: 12px; color: var(--cw-rain); white-space: nowrap; }
      .lo { text-align: right; color: var(--secondary-text-color); }
      .hi { font-weight: 700; }
      .bar { position: relative; height: 6px; border-radius: 3px; background: var(--divider-color); }
      .fill { position: absolute; top: 0; bottom: 0; border-radius: 3px; }

      /* ---------- pixel style ---------- */
      /* Tiny5 has one weight; synthetic bold smears the pixels. */
      .pixel .hdr, .pixel .section, .pixel .tabs button { font-family: 'Tiny5', ui-monospace, monospace; font-weight: 400; font-synthesis: none; }
      .pixel .temp { font-size: 12cqw; letter-spacing: 0; }
      .pixel .day { font-size: 15px; }
      .pixel .arr { font-family: system-ui, sans-serif; font-weight: 700; }
      .pixel .hdr { text-shadow: .5cqw .5cqw 0 rgba(10,20,40,.45); }
      .pixel .chip { border-radius: 0; background: rgba(10,20,40,.28); box-shadow: inset 0 0 0 max(1px, .4cqw) rgba(255,255,255,.35); }
      .pixel .tabs button { border-radius: 0; border-width: 2px; box-shadow: 2px 2px 0 var(--primary-color); }
      .pixel .bar, .pixel .fill { border-radius: 0; }
      .pixel .bar { height: 6px; }
    `,
  ];
}

/** Mouse drag-to-scroll for the hourly chart (touch and trackpads scroll natively). */
function dragScroll(ev: PointerEvent): void {
  if (ev.pointerType !== 'mouse') return;
  const el = ev.currentTarget as HTMLElement;
  const startX = ev.clientX, start = el.scrollLeft;
  const move = (e: PointerEvent) => { el.scrollLeft = start - (e.clientX - startX); };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function ensurePixelFont(): void {
  if (document.getElementById(PIXEL_FONT_ID)) return;
  const link = document.createElement('link');
  link.id = PIXEL_FONT_ID;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Tiny5&display=swap';
  document.head.append(link);
}

declare global {
  interface Window { customCards?: unknown[]; cabbageWeather?: { egg(kind?: EggKind): void } }
  interface HTMLElementTagNameMap { 'cabbage-weather-card': CabbageWeatherCard }
}

window.cabbageWeather = { egg: (kind?: EggKind) => INSTANCES.forEach((c) => c.triggerEgg(kind)) };

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: 'cabbage-weather-card',
  name: 'Cabbage Weather',
  description: 'A playful, illustrated weather card with animated scenes (pixel art or flat vector).',
  preview: true,
  documentationURL: 'https://github.com/mkjeldsen/haos-cabbage-weather',
});

console.info(`%c CABBAGE-WEATHER %c v${CARD_VERSION} `, 'color:#fff;background:#4f9d3a;font-weight:700', 'color:#4f9d3a;background:#fff');
