// The Exercise screen (pick an exercise, see today's workouts) and the
// clock screen that replaces it while a workout is running or paused.

import * as timer from './timer.js';
import { clock, duration, timeOfDay } from './format.js';
import { dayEntries } from './stats.js';
import { el } from './dom.js';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const TICK_MS = 250;

// onWorkoutChange is called whenever a workout starts or ends, so the app
// can switch between the Exercise screen and the clock screen.
export function initExerciseScreen(storage, onWorkoutChange) {
  const buttonBox = document.getElementById('exercise-buttons');
  const todayLine = document.getElementById('exercise-today-line');
  const todayList = document.getElementById('exercise-today-list');
  const workoutBox = document.getElementById('workout');
  const dialog = document.getElementById('done-dialog');
  const dialogTitle = document.getElementById('done-title');
  const hoursInput = document.getElementById('done-hours');
  const minutesInput = document.getElementById('done-minutes');

  let clockText = null; // the element showing the running time, when a workout is on
  let tickHandle = null;
  let done = null; // what the Done dialog is confirming: { elapsedMs, wasRunning }

  function typeName(typeId) {
    const type = storage.data.exerciseTypes.find((t) => t.id === typeId);
    return type ? type.name : 'Workout';
  }

  // Redraw only the clock's digits. Runs several times a second.
  function tick() {
    const active = storage.data.activeTimer;
    if (active && clockText) clockText.textContent = clock(timer.elapsedMs(active, Date.now()));
  }

  // One button per exercise type the user has not removed.
  function renderButtons() {
    const buttons = storage.data.exerciseTypes
      .filter((type) => !type.archived)
      .map((type) => el('button', { type: 'button', class: 'big-button', text: type.name, onclick: () => startWorkout(type.id) }));

    buttonBox.replaceChildren(...buttons);
  }

  // Today's total and today's workouts, newest first.
  function renderToday() {
    const today = dayEntries(storage.data, Date.now());
    todayLine.textContent = `Today: ${duration(today.exerciseMs)}`;

    if (today.sessions.length === 0) {
      todayList.replaceChildren(el('li', { class: 'empty', text: 'No workouts yet today.' }));
      return;
    }

    const newestFirst = [...today.sessions].sort((a, b) => b.startedAt - a.startedAt);
    todayList.replaceChildren(
      ...newestFirst.map((s) =>
        el('li', {}, [
          el('span', { text: `${typeName(s.typeId)} ${duration(s.durationMs)}` }),
          el('span', { class: 'entry-time', text: timeOfDay(s.startedAt) }),
        ]),
      ),
    );
  }

  // The clock screen's contents.
  function renderClock() {
    const active = storage.data.activeTimer;
    clearInterval(tickHandle);

    if (!active) {
      clockText = null;
      workoutBox.replaceChildren();
      return;
    }

    const running = timer.isRunning(active);
    clockText = el('span', { class: 'clock-time' });

    workoutBox.replaceChildren(
      el('div', { class: 'workout-panel' }, [
        el('div', { class: 'workout-name', text: typeName(active.typeId) }),
        el('button', { type: 'button', class: running ? 'clock' : 'clock paused', onclick: togglePause }, [
          clockText,
          el('span', { class: 'clock-hint', text: running ? 'Tap to pause' : 'Paused - tap to resume' }),
        ]),
        el('button', { type: 'button', class: 'done-button', text: 'Done', onclick: openDone }),
      ]),
    );

    tick();
    if (running) tickHandle = setInterval(tick, TICK_MS);
  }

  function render() {
    renderButtons();
    renderToday();
    renderClock();
  }

  function startWorkout(typeId) {
    if (storage.data.activeTimer) return; // only one workout at a time
    storage.saveActiveTimer(timer.start(typeId, Date.now()));
    onWorkoutChange();
  }

  function togglePause() {
    const active = storage.data.activeTimer;
    const now = Date.now();
    storage.saveActiveTimer(timer.isRunning(active) ? timer.pause(active, now) : timer.resume(active, now));
    renderClock();
  }

  // Done freezes the clock and asks what to do with the workout.
  function openDone() {
    const active = storage.data.activeTimer;
    const now = Date.now();
    const elapsedMs = timer.elapsedMs(active, now);

    done = { elapsedMs, wasRunning: timer.isRunning(active) };
    storage.saveActiveTimer(timer.pause(active, now));
    renderClock();

    dialogTitle.textContent = `Finish ${typeName(active.typeId)}?`;
    hoursInput.value = Math.floor(elapsedMs / MS_PER_HOUR);
    minutesInput.value = Math.floor((elapsedMs % MS_PER_HOUR) / MS_PER_MINUTE);
    dialog.returnValue = '';
    dialog.showModal();
  }

  // The duration to save: the exact measured time, unless the user corrected it.
  function confirmedDurationMs() {
    const hours = Number(hoursInput.value) || 0;
    const minutes = Number(minutesInput.value) || 0;
    const untouched =
      hours === Math.floor(done.elapsedMs / MS_PER_HOUR) &&
      minutes === Math.floor((done.elapsedMs % MS_PER_HOUR) / MS_PER_MINUTE);

    return untouched ? done.elapsedMs : hours * MS_PER_HOUR + minutes * MS_PER_MINUTE;
  }

  // Runs however the dialog closes: Save, Discard, Keep going, or the back button.
  function closeDone() {
    const active = storage.data.activeTimer;
    if (!active || !done) return;

    if (dialog.returnValue === 'save') {
      // A workout corrected to 0h 0m has nothing to record, so it is dropped.
      const durationMs = confirmedDurationMs();
      if (durationMs > 0) storage.addSession({ typeId: active.typeId, startedAt: active.startedAt, durationMs });
      storage.clearActiveTimer();
    } else if (dialog.returnValue === 'discard') {
      storage.clearActiveTimer();
    } else if (done.wasRunning) {
      storage.saveActiveTimer(timer.resume(active, Date.now()));
    }

    done = null;
    onWorkoutChange();
  }

  dialog.addEventListener('close', closeDone);

  return { render };
}
