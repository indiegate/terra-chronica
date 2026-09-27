/**
 * The Chicxulub impact, 66 million years ago: a meteor streaks in, a flash and
 * shock rings spread from the crater, and dust darkens the world before
 * clearing. Screen coordinates; the overlay removes itself when done.
 */
export function playImpact(host: HTMLElement, x: number, y: number) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    parent.appendChild(e);
    return e;
  };
  const { width, height } = host.getBoundingClientRect();
  const svg = el('svg', { class: 'impact', width, height }, host);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FALL = reduced ? 0 : 700;

  // Dust: the sky darkens, then slowly clears.
  el('rect', { x: 0, y: 0, width, height, fill: '#2a1c10' }, svg).animate(
    [{ opacity: 0 }, { opacity: 0.32, offset: 0.2 }, { opacity: 0.26, offset: 0.55 }, { opacity: 0 }],
    { duration: 4200, delay: FALL, fill: 'both', easing: 'ease-in-out' },
  );

  if (!reduced) {
    // Meteor: glowing head with a tail, falling in from the upper right.
    const [dx, dy] = [Math.min(520, width), -Math.min(360, height)];
    const meteor = el('g', {}, svg);
    const len = Math.hypot(dx, dy);
    const [ux, uy] = [dx / len, dy / len];
    const grad = el('linearGradient', { id: 'meteor-tail', x1: 0, y1: 0, x2: ux * 140, y2: uy * 140, gradientUnits: 'userSpaceOnUse' }, el('defs', {}, svg));
    el('stop', { offset: 0, 'stop-color': '#fff3d0', 'stop-opacity': 1 }, grad);
    el('stop', { offset: 1, 'stop-color': '#e07a2a', 'stop-opacity': 0 }, grad);
    el('line', { x1: 0, y1: 0, x2: ux * 140, y2: uy * 140, stroke: 'url(#meteor-tail)', 'stroke-width': 5, 'stroke-linecap': 'round' }, meteor);
    el('circle', { r: 4.5, fill: '#fff8e0' }, meteor);
    meteor.animate(
      [{ transform: `translate(${x + dx}px, ${y + dy}px)` }, { transform: `translate(${x}px, ${y}px)` }],
      { duration: FALL, easing: 'cubic-bezier(0.55, 0, 1, 0.6)', fill: 'forwards' },
    ).finished.then(() => meteor.remove());

    // Flash and rings stay hidden (opacity 0) until the meteor lands.
    const grow = (e: SVGElement, from: number, to: number) =>
      e.animate([{ transform: `translate(${x}px, ${y}px) scale(${from})` }, { transform: `translate(${x}px, ${y}px) scale(${to})` }], {
        duration: 1900,
        delay: FALL,
        easing: 'cubic-bezier(0.1, 0.6, 0.3, 1)',
        fill: 'forwards',
      });

    // Flash
    const flash = el('circle', { r: 100, fill: '#fff4d6', opacity: 0 }, svg);
    grow(flash, 0.05, 1.4);
    flash.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 700, delay: FALL, fill: 'forwards', easing: 'ease-out' });

    // Shock rings
    for (let i = 0; i < 3; i++) {
      const ring = el('circle', { r: 100, fill: 'none', stroke: i ? '#b5533c' : '#e07a2a', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', opacity: 0 }, svg);
      const a = grow(ring, 0.05, 3.2 + i * 0.6);
      a.effect!.updateTiming({ delay: FALL + i * 220 });
      ring.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 1900, delay: FALL + i * 220, fill: 'forwards', easing: 'ease-in' });
    }
  }

  // Crater glow that lingers while the dust settles.
  const crater = el('circle', { r: 5, fill: '#e07a2a', opacity: 0 }, svg);
  crater.setAttribute('transform', `translate(${x} ${y})`);
  crater.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0 }], { duration: 3600, delay: FALL, fill: 'forwards' });

  window.setTimeout(() => svg.remove(), FALL + 4400);
}
