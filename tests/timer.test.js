import { test } from 'node:test';
import assert from 'node:assert/strict';
import { start, pause, resume, elapsedMs, isRunning } from '../js/timer.js';

const MINUTE = 60 * 1000;
const T0 = 1_800_000_000_000; // an arbitrary starting moment

test('a new timer is running with nothing counted yet', () => {
  const timer = start('walking', T0);
  assert.equal(isRunning(timer), true);
  assert.equal(elapsedMs(timer, T0), 0);
  assert.equal(timer.startedAt, T0);
});

test('elapsed time grows while running', () => {
  const timer = start('walking', T0);
  assert.equal(elapsedMs(timer, T0 + 10 * MINUTE), 10 * MINUTE);
});

test('paused time is not counted', () => {
  // Walk 20 minutes, pause 10, walk 10 more: 30 minutes, not 40.
  let timer = start('walking', T0);
  timer = pause(timer, T0 + 20 * MINUTE);
  assert.equal(isRunning(timer), false);
  assert.equal(elapsedMs(timer, T0 + 30 * MINUTE), 20 * MINUTE);

  timer = resume(timer, T0 + 30 * MINUTE);
  assert.equal(elapsedMs(timer, T0 + 40 * MINUTE), 30 * MINUTE);
});

test('several pauses add up correctly', () => {
  let timer = start('running', T0);
  timer = pause(timer, T0 + 5 * MINUTE);
  timer = resume(timer, T0 + 6 * MINUTE);
  timer = pause(timer, T0 + 11 * MINUTE);
  timer = resume(timer, T0 + 20 * MINUTE);
  assert.equal(elapsedMs(timer, T0 + 25 * MINUTE), 15 * MINUTE);
});

test('pausing twice or resuming twice changes nothing', () => {
  const paused = pause(start('walking', T0), T0 + 5 * MINUTE);
  assert.deepEqual(pause(paused, T0 + 50 * MINUTE), paused);

  const running = start('walking', T0);
  assert.deepEqual(resume(running, T0 + 50 * MINUTE), running);
});

test('pause and resume do not change the timer they were given', () => {
  const original = start('walking', T0);
  pause(original, T0 + 5 * MINUTE);
  assert.equal(original.runningSince, T0);
  assert.equal(original.accumulatedMs, 0);
});

test('the day the workout started survives pauses', () => {
  let timer = start('walking', T0);
  timer = resume(pause(timer, T0 + 5 * MINUTE), T0 + 9 * MINUTE);
  assert.equal(timer.startedAt, T0);
});

test('a clock that jumps backwards never produces negative time', () => {
  const timer = start('walking', T0);
  assert.equal(elapsedMs(timer, T0 - 5 * MINUTE), 0);
});
