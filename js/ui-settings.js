// The Settings screen: edit the exercise and sweet lists, set weekly goals,
// and export or import a backup file.

import { dateInputValue } from './format.js';
import { el } from './dom.js';
import { showToast } from './toast.js';

// onDataReplaced is called after an import, so the whole app can redraw.
export function initSettingsScreen(storage, onDataReplaced) {
  const goalList = document.getElementById('goal-list');
  const exportButton = document.getElementById('export-button');
  const importButton = document.getElementById('import-button');
  const importFile = document.getElementById('import-file');

  // The two editable lists work the same way, so they share their code.
  const lists = [
    { key: 'exerciseTypes', box: document.getElementById('exercise-type-list'), form: document.getElementById('exercise-type-add') },
    { key: 'sweetTypes', box: document.getElementById('sweet-type-list'), form: document.getElementById('sweet-type-add') },
  ];

  // One row per type: its name in an editable box, and a Remove button.
  function renderList({ key, box }) {
    const rows = storage.data[key]
      .filter((type) => !type.archived)
      .map((type) => {
        const input = el('input', { class: 'text-input', type: 'text', maxlength: '40', value: type.name, 'aria-label': 'Name' });
        input.addEventListener('change', () => {
          if (!storage.renameType(key, type.id, input.value)) showToast('That name is empty or already used');
          render();
        });

        const remove = el('button', {
          type: 'button',
          text: 'Remove',
          onclick: () => {
            storage.setTypeArchived(key, type.id, true);
            render();
            showToast(`Removed ${type.name}`, {
              label: 'Undo',
              run: () => {
                storage.setTypeArchived(key, type.id, false);
                render();
              },
            });
          },
        });

        return el('div', { class: 'settings-row' }, [input, remove]);
      });

    box.replaceChildren(...rows);
  }

  // A pair of boxes for hours and minutes. Both empty means "no goal".
  function durationGoalRow(label, minutes, onChange) {
    const hoursInput = el('input', { type: 'number', inputmode: 'numeric', min: '0', max: '167', 'aria-label': `${label} hours` });
    const minutesInput = el('input', { type: 'number', inputmode: 'numeric', min: '0', max: '59', 'aria-label': `${label} minutes` });

    if (minutes) {
      hoursInput.value = Math.floor(minutes / 60);
      minutesInput.value = minutes % 60;
    }

    const changed = () => {
      const total = (Number(hoursInput.value) || 0) * 60 + (Number(minutesInput.value) || 0);
      onChange(total > 0 ? total : null);
    };
    hoursInput.addEventListener('change', changed);
    minutesInput.addEventListener('change', changed);

    return el('div', { class: 'settings-row goal-row' }, [
      el('span', { class: 'goal-label', text: label }),
      el('label', {}, [hoursInput, ' h']),
      el('label', {}, [minutesInput, ' m']),
    ]);
  }

  function renderGoals() {
    const goals = storage.data.goals;
    const rows = [durationGoalRow('All exercise', goals.totalExerciseMinutes, (m) => storage.setTotalExerciseGoal(m))];

    for (const type of storage.data.exerciseTypes.filter((t) => !t.archived)) {
      rows.push(durationGoalRow(type.name, goals.exerciseMinutes[type.id], (m) => storage.setExerciseGoal(type.id, m)));
    }

    const sweetsInput = el('input', { type: 'number', inputmode: 'numeric', min: '0', max: '999', 'aria-label': 'Sweets maximum' });
    if (goals.sweetsMax) sweetsInput.value = goals.sweetsMax;
    sweetsInput.addEventListener('change', () => storage.setSweetsMax(Math.floor(Number(sweetsInput.value)) || null));

    rows.push(
      el('div', { class: 'settings-row goal-row' }, [
        el('span', { class: 'goal-label', text: 'Sweets (at most)' }),
        el('label', {}, [sweetsInput, ' a week']),
      ]),
    );

    goalList.replaceChildren(...rows);
  }

  function render() {
    lists.forEach(renderList);
    renderGoals();
  }

  // Hand the browser a file to download, named with today's date.
  function exportData() {
    const blob = new Blob([storage.exportText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: `fitnice-backup-${dateInputValue(Date.now())}.json` });

    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importData() {
    const file = importFile.files[0];
    importFile.value = ''; // so picking the same file again still counts as a change
    if (!file) return;

    const text = await file.text();
    if (!window.confirm('Importing replaces everything currently in the app with the contents of this file. Continue?')) return;

    const problem = storage.importText(text);
    if (problem) {
      showToast(`Import refused: ${problem}`);
      return;
    }

    showToast('Import complete');
    onDataReplaced();
  }

  for (const list of lists) {
    list.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = list.form.querySelector('input');

      if (storage.addType(list.key, input.value)) input.value = '';
      else showToast('That name is empty or already on the list');
      render();
    });
  }

  exportButton.addEventListener('click', exportData);
  importButton.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importData);

  return { render };
}
