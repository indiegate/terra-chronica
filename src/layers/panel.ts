// The Layers panel: a checkbox per map layer, grouped, with rows greyed out
// while the current date lies outside the layer's span.
import { esc } from '../map';
import { formatBP, within, type Span, type TimeState } from '../time';
import type { LayerGroup, MapLayer } from './layer';

const GROUPS: { id: LayerGroup; title: string }[] = [
  { id: 'earth', title: 'The Earth' },
  { id: 'life', title: 'Life' },
  { id: 'people', title: 'Peoples' },
];

function spanText(s: Span): string {
  const to = s.toBP <= 0 && s.mode === 'deep' ? 'today' : formatBP(s.toBP);
  return `${formatBP(s.fromBP)} – ${to}`;
}

export class LayersPanel {
  onToggle: (id: string, on: boolean) => void = () => {};
  private time: TimeState | null = null;

  constructor(
    private panel: HTMLElement,
    private button: HTMLButtonElement,
    private layers: readonly MapLayer[],
    private isOn: (id: string) => boolean,
  ) {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open(panel.hidden);
    });
    panel.addEventListener('click', (e) => e.stopPropagation());
    panel.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.dataset.id) this.onToggle(input.dataset.id, input.checked);
    });
    document.addEventListener('click', () => this.open(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) {
        this.open(false);
        button.focus();
      }
    });
    this.render();
  }

  open(on: boolean) {
    this.panel.hidden = !on;
    this.button.setAttribute('aria-expanded', String(on));
    if (on) this.render();
  }

  render() {
    this.panel.innerHTML = `<h3>Layers</h3>${GROUPS.map((g) => {
      const rows = this.layers.filter((l) => l.group === g.id);
      if (!rows.length) return '';
      return `<section><h4>${g.title}</h4>${rows
        .map(
          (l) => `<label class="layer-row" data-layer="${esc(l.id)}">
            <input type="checkbox" data-id="${esc(l.id)}" ${this.isOn(l.id) ? 'checked' : ''} />
            <span>${esc(l.title)}<small>${esc(spanText(l.span))}</small></span>
          </label>`,
        )
        .join('')}</section>`;
    }).join('')}`;
    if (this.time) this.setTime(this.time);
  }

  /** Grey out layers with nothing to show at `t`. */
  setTime(t: TimeState) {
    this.time = t;
    for (const l of this.layers) {
      const row = this.panel.querySelector<HTMLElement>(`[data-layer="${CSS.escape(l.id)}"]`);
      if (!row) continue;
      const idle = !within(l.span, t);
      row.classList.toggle('idle', idle);
      row.title = idle ? `Nothing to show at this date (${spanText(l.span)})` : '';
    }
  }
}
