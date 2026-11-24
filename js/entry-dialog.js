// The dialog for adding, editing, or deleting one entry (a workout or a sweet).
// It is shared: the Exercise, Sweets, and Summary screens all open the same one.

import { timeOfDay, dateInputValue, fromDateTimeInputs } from './format.js';
import { el } from './dom.js';
import { showToast } from './toast.js';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

export function initEntryDialog(storage) {
  const dialog = document.getElementById('entry-dialog');
  const dialogTitle = document.getElementById('entry-title');
  const kindRow = document.getElementById('entry-kind-row');
  const kindSelect = document.getElementById('entry-kind');
  const typeRow = document.getElementById('entry-type-row');
  const typeSelect = document.getElementById('entry-type');
  const nameRow = document.getElementById('entry-name-row');
  const nameInput = document.getElementById('entry-name');
  const nameOptions = document.getElementById('sweet-names');
  const dateInput = document.getElementById('entry-date');
  const timeInput = document.getElementById('entry-time');
  const durationRow = document.getElementById('entry-duration-row');
  const hoursInput = document.getElementById('entry-hours');
  const minutesInput = document.getElementById('entry-minutes');
  const deleteButton = document.getElementById('entry-delete');

  let editing = null; // the entry being edited: { kind, entry }, or null when adding
  let onClosed = null; // the screen that opened the dialog wants to know how it ended

  // Show only the fields that fit the kind of entry. Hidden fields are also
  // disabled, so the browser does not demand a value for them.
  function showFieldsFor(kind) {
    const isExercise = kind === 'exercise';
    typeRow.hidden = !isExercise;
    durationRow.hidden = !isExercise;
    nameRow.hidden = isExercise;
    typeSelect.disabled = !isExercise;
    hoursInput.disabled = !isExercise;
    minutesInput.disabled = !isExercise;
    nameInput.disabled = isExercise;
  }

  function fillChoices(selectedTypeId) {
    // Offer types still in use, plus the entry's own type even if it was removed.
    const types = storage.data.exerciseTypes.filter((t) => !t.archived || t.id === selectedTypeId);
    typeSelect.replaceChildren(...types.map((t) => el('option', { value: t.id, text: t.name })));
    if (selectedTypeId) typeSelect.value = selectedTypeId;

    const sweets = storage.data.sweetTypes.filter((t) => !t.archived);
    nameOptions.replaceChildren(...sweets.map((t) => el('option', { value: t.name })));
  }

  function show(kind, when, whenClosed) {
    onClosed = whenClosed;
    showFieldsFor(kind);
    dateInput.max = dateInputValue(Date.now());
    dateInput.value = dateInputValue(when);
    timeInput.value = timeOfDay(when);
    dialog.returnValue = '';
    dialog.showModal();
  }

  // Open the dialog empty, to add an entry for an earlier time.
  // whenClosed is called afterwards with { action, kind, when }, where action
  // is 'added', 'updated', 'deleted', or null if nothing changed.
  function openAdd(whenClosed) {
    editing = null;
    dialogTitle.textContent = 'Add past entry';
    kindRow.hidden = false;
    kindSelect.value = 'exercise';
    deleteButton.hidden = true;
    fillChoices(null);
    nameInput.value = '';
    hoursInput.value = 0;
    minutesInput.value = 30;
    show('exercise', Date.now(), whenClosed);
  }

  // Open the dialog filled in with an existing entry. kind is 'exercise' or 'sweet'.
  function openEdit(kind, entry, whenClosed) {
    editing = { kind, entry };
    dialogTitle.textContent = kind === 'exercise' ? 'Edit workout' : 'Edit sweet';
    kindRow.hidden = true;
    deleteButton.hidden = false;
    fillChoices(kind === 'exercise' ? entry.typeId : null);

    if (kind === 'exercise') {
      hoursInput.value = Math.floor(entry.durationMs / MS_PER_HOUR);
      minutesInput.value = Math.floor((entry.durationMs % MS_PER_HOUR) / MS_PER_MINUTE);
    } else {
      nameInput.value = entry.name;
    }

    show(kind, kind === 'exercise' ? entry.startedAt : entry.eatenAt, whenClosed);
  }

  // Read the dialog's fields. Returns { values } or { problem: 'why not' }.
  function readDialog(kind) {
    const when = fromDateTimeInputs(dateInput.value, timeInput.value);
    if (when === null) return { problem: 'Pick a date and time' };
    if (when > Date.now()) return { problem: 'That time is in the future' };

    if (kind === 'sweet') {
      const name = nameInput.value.trim();
      return name ? { values: { name, eatenAt: when } } : { problem: 'Enter a name' };
    }

    const hours = Number(hoursInput.value) || 0;
    const minutes = Number(minutesInput.value) || 0;
    let durationMs = hours * MS_PER_HOUR + minutes * MS_PER_MINUTE;

    // Editing without touching the duration keeps the exact measured time.
    if (editing) {
      const old = editing.entry.durationMs;
      const untouched = hours === Math.floor(old / MS_PER_HOUR) && minutes === Math.floor((old % MS_PER_HOUR) / MS_PER_MINUTE);
      if (untouched) durationMs = old;
    }

    if (durationMs <= 0) return { problem: 'Enter how long it took' };
    return { values: { typeId: typeSelect.value, startedAt: when, durationMs } };
  }

  // Runs however the dialog closes: Save, Delete, Cancel, or the back button.
  function closeDialog() {
    const kind = editing ? editing.kind : kindSelect.value;
    const isExercise = kind === 'exercise';
    const outcome = { action: null, kind, when: null };

    if (dialog.returnValue === 'delete' && editing) {
      if (isExercise) storage.deleteSession(editing.entry.id);
      else storage.deleteSweet(editing.entry.id);
      outcome.action = 'deleted';
    } else if (dialog.returnValue === 'save') {
      const result = readDialog(kind);
      if (result.problem) {
        showToast(`Not saved: ${result.problem}`);
      } else {
        if (editing && isExercise) storage.updateSession(editing.entry.id, result.values);
        else if (editing) storage.updateSweet(editing.entry.id, result.values);
        else if (isExercise) storage.addSession(result.values);
        else storage.addSweet(result.values);

        outcome.action = editing ? 'updated' : 'added';
        outcome.when = isExercise ? result.values.startedAt : result.values.eatenAt;
      }
    }

    editing = null;
    const whenClosed = onClosed;
    onClosed = null;
    if (whenClosed) whenClosed(outcome);
  }

  kindSelect.addEventListener('change', () => showFieldsFor(kindSelect.value));
  dialog.addEventListener('close', closeDialog);

  return { openAdd, openEdit };
}
