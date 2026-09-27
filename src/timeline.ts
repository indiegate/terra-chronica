import * as d3 from 'd3';

/** A slider over some time value (years AD/BC, or millions of years ago). */
export interface TimelineConfig {
  /** Value → position (0 = left, 1 = right) and back. */
  toPos: (v: number) => number;
  fromPos: (p: number) => number;
  /** Rounding applied while scrubbing. */
  round: (v: number) => number;
  bands: { name: string; start: number; end: number; color?: string }[];
  events: { value: number; label: string }[];
  ticks: number[];
  /** Long form for tooltips; short form for tick labels. */
  format: (v: number) => string;
  tickFormat: (v: number) => string;
}

export class Timeline {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private x = d3.scaleLinear<number>();
  private width = 0;
  private value = 0;
  private snaps: number[] = [];
  private tip: HTMLDivElement;

  onChange: (v: number) => void = () => {};
  onScrubStart: () => void = () => {};

  constructor(
    private host: HTMLElement,
    private cfg: TimelineConfig,
  ) {
    this.svg = d3.select(host).append('svg').attr('class', 'timeline-svg');
    this.tip = document.createElement('div');
    this.tip.className = 'timeline-tip';
    host.appendChild(this.tip);

    const drag = d3
      .drag<SVGSVGElement, unknown>()
      .on('start', (e) => {
        this.onScrubStart();
        this.host.classList.add('scrubbing');
        this.scrubTo(e.x);
      })
      .on('drag', (e) => this.scrubTo(e.x))
      .on('end', () => this.host.classList.remove('scrubbing'));
    this.svg.call(drag);

    new ResizeObserver(() => this.render()).observe(host);
  }

  /** Values the handle snaps to when close (e.g. dates with surveyed borders). */
  setSnaps(values: number[]) {
    this.snaps = values;
    this.render();
  }

  toPos(v: number) {
    return this.cfg.toPos(v);
  }
  fromPos(p: number) {
    return this.cfg.fromPos(Math.max(0, Math.min(1, p)));
  }

  setValue(v: number) {
    this.value = v;
    this.updateHandle();
  }

  private pick(v: number) {
    this.onScrubStart();
    this.setValue(v);
    this.onChange(v);
  }

  private scrubTo(px: number) {
    let v = this.cfg.round(this.fromPos(this.x.invert(px)));
    for (const s of this.snaps) if (Math.abs(this.x(this.toPos(s)) - px) < 4) v = s;
    this.setValue(v);
    this.onChange(v);
  }

  private render() {
    const r = this.host.getBoundingClientRect();
    if (!r.width) return;
    const w = (this.width = r.width);
    const pad = 10;
    const bandY = 0;
    const bandH = 14;
    const axisY = 30;
    this.x.domain([0, 1]).range([pad, w - pad]);
    this.svg.attr('width', w).attr('height', r.height).selectAll('*').remove();
    const X = (v: number) => this.x(this.toPos(v));
    const { format, tickFormat } = this.cfg;

    // Bands (eras, or geological periods)
    const bands = this.svg.append('g').attr('class', 'eras');
    this.cfg.bands.forEach((band, i) => {
      const x0 = Math.min(X(band.start), X(band.end));
      const x1 = Math.max(X(band.start), X(band.end));
      const g = bands.append('g').attr('class', `era era-${i % 2}`).on('click', () => {
        this.pick(this.cfg.round(this.fromPos((this.toPos(band.start) + this.toPos(band.end)) / 2)));
      });
      const rect = g.append('rect').attr('x', x0).attr('y', bandY).attr('width', x1 - x0).attr('height', bandH);
      if (band.color) rect.style('fill', band.color);
      const room = x1 - x0;
      g.append('text')
        .attr('x', (x0 + x1) / 2)
        .attr('y', bandY + bandH / 2 + 3.5)
        .text(room > band.name.length * 7 + 6 ? band.name : room > 34 ? band.name.slice(0, 4) + '.' : room > 14 ? band.name[0] : '')
        .append('title')
        .text(`${band.name}: ${format(band.start)} – ${format(band.end)}`);
    });

    // Track
    const track = this.svg.append('g').attr('class', 'track');
    track.append('line').attr('class', 'rule').attr('x1', pad).attr('x2', w - pad).attr('y1', axisY).attr('y2', axisY);

    // Ticks, skipping any that would overlap the previous label
    let lastX = -Infinity;
    for (const t of [...this.cfg.ticks].sort((a, b) => this.toPos(a) - this.toPos(b))) {
      const tx = X(t);
      const label = tickFormat(t);
      if (tx - lastX < label.length * 6 + 16) continue;
      lastX = tx;
      track.append('line').attr('class', 'tick').attr('x1', tx).attr('x2', tx).attr('y1', axisY).attr('y2', axisY + 4);
      track.append('text').attr('class', 'tick-label').attr('x', tx).attr('y', axisY + 16).text(label);
    }

    // Events: a diamond where there is room, a thin tick where events crowd together.
    // Hovering the event row picks the nearest event, so every one stays reachable.
    const events = [...this.cfg.events].map((e) => ({ ...e, x: X(e.value) })).sort((a, b) => a.x - b.x);
    let lastDiamond = -Infinity;
    const marks = events.map((e, i) => {
      const gapBefore = i > 0 ? e.x - events[i - 1].x : Infinity;
      const gapAfter = i < events.length - 1 ? events[i + 1].x - e.x : Infinity;
      const roomy = gapBefore >= 7 && gapAfter >= 7 && e.x - lastDiamond >= 7;
      if (roomy) lastDiamond = e.x;
      return { ...e, roomy };
    });
    const eventsG = this.svg.append('g').attr('class', 'events');
    eventsG
      .selectAll('path')
      .data(marks)
      .join('path')
      .attr('class', (d) => (d.roomy ? 'event' : 'event tick-event'))
      .attr('d', (d) => (d.roomy ? d3.symbol(d3.symbolDiamond, 20)() : `M0,-4V4`))
      .attr('transform', (d) => `translate(${d.x},${axisY - 7})`);
    const nearest = (px: number) => {
      let best: (typeof marks)[number] | null = null;
      for (const m of marks) if (Math.abs(m.x - px) <= 6 && (!best || Math.abs(m.x - px) < Math.abs(best.x - px))) best = m;
      return best;
    };
    eventsG
      .append('rect')
      .attr('class', 'event-hit')
      .attr('x', pad - 6)
      .attr('width', w - 2 * pad + 12)
      .attr('y', axisY - 13)
      .attr('height', 12)
      .on('mousemove', (e: MouseEvent) => {
        const m = nearest(d3.pointer(e, this.svg.node())[0]);
        eventsG.selectAll<SVGPathElement, (typeof marks)[number]>('path').classed('hover', (d) => d === m);
        if (!m) {
          this.tip.style.opacity = '0';
          return;
        }
        this.tip.innerHTML = `<em>${format(m.value)}</em> ${m.label}`;
        this.tip.style.opacity = '1';
        const tx = Math.max(8, Math.min(m.x - this.tip.offsetWidth / 2, this.width - this.tip.offsetWidth - 8));
        this.tip.style.transform = `translate(${tx}px, -30px)`;
      })
      .on('mouseleave', () => {
        this.tip.style.opacity = '0';
        eventsG.selectAll('path').classed('hover', false);
      })
      .on('mousedown', (e: MouseEvent) => {
        // Over an event, pick it instead of scrubbing.
        if (nearest(d3.pointer(e, this.svg.node())[0])) e.stopPropagation();
      })
      .on('click', (e: MouseEvent) => {
        const m = nearest(d3.pointer(e, this.svg.node())[0]);
        if (!m) return;
        e.stopPropagation();
        this.pick(m.value);
      });

    // Handle
    const handle = this.svg.append('g').attr('class', 'handle');
    handle.append('line').attr('y1', bandY).attr('y2', axisY + 4);
    handle.append('circle').attr('class', 'seal').attr('cy', axisY).attr('r', 5);
    this.updateHandle();
  }

  private updateHandle() {
    this.svg.select('g.handle').attr('transform', `translate(${this.x(this.toPos(this.value))},0)`);
  }
}
