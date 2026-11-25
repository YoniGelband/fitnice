// Small pictures and the pieces built from them: the round icon tiles on the
// Exercise and Sweets screens, and the "hero" ring with today's total.
// The icons are simple line drawings made for this app.

import { el } from './dom.js';

const SVG = 'http://www.w3.org/2000/svg';

// Each icon is a list of shapes on a 24 x 24 grid: ['path', d] or ['circle', cx, cy, r].
// A circle marked 'dot' is filled in instead of outlined.
const ICONS = {
  walking: [['circle', 13, 4, 2], ['path', 'M12 7 L10 13 L13 16 L13 21 M10 13 L7 21 M11 9 L15 11 M11 9 L7 11']],
  running: [['circle', 15, 4, 2], ['path', 'M13 7 L10 12 L14 15 L12 21 M10 12 L6 13 M13 7 L17 10 L20 9 M14 15 L18 17']],
  rope: [['circle', 12, 7, 1.6], ['path', 'M12 9 V15 M5 4 V9 M19 4 V9 M5 9 C5 24 19 24 19 9']],
  strength: [['path', 'M6 7 V17 M18 7 V17 M3 10 V14 M21 10 V14 M6 12 H18']],
  chocolate: [['path', 'M7 3 H17 A1 1 0 0 1 18 4 V20 A1 1 0 0 1 17 21 H7 A1 1 0 0 1 6 20 V4 A1 1 0 0 1 7 3 Z M6 9 H18 M6 15 H18 M12 3 V21']],
  cookie: [['circle', 12, 12, 9], ['dot', 9, 9, 1.2], ['dot', 14.5, 8.5, 1.2], ['dot', 15, 14, 1.2], ['dot', 10, 15, 1.2]],
  cake: [['path', 'M4 20 H20 V12 H4 Z M4 15.5 C7 17.5 9 13.5 12 15.5 S17 17.5 20 15.5 M12 12 V8'], ['dot', 12, 6, 1.3]],
  icecream: [['path', 'M8 11 L12 21 L16 11 M7 11 A5 5 0 0 1 17 11 Z']],
  candy: [['circle', 12, 12, 4], ['path', 'M8.5 10 L4 7 V17 L8.5 14 M15.5 10 L20 7 V17 L15.5 14']],
  pastry: [['path', 'M3 15 C6 7 18 7 21 15 C18 13 15 13 12 16 C9 13 6 13 3 15 Z M9 10 L10 14 M15 10 L14 14']],
  plus: [['path', 'M12 5 V19 M5 12 H19']],
};

// Which icon fits a name, by the words in it. Names the user typed that match
// nothing are shown by their first letter instead.  means "start of a word",
// so "Brunch" does not count as running.
const MATCHES = [
  [/(walk|hike)/, 'walking'],
  [/(run|jog)/, 'running'],
  [/(jump|rope|skip)/, 'rope'],
  [/(strength|weight|gym|lift|dumbbell)/, 'strength'],
  [/choc/, 'chocolate'],
  [/(cookie|biscuit)/, 'cookie'],
  [/(cake|cupcake|muffin)/, 'cake'],
  [/(ice ?cream|gelato|frozen)/, 'icecream'],
  [/(candy|candies|lolli|gum)/, 'candy'],
  [/(pastry|pastries|croissant|donut|doughnut|buns?)/, 'pastry'],
];

function drawIcon(name) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  for (const [kind, ...args] of ICONS[name]) {
    const shape = document.createElementNS(SVG, kind === 'path' ? 'path' : 'circle');
    if (kind === 'path') {
      shape.setAttribute('d', args[0]);
    } else {
      shape.setAttribute('cx', args[0]);
      shape.setAttribute('cy', args[1]);
      shape.setAttribute('r', args[2]);
      if (kind === 'dot') shape.setAttribute('class', 'dot');
    }
    svg.append(shape);
  }
  return svg;
}

// The picture for an exercise or sweet name: a drawing, or its first letter.
export function iconFor(name) {
  const lower = name.toLowerCase();
  const match = MATCHES.find(([pattern]) => pattern.test(lower));
  if (match) return drawIcon(match[1]);
  // Array.from splits by whole characters, so a name starting with an emoji keeps it intact.
  return el('span', { text: (Array.from(name.trim())[0] || '').toUpperCase() });
}

// A round tile: the icon in a soft circle, the name underneath.
export function tile(name, onclick) {
  return el('button', { type: 'button', class: 'tile', onclick }, [
    el('span', { class: 'tile-icon' }, [iconFor(name)]),
    el('span', { class: 'tile-name', text: name }),
  ]);
}

// The same shape with a "+" in a dashed circle, for adding something new.
export function plusTile(label, onclick) {
  return el('button', { type: 'button', class: 'tile add', onclick }, [
    el('span', { class: 'tile-icon' }, [drawIcon('plus')]),
    el('span', { class: 'tile-name', text: label }),
  ]);
}

// The big number at the top of a screen, inside a ring.
// fraction (0 to 1) fills the ring part way; null shows a plain soft ring.
export function hero(valueText, label, fraction) {
  const radius = 42;
  const length = 2 * Math.PI * radius;
  const circle = (cls) => {
    const c = document.createElementNS(SVG, 'circle');
    c.setAttribute('class', cls);
    c.setAttribute('cx', 50);
    c.setAttribute('cy', 50);
    c.setAttribute('r', radius);
    return c;
  };

  const arc = circle('ring-arc');
  const drawn = fraction === null ? length : Math.min(1, fraction) * length;
  arc.setAttribute('stroke-dasharray', `${drawn} ${length}`);

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(circle('ring-track'), arc);

  return el('div', { class: fraction === null ? 'hero no-goal' : 'hero' }, [
    svg,
    el('span', { class: 'hero-value', text: valueText }),
    el('span', { class: 'hero-label', text: label }),
  ]);
}
