import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ALL_METRICS, METRIC_LABELS } from './chart/model';
import { DEFAULTS } from './const';
import type { CabbageWeatherConfig, HomeAssistant } from './types';

const SCHEMA = [
  { name: 'entity', required: true, selector: { entity: { domain: 'weather' } } },
  { name: 'name', selector: { text: {} } },
  {
    type: 'grid',
    name: '',
    schema: [
      {
        name: 'scene',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'forest', label: 'Forest' },
              { value: 'rural', label: 'Rural' },
              { value: 'city', label: 'City' },
              { value: 'seaside', label: 'Seaside' },
            ],
          },
        },
      },
      {
        name: 'style',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'pixel', label: 'Pixel art' },
              { value: 'flat', label: 'Flat vector' },
            ],
          },
        },
      },
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
  {
    name: 'metrics',
    selector: { select: { multiple: true, mode: 'list', options: ALL_METRICS.map((m) => ({ value: m, label: METRIC_LABELS[m] })) } },
  },
  { name: 'sun_entity', selector: { entity: { domain: 'sun' } } },
];

const LABELS: Record<string, string> = {
  entity: 'Weather entity',
  name: 'Location name (optional)',
  scene: 'Scene',
  style: 'Art style',
  animations: 'Animations',
  easter_eggs: 'Easter eggs',
  show_snark: 'Cheeky comment',
  show_hourly: 'Hourly forecast',
  hours: 'Hours',
  show_daily: 'Daily forecast',
  days: 'Days',
  metrics: 'Chart tabs',
  sun_entity: 'Sun entity',
};

const HELPERS: Record<string, string> = {
  name: "Defaults to the weather entity's name.",
  metrics: 'Tabs without data from your weather provider are hidden automatically. Feels-like is calculated when the provider has none.',
  sun_entity: 'Used for day/night, dawn/dusk and the sunrise/sunset markers.',
  easter_eggs: 'Every few minutes, something unusual may pass through the scene.',
};

@customElement('cabbage-weather-card-editor')
export class CabbageWeatherCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: CabbageWeatherConfig;

  setConfig(config: CabbageWeatherConfig): void {
    this.config = config;
  }

  private get data() {
    return { ...DEFAULTS, ...this.config };
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
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${d}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
        .computeHelper=${(s: { name: string }) => HELPERS[s.name]}
        @value-changed=${this.changed}
      ></ha-form>
      ${d.style === 'pixel'
        ? html`<ha-alert alert-type="info" title="About pixel art">
            <ul>
              <li><b>Uses JavaScript and a little CPU.</b> The scene is redrawn on a small canvas about 15 times per second while the card is visible (roughly 0.3 ms per frame on a laptop, under 1% of one core; budget several times that on an older wall tablet). It pauses when the card is scrolled out of view or the browser tab is hidden. On low-powered devices, prefer flat vector or turn animations off.</li>
              <li><b>Loads a font from Google Fonts</b> (Tiny5). Without internet access it falls back to a monospace font.</li>
              <li>Looks sharpest when the card is a multiple of 160 px wide.</li>
            </ul>
          </ha-alert>`
        : html`<ha-alert alert-type="success" title="About flat vector">
            Pure SVG and CSS animations: almost no CPU use, crisp at any size, and no external font.
          </ha-alert>`}
      ${d.animations === false
        ? html`<ha-alert alert-type="info">Animations are off: the scene is drawn once and nothing runs in the background.</ha-alert>`
        : html`<p class="note">Animations also pause automatically when your device has "reduce motion" turned on.</p>`}
    `;
  }

  static styles = css`
    ha-alert { display: block; margin-top: 12px; }
    ul { margin: 4px 0 0; padding-left: 18px; }
    li + li { margin-top: 4px; }
    .note { margin: 12px 0 0; color: var(--secondary-text-color); font-size: 13px; }
  `;
}
