// Small pictures of things (a sneaker, a dumbbell, a cookie...) and the pieces
// built from them: the round icon tiles on the Exercise and Sweets screens,
// and the "hero" ring with today's total. The drawings are made for this app.

import { el } from './dom.js';

const SVG = 'http://www.w3.org/2000/svg';

// Each icon is a list of shapes on a 24 x 24 grid: ['path', d] or ['circle', cx, cy, r].
// A circle marked 'dot' is filled in instead of outlined.
const ICONS = {
  // Exercise
  sneaker: [['path', 'M2 18 V13 L8 11.5 L10 7 L13.5 8 C14.5 11 17 12.5 20.5 13.5 C21.6 13.8 22 14.6 22 15.6 V18 Z M2 18 H22 M10.8 8.4 L12 11.8 M13.2 9.4 L13.9 12.4']],
  rope: [['path', 'M5 3 H7 V9 H5 Z M17 3 H19 V9 H17 Z M6 9 C6 22 18 22 18 9']],
  dumbbell: [['path', 'M6 7 V17 M18 7 V17 M3 10 V14 M21 10 V14 M6 12 H18']],
  kettlebell: [['circle', 12, 15, 5], ['path', 'M9 10.5 C7.5 5 16.5 5 15 10.5']],
  mat: [['circle', 7, 12, 4], ['circle', 7, 12, 1.5], ['path', 'M7 8 H19 V16 H7']],
  goggles: [['circle', 7.5, 12, 3.5], ['circle', 16.5, 12, 3.5], ['path', 'M11 12 H13 M4 12 H2 M20 12 H22']],
  bike: [['circle', 6, 16, 3.5], ['circle', 18, 16, 3.5], ['path', 'M6 16 L10 10 H15 L18 16 M10 10 L12 16 L15 10 M8.5 7 H11 M15 10 L14 7 H16.5']],
  note: [['circle', 7, 18, 2], ['circle', 17, 16, 2], ['path', 'M9 18 V5 L19 3 V16 M9 8.5 L19 6.5']],
  ball: [['circle', 12, 12, 9], ['path', 'M3 12 H21 M12 3 C8 7 8 17 12 21 M12 3 C16 7 16 17 12 21']],
  heart: [['path', 'M12 20 C5 15 3 11 3 8 A4.5 4.5 0 0 1 12 6.5 A4.5 4.5 0 0 1 21 8 C21 11 19 15 12 20 Z']],
  stopwatch: [['circle', 12, 13, 7], ['path', 'M12 13 V9.5 M10 3 H14 M12 3 V6 M17.5 6.5 L19 5']],
  // Sweets
  chocolate: [['path', 'M7 3 H17 A1 1 0 0 1 18 4 V20 A1 1 0 0 1 17 21 H7 A1 1 0 0 1 6 20 V4 A1 1 0 0 1 7 3 Z M6 9 H18 M6 15 H18 M12 3 V21']],
  cookie: [['circle', 12, 12, 9], ['dot', 9, 9, 1.2], ['dot', 14.5, 8.5, 1.2], ['dot', 15, 14, 1.2], ['dot', 10, 15, 1.2]],
  cake: [['path', 'M4 20 H20 V12 H4 Z M4 15.5 C7 17.5 9 13.5 12 15.5 S17 17.5 20 15.5 M12 12 V8'], ['dot', 12, 6, 1.3]],
  icecream: [['path', 'M8 11 L12 21 L16 11 M7 11 A5 5 0 0 1 17 11 Z']],
  candy: [['circle', 12, 12, 4], ['path', 'M8.5 10 L4 7 V17 L8.5 14 M15.5 10 L20 7 V17 L15.5 14']],
  pastry: [['path', 'M3 15 C6 7 18 7 21 15 C18 13 15 13 12 16 C9 13 6 13 3 15 Z M9 10 L10 14 M15 10 L14 14']],
  treat: [['circle', 12, 8, 5], ['path', 'M10 8 A2 2 0 0 1 14 8 M12 13 V21']],
  // Other
  plus: [['path', 'M12 5 V19 M5 12 H19']],
};

// Which icon fits a name, by the words in it. \b means "start of a word",
// so "Brunch" does not count as running.
const MATCHES = [
  [/\b(walk|hike|hiking|run|jog|sprint|step)/, 'sneaker'],
  [/\b(jump|rope|skip)/, 'rope'],
  [/\bkettle/, 'kettlebell'],
  [/\b(strength|weight|gym|lift|dumbbell)/, 'dumbbell'],
  [/\b(yoga|pilates|stretch|meditat)/, 'mat'],
  [/\b(swim|pool)/, 'goggles'],
  [/\b(bike|biking|cycl|spin)/, 'bike'],
  [/\b(danc|zumba|ballet)/, 'note'],
  [/\b(ball|soccer|football|basket|tennis|volley)/, 'ball'],
  [/\b(cardio|hiit|aerobic)/, 'heart'],
  [/\bchoc/, 'chocolate'],
  [/\b(cookie|biscuit)/, 'cookie'],
  [/\b(cake|cupcake|muffin)/, 'cake'],
  [/\b(ice ?cream|gelato|frozen)/, 'icecream'],
  [/\b(candy|candies|gum\b)/, 'candy'],
  [/\blolli/, 'treat'],
  [/\b(pastry|pastries|croissant|donut|doughnut|buns?\b)/, 'pastry'],
];

// Offered after the best match when suggesting icons for a new name.
const SUGGESTED = {
  exercise: ['stopwatch', 'heart', 'sneaker', 'dumbbell'],
  sweet: ['treat', 'candy', 'cookie', 'cake'],
};

// Draw one icon by its key in ICONS.
export function drawIcon(key) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  for (const [kind, ...args] of ICONS[key] || ICONS.stopwatch) {
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

// The icon a name would get on its own. kind is 'exercise' or 'sweet'.
export function iconName(name, kind) {
  const lower = name.toLowerCase();
  const match = MATCHES.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];
  return kind === 'sweet' ? 'treat' : 'stopwatch';
}

// Three icons to choose from for a name: the best match first, then common ones.
export function suggestIcons(name, kind) {
  const keys = [iconName(name, kind), ...SUGGESTED[kind]];
  return [...new Set(keys)].slice(0, 3);
}

// The icon for a saved exercise or sweet: the one the user picked, if any.
export function typeIcon(type, kind) {
  return type.icon && ICONS[type.icon] ? type.icon : iconName(type.name, kind);
}

// A round tile: the icon in a soft circle, the name underneath.
export function tile(label, iconKey, onclick) {
  return el('button', { type: 'button', class: 'tile', onclick }, [
    el('span', { class: 'tile-icon' }, [drawIcon(iconKey)]),
    el('span', { class: 'tile-name', text: label }),
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
