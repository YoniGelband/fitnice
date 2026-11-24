// The Summary screen: one week's totals, a day-by-day chart, and the week's
// entries. Tapping an entry opens the shared entry dialog (entry-dialog.js).

import { duration, timeOfDay, dayLabel, dayLetter } from './format.js';
import { weekSummary, startOfWeek, addDays, goalProgress } from './stats.js';
import { el } from './dom.js';

const MS_PER_MINUTE = 60 * 1000;

export function initSummaryScreen(storage, entryDialog) {
  const weekLabel = document.getElementById('week-label');
  const prevButton = document.getElementById('week-prev');
  const nextButton = document.getElementById('week-next');
  const body = document.getElementById('summary-body');
  const addButton = document.getElementById('add-entry');

  let shownWeek = startOfWeek(Date.now()); // the Sunday of the week on screen

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
              el('button', { type: 'button', class: 'entry-button', onclick: () => entryDialog.openEdit(row.kind, row.entry, afterDialog) }, [
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

  // Runs when the entry dialog closes.
  function afterDialog(outcome) {
    // Jump to the week a new entry landed in, so it is visible.
    if (outcome.action === 'added') shownWeek = startOfWeek(outcome.when);
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
  addButton.addEventListener('click', () => entryDialog.openAdd(afterDialog));

  return { render };
}
