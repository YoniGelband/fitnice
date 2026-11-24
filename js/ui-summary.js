// The Summary screen: one week's totals, a day-by-day chart, the week's
// entries, and the dialog for adding, editing, or deleting an entry.

import { duration, timeOfDay, dayLabel, dayLetter, dateInputValue, fromDateTimeInputs } from './format.js';
import { weekSummary, startOfWeek, addDays, goalProgress } from './stats.js';
import { el } from './dom.js';
import { showToast } from './toast.js';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

export function initSummaryScreen(storage) {
  const weekLabel = document.getElementById('week-label');
  const prevButton = document.getElementById('week-prev');
  const nextButton = document.getElementById('week-next');
  const body = document.getElementById('summary-body');
  const addButton = document.getElementById('add-entry');

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

  let shownWeek = startOfWeek(Date.now()); // the Sunday of the week on screen
  let editing = null; // the entry being edited: { kind, entry }, or null when adding

  function typeName(typeId) {
    const type = storage.data.exerciseTypes.find((t) => t.id === typeId);
    return type ? type.name : 'Workout';
  }

  // A progress bar. "over" colours it as a limit that was passed.
  function bar(progress, isLimit) {
    const state = isLimit ? (progress.over ? 'bar over' : 'bar') : progress.reached ? 'bar reached' : 'bar';
    return el('div', { class: state }, [el('div', { class: 'bar-fill', style: `width: ${Math.round(progress.fraction * 100)}%` })]);
  }

  // One line of the totals: a label, a value, and a bar if there is a goal.
  function totalRow(label, valueText, progress, isLimit = false) {
    const row = el('div', { class: 'total-row' }, [
      el('div', { class: 'total-line' }, [el('span', { text: label }), el('span', { class: 'total-value', text: valueText })]),
    ]);
    if (progress) row.append(bar(progress, isLimit));
    return row;
  }

  function renderExercise(week) {
    const goals = storage.data.goals;
    const rows = [];

    const totalGoal = goals.totalExerciseMinutes;
    rows.push(
      totalRow(
        'All exercise',
        totalGoal ? `${duration(week.exerciseMs)} of ${duration(totalGoal * MS_PER_MINUTE)}` : duration(week.exerciseMs),
        goalProgress(week.exerciseMs, totalGoal ? totalGoal * MS_PER_MINUTE : null),
      ),
    );

    // A type gets a row if it has time this week, or has a goal and is still in use.
    for (const type of storage.data.exerciseTypes) {
      const ms = week.exerciseMsByType[type.id] || 0;
      const goal = type.archived ? null : goals.exerciseMinutes[type.id] || null;
      if (ms === 0 && goal === null) continue;

      rows.push(
        totalRow(
          type.name,
          goal ? `${duration(ms)} of ${duration(goal * MS_PER_MINUTE)}` : duration(ms),
          goalProgress(ms, goal ? goal * MS_PER_MINUTE : null),
        ),
      );
    }

    return el('div', { class: 'card' }, rows);
  }

  // Seven bars, Sunday to Saturday, each as tall as that day's exercise
  // compared with the busiest day of the week.
  function renderChart(week) {
    const busiest = Math.max(...week.days.map((day) => day.exerciseMs));

    const columns = week.days.map((day) => {
      const percent = busiest > 0 ? Math.round((day.exerciseMs / busiest) * 100) : 0;
      return el('div', { class: 'chart-column' }, [
        el('div', { class: 'chart-value', text: day.exerciseMs > 0 ? duration(day.exerciseMs) : '' }),
        el('div', { class: 'chart-track' }, [el('div', { class: 'chart-bar', style: `height: ${percent}%` })]),
        el('div', { class: 'chart-day', text: dayLetter(day.dayStart) }),
      ]);
    });

    return el('div', { class: 'card chart' }, columns);
  }

  function renderSweets(week) {
    const max = storage.data.goals.sweetsMax;
    const text = max ? `${week.sweetsCount} of max ${max}` : String(week.sweetsCount);
    return el('div', { class: 'card' }, [totalRow('Sweets', text, goalProgress(week.sweetsCount, max), true)]);
  }

  // The week's entries grouped by day, most recent day first. Tap one to edit it.
  function renderEntries(week) {
    const groups = [];

    for (const day of [...week.days].reverse()) {
      const rows = [
        ...day.sessions.map((s) => ({ when: s.startedAt, text: `${typeName(s.typeId)} ${duration(s.durationMs)}`, kind: 'exercise', entry: s })),
        ...day.sweets.map((s) => ({ when: s.eatenAt, text: s.name, kind: 'sweet', entry: s })),
      ].sort((a, b) => b.when - a.when);

      if (rows.length === 0) continue;

      groups.push(el('h3', { text: dayLabel(day.dayStart) }));
      groups.push(
        el(
          'ul',
          { class: 'entry-list' },
          rows.map((row) =>
            el('li', {}, [
              el('button', { type: 'button', class: 'entry-button', onclick: () => openEdit(row.kind, row.entry) }, [
                el('span', { text: row.text }),
                el('span', { class: 'entry-time', text: timeOfDay(row.when) }),
              ]),
            ]),
          ),
        ),
      );
    }

    if (groups.length === 0) groups.push(el('p', { class: 'empty', text: 'Nothing logged this week.' }));
    return groups;
  }

  function render() {
    const thisWeek = startOfWeek(Date.now());
    if (shownWeek > thisWeek) shownWeek = thisWeek;

    const range = `${dayLabel(shownWeek)} - ${dayLabel(addDays(shownWeek, 6))}`;
    weekLabel.textContent = shownWeek === thisWeek ? `This week (${range})` : range;
    nextButton.disabled = shownWeek === thisWeek;

    const week = weekSummary(storage.data, shownWeek);
    body.replaceChildren(
      el('h2', { text: 'Exercise' }),
      renderExercise(week),
      renderChart(week),
      el('h2', { text: 'Sweets' }),
      renderSweets(week),
      el('h2', { text: 'Entries' }),
      ...renderEntries(week),
    );
  }

  // ---- the add / edit dialog ----

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

  function openDialog(kind, when) {
    showFieldsFor(kind);
    dateInput.max = dateInputValue(Date.now());
    dateInput.value = dateInputValue(when);
    timeInput.value = timeOfDay(when);
    dialog.returnValue = '';
    dialog.showModal();
  }

  function openAdd() {
    editing = null;
    dialogTitle.textContent = 'Add past entry';
    kindRow.hidden = false;
    kindSelect.value = 'exercise';
    deleteButton.hidden = true;
    fillChoices(null);
    nameInput.value = '';
    hoursInput.value = 0;
    minutesInput.value = 30;
    openDialog('exercise', Date.now());
  }

  function openEdit(kind, entry) {
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

    openDialog(kind, kind === 'exercise' ? entry.startedAt : entry.eatenAt);
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

  function closeDialog() {
    const kind = editing ? editing.kind : kindSelect.value;

    if (dialog.returnValue === 'delete' && editing) {
      if (kind === 'exercise') storage.deleteSession(editing.entry.id);
      else storage.deleteSweet(editing.entry.id);
    } else if (dialog.returnValue === 'save') {
      const result = readDialog(kind);
      if (result.problem) {
        showToast(`Not saved: ${result.problem}`);
      } else if (editing) {
        if (kind === 'exercise') storage.updateSession(editing.entry.id, result.values);
        else storage.updateSweet(editing.entry.id, result.values);
      } else {
        if (kind === 'exercise') storage.addSession(result.values);
        else storage.addSweet(result.values);
        // Jump to the week the new entry landed in, so it is visible.
        shownWeek = startOfWeek(kind === 'exercise' ? result.values.startedAt : result.values.eatenAt);
      }
    }

    editing = null;
    render();
  }

  prevButton.addEventListener('click', () => {
    shownWeek = addDays(shownWeek, -7);
    render();
  });
  nextButton.addEventListener('click', () => {
    shownWeek = addDays(shownWeek, 7);
    render();
  });
  addButton.addEventListener('click', openAdd);
  kindSelect.addEventListener('change', () => showFieldsFor(kindSelect.value));
  dialog.addEventListener('close', closeDialog);

  return { render };
}
