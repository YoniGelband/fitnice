// The Settings screen: edit the exercise and sweet lists, set weekly goals,
// and export or import a backup file.

import { dateInputValue, duration } from './format.js';
import { el } from './dom.js';
import { showToast } from './toast.js';
import { drawIcon, suggestIcons, typeIcon } from './tiles.js';
import { createWheel } from './wheel.js';

// onDataReplaced is called after an import, so the whole app can redraw.
export function initSettingsScreen(storage, onDataReplaced) {
  const goalList = document.getElementById('goal-list');
  const exportButton = document.getElementById('export-button');
  const importButton = document.getElementById('import-button');
  const importFile = document.getElementById('import-file');

  const goalDialog = document.getElementById('goal-dialog');
  const goalTitle = document.getElementById('goal-title');
  const goalHint = document.getElementById('goal-hint');
  const firstUnit = document.getElementById('goal-first-unit');
  const minutesBox = document.getElementById('goal-minutes');
  const minutesUnit = document.getElementById('goal-minutes-unit');
  const firstWheel = createWheel(document.getElementById('goal-first'), 100); // hours, or a count of sweets
  const minutesWheel = createWheel(minutesBox, 60);
  const iconDialog = document.getElementById('icon-dialog');
  const iconTitle = document.getElementById('icon-title');
  const iconChoices = document.getElementById('icon-choices');
  let iconEditing = null; // { key, id } of the type whose picture is being chosen

  let goalEditing = null; // { isDuration, save(value or null) } while the goal dialog is open

  // The two editable lists work the same way, so they share their code.
  const lists = [
    { key: 'exerciseTypes', box: document.getElementById('exercise-type-list'), form: document.getElementById('exercise-type-add') },
    { key: 'sweetTypes', box: document.getElementById('sweet-type-list'), form: document.getElementById('sweet-type-add') },
  ];

  // One row per type: a small icon, the name (tap it to rename), and an x to remove.
  // The rows go above the list's "Add" row, which stays in place.
  function renderList({ key, box, form }) {
    const rows = storage.data[key]
      .filter((type) => !type.archived)
      .map((type) => {
        // The name looks like plain text, but it is a text box: tapping it lets you type.
        const input = el('input', { class: 'plain-input', type: 'text', maxlength: '40', value: type.name, 'aria-label': 'Name' });
        input.addEventListener('change', () => {
          if (!storage.renameType(key, type.id, input.value)) showToast('That name is empty or already used');
          render();
        });

        const remove = el('button', {
          type: 'button',
          class: 'remove-x',
          text: '×',
          'aria-label': `Remove ${type.name}`,
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

        // The small picture is a button too: tap it to choose a different one.
        const icon = el('button', { type: 'button', class: 'row-icon', 'aria-label': `Change the icon for ${type.name}`, onclick: () => openIcons(key, type) }, [
          drawIcon(typeIcon(type, kindOf(key))),
        ]);
        return el('div', { class: 'list-row' }, [icon, input, remove]);
      });

    box.replaceChildren(...rows, form);
  }

  const kindOf = (key) => (key === 'sweetTypes' ? 'sweet' : 'exercise');

  // The icon dialog: three pictures suggested from the name, tap one to use it.
  function openIcons(key, type) {
    iconEditing = { key, id: type.id };
    iconTitle.textContent = `An icon for ${type.name}`;
    const current = typeIcon(type, kindOf(key));
    iconChoices.replaceChildren(
      ...suggestIcons(type.name, kindOf(key)).map((icon) =>
        // Each choice closes the dialog with its icon's name as the answer.
        el('button', { class: icon === current ? 'icon-choice current' : 'icon-choice', value: icon, 'aria-label': icon }, [drawIcon(icon)]),
      ),
    );
    iconDialog.returnValue = '';
    iconDialog.showModal();
  }

  function closeIcons() {
    const choice = iconDialog.returnValue;
    if (iconEditing && choice && choice !== 'cancel') storage.setTypeIcon(iconEditing.key, iconEditing.id, choice);
    iconEditing = null;
    render();
  }

  // One goal: its name, and its value as text. Tapping opens the goal dialog.
  function goalRow(label, valueText, onTap) {
    return el('button', { type: 'button', class: 'list-row row-button', onclick: onTap }, [
      el('span', { text: label }),
      el('span', { class: valueText ? 'row-value' : 'row-value muted', text: valueText || 'No goal' }),
    ]);
  }

  // A goal in minutes, shown as "3h 0m".
  const minutesText = (minutes) => (minutes ? duration(minutes * 60 * 1000) : null);

  function renderGoals() {
    const goals = storage.data.goals;
    const rows = [
      goalRow('All exercise', minutesText(goals.totalExerciseMinutes), () =>
        openGoal('All exercise', true, goals.totalExerciseMinutes, (m) => storage.setTotalExerciseGoal(m)),
      ),
    ];

    for (const type of storage.data.exerciseTypes.filter((t) => !t.archived)) {
      const current = goals.exerciseMinutes[type.id];
      rows.push(goalRow(type.name, minutesText(current), () => openGoal(type.name, true, current, (m) => storage.setExerciseGoal(type.id, m))));
    }

    const max = goals.sweetsMax;
    rows.push(goalRow('Sweets, at most', max ? `${max} a week` : null, () => openGoal('Sweets', false, max, (n) => storage.setSweetsMax(n))));

    goalList.replaceChildren(...rows);
  }

  // The goal dialog: dials for hours and minutes, or one dial for a number of sweets.
  function openGoal(title, isDuration, current, save) {
    goalEditing = { isDuration, save };
    goalTitle.textContent = title;
    goalHint.textContent = isDuration ? 'Time per week' : 'Sweets per week, at most';
    firstUnit.textContent = isDuration ? 'h' : 'a week';
    minutesBox.hidden = !isDuration;
    minutesUnit.hidden = !isDuration;
    goalDialog.returnValue = '';
    goalDialog.showModal();

    // The dials can only be moved once the dialog is on screen.
    const value = current || 0;
    if (isDuration) {
      firstWheel.set(Math.min(99, Math.floor(value / 60)));
      minutesWheel.set(value % 60);
    } else {
      firstWheel.set(Math.min(99, value));
    }
  }

  // Runs however the goal dialog closes. A goal of zero counts as no goal.
  function closeGoal() {
    if (!goalEditing) return;
    const { isDuration, save } = goalEditing;
    goalEditing = null;

    if (goalDialog.returnValue === 'save') {
      const value = isDuration ? firstWheel.get() * 60 + minutesWheel.get() : firstWheel.get();
      save(value > 0 ? value : null);
    } else if (goalDialog.returnValue === 'clear') {
      save(null);
    }
    render();
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

      const added = storage.addType(list.key, input.value);
      if (!added) {
        showToast('That name is empty or already on the list');
        return;
      }
      input.value = '';
      render();
      // Straight away, offer three pictures to choose from for the new one.
      openIcons(list.key, added);
    });
  }

  exportButton.addEventListener('click', exportData);
  importButton.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importData);
  goalDialog.addEventListener('close', closeGoal);
  iconDialog.addEventListener('close', closeIcons);

  return { render };
}
