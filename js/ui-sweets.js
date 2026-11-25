// The Sweets screen: log a sweet with one tap and see today's sweets.

import { timeOfDay } from './format.js';
import { dayEntries } from './stats.js';
import { el } from './dom.js';
import { showToast } from './toast.js';
import { tile, plusTile, hero } from './tiles.js';

export function initSweetsScreen(storage, entryDialog) {
  const buttonBox = document.getElementById('sweet-buttons');
  const todayLine = document.getElementById('sweets-today-line');
  const todayList = document.getElementById('sweets-today-list');
  const otherDialog = document.getElementById('other-dialog');
  const otherInput = document.getElementById('other-name');

  // One tile per sweet on the user's list, plus "Other" for anything else.
  function renderButtons() {
    const buttons = storage.data.sweetTypes
      .filter((type) => !type.archived)
      .map((type) => tile(type.name, () => logSweet(type.name)));

    buttons.push(plusTile('Other', openOther));
    buttonBox.replaceChildren(...buttons);
  }

  // Today's count and today's sweets, newest first. Tap one to change or delete it.
  function renderToday() {
    const today = dayEntries(storage.data, Date.now());
    const word = today.sweetsCount === 1 ? 'sweet' : 'sweets';
    todayLine.replaceChildren(hero(String(today.sweetsCount), `${word} today`, null));

    if (today.sweetsCount === 0) {
      todayList.replaceChildren(el('li', { class: 'empty', text: 'No sweets yet today.' }));
      return;
    }

    const newestFirst = [...today.sweets].sort((a, b) => b.eatenAt - a.eatenAt);
    todayList.replaceChildren(
      ...newestFirst.map((s) =>
        el('li', {}, [
          el('button', { type: 'button', class: 'entry-button', onclick: () => entryDialog.openEdit('sweet', s, render) }, [
            el('span', { text: s.name }),
            el('span', { class: 'entry-time', text: timeOfDay(s.eatenAt) }),
          ]),
        ]),
      ),
    );
  }

  function render() {
    renderButtons();
    renderToday();
  }

  // Log a sweet right now, and offer a few seconds to take it back.
  function logSweet(name) {
    const saved = storage.addSweet({ name, eatenAt: Date.now() });
    render();

    showToast(`Logged: ${name}`, {
      label: 'Undo',
      run: () => {
        storage.deleteSweet(saved.id);
        render();
      },
    });
  }

  function openOther() {
    otherInput.value = '';
    otherDialog.returnValue = '';
    otherDialog.showModal();
  }

  function closeOther() {
    const name = otherInput.value.trim();
    if (otherDialog.returnValue === 'add' && name) logSweet(name);
  }

  otherDialog.addEventListener('close', closeOther);

  return { render };
}
