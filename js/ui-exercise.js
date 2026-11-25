// The Exercise screen (pick an exercise, see today's workouts) and the
// clock screen that replaces it while a workout is running or paused.

import * as timer from './timer.js';
import { clock, duration, timeOfDay } from './format.js';
import { dayEntries } from './stats.js';
import { el } from './dom.js';
import { createWheel } from './wheel.js';
import { tile, hero } from './tiles.js';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const TICK_MS = 100;

// The ring is a circle of radius 42 inside a 100 x 100 picture.
const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS; // how long the line is, all the way round
const SVG = 'http://www.w3.org/2000/svg';

// Draw the ring: a grey track, and on top of it the arc that grows.
// Returns the picture and the arc, so the arc can be updated later.
function buildRing() {
  const circle = (cls) => {
    const c = document.createElementNS(SVG, 'circle');
    c.setAttribute('class', cls);
    c.setAttribute('cx', 50);
    c.setAttribute('cy', 50);
    c.setAttribute('r', RING_RADIUS);
    return c;
  };

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'clock-ring');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');

  const arc = circle('ring-arc');
  svg.append(circle('ring-track'), arc);
  return { svg, arc };
}

// onWorkoutChange is called whenever a workout starts or ends, so the app
// can switch between the Exercise screen and the clock screen.
export function initExerciseScreen(storage, onWorkoutChange, entryDialog) {
  const buttonBox = document.getElementById('exercise-buttons');
  const todayLine = document.getElementById('exercise-today-line');
  const todayList = document.getElementById('exercise-today-list');
  const workoutBox = document.getElementById('workout');
  const dialog = document.getElementById('done-dialog');
  const dialogTitle = document.getElementById('done-title');
  const doneTime = document.getElementById('done-time');
  const editButton = document.getElementById('done-edit');
  const wheelsBox = document.getElementById('done-wheels');
  const hoursWheel = createWheel(document.getElementById('done-hours'), 24);
  const minutesWheel = createWheel(document.getElementById('done-minutes'), 60);

  let clockText = null; // the element showing the running time, when a workout is on
  let clockArc = null; // the coloured part of the ring around it
  let tickHandle = null;
  let done = null; // what the Done dialog is confirming: { elapsedMs, wasRunning, edited }

  function typeName(typeId) {
    const type = storage.data.exerciseTypes.find((t) => t.id === typeId);
    return type ? type.name : 'Workout';
  }

  // Redraw only the clock's digits and ring. Runs several times a second.
  function tick() {
    const active = storage.data.activeTimer;
    if (!active || !clockText) return;

    const elapsedMs = timer.elapsedMs(active, Date.now());
    clockText.textContent = clock(elapsedMs);
    // The ring fills once per minute: empty at :00, half way round at :30.
    // A dashed line with one dash of this length draws exactly that much of the circle.
    const drawn = ((elapsedMs % MS_PER_MINUTE) / MS_PER_MINUTE) * RING_LENGTH;
    clockArc.setAttribute('stroke-dasharray', `${drawn} ${RING_LENGTH}`);
  }

  // One button per exercise type the user has not removed.
  function renderButtons() {
    const buttons = storage.data.exerciseTypes
      .filter((type) => !type.archived)
      .map((type) => tile(type.name, () => startWorkout(type.id)));

    buttonBox.replaceChildren(...buttons);
  }

  // Today's total and today's workouts, newest first. Tap one to change or delete it.
  function renderToday() {
    const today = dayEntries(storage.data, Date.now());
    // With a weekly goal, the ring shows progress towards one day's share of it.
    const goal = storage.data.goals.totalExerciseMinutes;
    const dailyMs = goal ? (goal * MS_PER_MINUTE) / 7 : null;
    todayLine.replaceChildren(
      hero(duration(today.exerciseMs), dailyMs ? `of ${duration(dailyMs)} today` : 'today', dailyMs ? today.exerciseMs / dailyMs : null),
    );

    if (today.sessions.length === 0) {
      todayList.replaceChildren(el('li', { class: 'empty', text: 'No workouts yet today.' }));
      return;
    }

    const newestFirst = [...today.sessions].sort((a, b) => b.startedAt - a.startedAt);
    todayList.replaceChildren(
      ...newestFirst.map((s) =>
        el('li', {}, [
          el('button', { type: 'button', class: 'entry-button', onclick: () => entryDialog.openEdit('exercise', s, render) }, [
            el('span', { text: `${typeName(s.typeId)} ${duration(s.durationMs)}` }),
            el('span', { class: 'entry-time', text: timeOfDay(s.startedAt) }),
          ]),
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
      clockArc = null;
      workoutBox.replaceChildren();
      return;
    }

    const running = timer.isRunning(active);
    clockText = el('span', { class: 'clock-time' });
    const ring = buildRing();
    clockArc = ring.arc;
    const clockButton = el('button', { type: 'button', class: running ? 'clock' : 'clock paused', onclick: togglePause }, [
      ring.svg,
      clockText,
      el('span', { class: 'clock-hint', text: running ? 'Tap to pause' : 'Paused - tap to resume' }),
    ]);

    workoutBox.replaceChildren(
      el('div', { class: 'workout-panel' }, [
        el('div', { class: 'workout-name', text: typeName(active.typeId) }),
        clockButton,
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

    done = { elapsedMs, wasRunning: timer.isRunning(active), edited: false };
    storage.saveActiveTimer(timer.pause(active, now));
    renderClock();

    dialogTitle.textContent = `Finish ${typeName(active.typeId)}?`;
    // Show the measured time as plain text. The dials stay hidden until asked for.
    doneTime.textContent = clock(elapsedMs);
    doneTime.hidden = false;
    editButton.hidden = false;
    wheelsBox.hidden = true;
    dialog.returnValue = '';
    dialog.showModal();
  }

  // "Edit time": swap the plain time for two dials, set to the measured time.
  function showWheels() {
    done.edited = true;
    doneTime.hidden = true;
    editButton.hidden = true;
    wheelsBox.hidden = false;
    hoursWheel.set(Math.min(23, Math.floor(done.elapsedMs / MS_PER_HOUR)));
    minutesWheel.set(Math.floor((done.elapsedMs % MS_PER_HOUR) / MS_PER_MINUTE));
  }

  // The duration to save: the exact measured time, unless the user corrected it.
  function confirmedDurationMs() {
    if (!done.edited) return done.elapsedMs;

    const hours = hoursWheel.get();
    const minutes = minutesWheel.get();
    const untouched =
      hours === Math.min(23, Math.floor(done.elapsedMs / MS_PER_HOUR)) && // 23 is the most the dial can show
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

  editButton.addEventListener('click', showWheels);
  dialog.addEventListener('close', closeDone);

  return { render };
}
