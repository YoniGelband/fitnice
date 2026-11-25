// A "dial": a column of numbers you flick up and down with a finger, like the
// time picker in a phone's alarm app. The number resting in the middle is the value.

import { el } from './dom.js';

const ITEM_HEIGHT = 44; // must match .wheel-item in styles.css

// Fill "box" with the numbers 0 .. count-1 and make it behave as a dial.
// Returns { get(), set(n) }. The box must be visible when set() is called,
// because a hidden element cannot be scrolled.
export function createWheel(box, count) {
  const items = [];
  for (let n = 0; n < count; n += 1) {
    const item = el('div', { class: 'wheel-item', text: String(n).padStart(2, '0'), onclick: () => scrollToValue(n, true) });
    items.push(item);
  }
  box.replaceChildren(...items);

  // The chosen number is remembered here, not read from the page when asked.
  // By the time a dialog reports that it closed, its contents are already
  // hidden and a hidden dial always reads as scrolled to the top (0).
  let value = 0;

  function select(n) {
    value = Math.min(count - 1, Math.max(0, n));
    items.forEach((item, i) => item.classList.toggle('selected', i === value));
  }

  function scrollToValue(n, smooth) {
    select(n);
    box.scrollTo({ top: n * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'instant' });
  }

  // While the dial is being flicked: how far the column is scrolled tells us
  // which number is in the middle. Ignored when the dial is not on screen.
  box.addEventListener('scroll', () => {
    if (box.offsetParent !== null) select(Math.round(box.scrollTop / ITEM_HEIGHT));
  });

  return { get: () => value, set: (n) => scrollToValue(n, false) };
}
