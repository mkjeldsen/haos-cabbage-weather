import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ALL_METRICS } from './chart/model';
import { DEFAULTS, withDefaults } from './const';
import type { CabbageWeatherConfig, HomeAssistant, MetricId } from './types';

type Lang = 'da' | 'en';

/** Editor strings. The card itself is always Danish; the editor follows Home Assistant's language. */
const STRINGS = {
  en: {
    labels: {
      entity: 'Weather entity', name: 'Location name (optional)', scene: 'Scene', style: 'Art style',
      animations: 'Animations', easter_eggs: 'Easter eggs', show_snark: 'Cheeky comment',
      show_hourly: 'Hourly forecast', hours: 'Hours', show_daily: 'Daily forecast', days: 'Days',
      metrics: 'Chart tabs', sun_entity: 'Sun entity',
    } as Record<string, string>,
    helpers: {
      name: "Defaults to the weather entity's name.",
      metrics: 'Tabs without data from your weather provider are hidden automatically. Feels-like is calculated when the provider has none.',
      sun_entity: 'Used for day/night, dawn/dusk and the sunrise/sunset markers.',
      easter_eggs: 'Every few minutes, something unusual may pass through the scene.',
    } as Record<string, string>,
    scenes: { forest: 'Forest', rural: 'Rural', suburb: 'Suburb', city: 'City', seaside: 'Seaside' },
    styles: { pixel: 'Pixel art', flat: 'Flat vector' },
    metrics: {
      temperature: 'Temperature', feels_like: 'Feels like', precipitation_probability: 'Precipitation chance',
      precipitation: 'Precipitation amount', wind: 'Wind', humidity: 'Humidity', cloud_coverage: 'Cloud cover', uv_index: 'UV index',
    } as Record<MetricId, string>,
    pixelTitle: 'About pixel art',
    pixelCpu: ['Uses JavaScript and a little CPU.', 'The scene is redrawn on a small canvas about 15 times per second while the card is visible (roughly 0.3 ms per frame on a laptop, under 1% of one core; budget several times that on an older wall tablet). It pauses when the card is scrolled out of view or the browser tab is hidden. On low-powered devices, prefer flat vector or turn animations off.'],
    pixelFont: ['Loads a font from Google Fonts', '(Tiny5). Without internet access it falls back to a monospace font.'],
    pixelSharp: 'Looks sharpest when the card is a multiple of 160 px wide.',
    flatTitle: 'About flat vector',
    flatBody: 'Pure SVG and CSS animations: almost no CPU use, crisp at any size, and no external font.',
    animOff: 'Animations are off: the scene is drawn once and nothing runs in the background.',
    reduceMotion: 'Animations also pause automatically when your device has "reduce motion" turned on.',
  },
  da: {
    labels: {
      entity: 'Vejr-entitet', name: 'Stednavn (valgfrit)', scene: 'Landskab', style: 'Grafisk stil',
      animations: 'Animationer', easter_eggs: 'Små overraskelser', show_snark: 'Fræk kommentar',
      show_hourly: 'Timeprognose', hours: 'Timer', show_daily: 'Daglig prognose', days: 'Dage',
      metrics: 'Faner i grafen', sun_entity: 'Sol-entitet',
    } as Record<string, string>,
    helpers: {
      name: 'Bruger vejr-entitetens navn, hvis feltet er tomt.',
      metrics: 'Faner uden data fra din vejrudbyder skjules automatisk. "Føles som" beregnes, hvis udbyderen ikke leverer den.',
      sun_entity: 'Bruges til dag og nat, daggry og skumring samt markeringer for solopgang og solnedgang.',
      easter_eggs: 'Med få minutters mellemrum kan der dukke noget uventet op i landskabet.',
    } as Record<string, string>,
    scenes: { forest: 'Skov', rural: 'Land', suburb: 'Parcelhuskvarter', city: 'By', seaside: 'Kyst' },
    styles: { pixel: 'Pixelkunst', flat: 'Flad vektor' },
    metrics: {
      temperature: 'Temperatur', feels_like: 'Føles som', precipitation_probability: 'Sandsynlighed for nedbør',
      precipitation: 'Nedbørsmængde', wind: 'Vind', humidity: 'Luftfugtighed', cloud_coverage: 'Skydække', uv_index: 'UV-indeks',
    } as Record<MetricId, string>,
    pixelTitle: 'Om pixelkunst',
    pixelCpu: ['Bruger JavaScript og en smule CPU.', 'Landskabet tegnes på et lille lærred ca. 15 gange i sekundet, mens kortet er synligt (omkring 0,3 ms pr. billede på en bærbar, under 1 % af én kerne; regn med flere gange så meget på en ældre vægtablet). Det sættes på pause, når kortet er rullet ud af syne, eller fanen er skjult. På svage enheder bør du vælge flad vektor eller slå animationer fra.'],
    pixelFont: ['Henter en skrifttype fra Google Fonts', '(Tiny5). Uden internetadgang bruges en monospace-skrifttype i stedet.'],
    pixelSharp: 'Ser skarpest ud, når kortet er et multiplum af 160 px bredt.',
    flatTitle: 'Om flad vektor',
    flatBody: 'Ren SVG og CSS-animationer: næsten intet CPU-forbrug, skarp i alle størrelser og ingen ekstern skrifttype.',
    animOff: 'Animationer er slået fra: landskabet tegnes én gang, og intet kører i baggrunden.',
    reduceMotion: 'Animationerne sættes også automatisk på pause, når din enhed har "reducer bevægelse" slået til.',
  },
};

export function editorLang(hass?: HomeAssistant): Lang {
  const lang = hass?.locale?.language ?? hass?.language ?? navigator.language ?? 'en';
  return lang.toLowerCase().startsWith('da') ? 'da' : 'en';
}

function schema(t: (typeof STRINGS)[Lang]) {
  const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));
  return [
    { name: 'entity', required: true, selector: { entity: { domain: 'weather' } } },
    { name: 'name', selector: { text: {} } },
    {
      type: 'grid',
      name: '',
      schema: [
        { name: 'scene', selector: { select: { mode: 'dropdown', options: opts(t.scenes) } } },
        { name: 'style', selector: { select: { mode: 'dropdown', options: opts(t.styles) } } },
      ],
    },
    {
      type: 'grid',
      name: '',
      schema: [
        { name: 'animations', selector: { boolean: {} } },
        { name: 'easter_eggs', selector: { boolean: {} } },
        { name: 'show_snark', selector: { boolean: {} } },
      ],
    },
    {
      type: 'grid',
      name: '',
      schema: [
        { name: 'show_hourly', selector: { boolean: {} } },
        { name: 'hours', selector: { number: { min: 6, max: 48, step: 1, mode: 'slider' } } },
        { name: 'show_daily', selector: { boolean: {} } },
        { name: 'days', selector: { number: { min: 3, max: 10, step: 1, mode: 'slider' } } },
      ],
    },
    { name: 'metrics', selector: { select: { multiple: true, mode: 'list', options: ALL_METRICS.map((m) => ({ value: m, label: t.metrics[m] })) } } },
    { name: 'sun_entity', selector: { entity: { domain: 'sun' } } },
  ];
}

@customElement('cabbage-weather-card-editor')
export class CabbageWeatherCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: CabbageWeatherConfig;

  setConfig(config: CabbageWeatherConfig): void {
    this.config = config;
  }

  private get data() {
    return withDefaults(this.config ?? {});
  }

  private changed(ev: CustomEvent): void {
    const config = { ...ev.detail.value } as CabbageWeatherConfig;
    // Keep the YAML tidy: drop values that equal the defaults.
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (JSON.stringify((config as any)[k]) === JSON.stringify(v)) delete (config as any)[k];
    }
    if (!config.name) delete config.name;
    this.config = config;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const d = this.data;
    const t = STRINGS[editorLang(this.hass)];
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${d}
        .schema=${schema(t)}
        .computeLabel=${(s: { name: string }) => t.labels[s.name] ?? s.name}
        .computeHelper=${(s: { name: string }) => t.helpers[s.name]}
        @value-changed=${this.changed}
      ></ha-form>
      ${d.style === 'pixel'
        ? html`<ha-alert alert-type="info" .title=${t.pixelTitle}>
            <ul>
              <li><b>${t.pixelCpu[0]}</b> ${t.pixelCpu[1]}</li>
              <li><b>${t.pixelFont[0]}</b> ${t.pixelFont[1]}</li>
              <li>${t.pixelSharp}</li>
            </ul>
          </ha-alert>`
        : html`<ha-alert alert-type="success" .title=${t.flatTitle}>${t.flatBody}</ha-alert>`}
      ${d.animations === false
        ? html`<ha-alert alert-type="info">${t.animOff}</ha-alert>`
        : html`<p class="note">${t.reduceMotion}</p>`}
    `;
  }

  static styles = css`
    ha-alert { display: block; margin-top: 12px; }
    ul { margin: 4px 0 0; padding-left: 18px; }
    li + li { margin-top: 4px; }
    .note { margin: 12px 0 0; color: var(--secondary-text-color); font-size: 13px; }
  `;
}
