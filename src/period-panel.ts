// The period card in the map’s top-right corner: the geological period,
// prehistoric epoch or historical era of the current date, with a short
// summary. It redraws only when the period changes, and remembers whether the
// viewer collapsed it.
import { esc } from './map';

export interface PeriodInfo {
  /** Identity: the card redraws only when this changes. */
  key: string;
  name: string;
  /** What kind of division it is, e.g. “Mesozoic era · period”. */
  kind: string;
  span: string;
  summary: string;
  /** An extra line, e.g. the stone-tool stage. */
  note?: string;
  color: string;
}

const COLLAPSED_KEY = 'atlas.periodCollapsed';

export class PeriodPanel {
  private key = '';
  private collapsed: boolean;

  constructor(private el: HTMLElement) {
    try {
      this.collapsed = localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      this.collapsed = false;
    }
    el.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('[data-toggle]')) return;
      this.collapsed = !this.collapsed;
      try {
        localStorage.setItem(COLLAPSED_KEY, this.collapsed ? '1' : '0');
      } catch {
        // Not remembered in private windows; the toggle still works.
      }
      this.apply();
    });
  }

  show(p: PeriodInfo) {
    if (p.key === this.key) return;
    this.key = p.key;
    this.el.style.setProperty('--period', p.color);
    this.el.innerHTML = `
      <button class="period-head" data-toggle aria-controls="period-body">
        <span class="period-swatch"></span>
        <span class="period-titles"><span class="period-kind">${esc(p.kind)}</span><span class="period-name">${esc(p.name)}</span></span>
        <span class="period-chevron" aria-hidden="true"></span>
      </button>
      <div class="period-body" id="period-body">
        <div class="period-span">${esc(p.span)}</div>
        <p>${esc(p.summary)}</p>
        ${p.note ? `<div class="period-note">${esc(p.note)}</div>` : ''}
      </div>`;
    this.apply();
  }

  private apply() {
    this.el.classList.toggle('collapsed', this.collapsed);
    this.el.querySelector('[data-toggle]')?.setAttribute('aria-expanded', String(!this.collapsed));
    this.el.querySelector('[data-toggle]')?.setAttribute('aria-label', this.collapsed ? 'Show period details' : 'Hide period details');
  }
}
