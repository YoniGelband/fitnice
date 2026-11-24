// A toast is a short message that appears above the bottom bar and
// disappears by itself. It can carry one action button, such as "Undo".

import { el } from './dom.js';

const VISIBLE_MS = 4000;

let box = null;
let hideHandle = null;

function hide() {
  clearTimeout(hideHandle);
  if (box) box.hidden = true;
}

// showToast('Logged: Cookie', { label: 'Undo', run: () => ... })
export function showToast(message, action = null) {
  if (!box) {
    box = el('div', { class: 'toast', role: 'status' });
    document.body.append(box);
  }

  const parts = [el('span', { text: message })];
  if (action) {
    parts.push(
      el('button', {
        type: 'button',
        text: action.label,
        onclick: () => {
          hide();
          action.run();
        },
      }),
    );
  }

  box.replaceChildren(...parts);
  box.hidden = false;

  clearTimeout(hideHandle);
  hideHandle = setTimeout(hide, VISIBLE_MS);
}
