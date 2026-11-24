import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startOfDay, startOfNextDay, dayEntries, startOfWeek, addDays, weekSummary, goalProgress } from '../js/stats.js';

const MINUTE = 60 * 1000;

// A moment in local time. Months count from 0, so 10 is November.
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();

test('startOfDay is local midnight', () => {
  assert.equal(startOfDay(at(23, 15, 40)), at(23, 0));
  assert.equal(startOfDay(at(23, 0)), at(23, 0));
});

test('startOfNextDay is the following midnight, also across a month end', () => {
  assert.equal(startOfNextDay(at(23, 15, 40)), at(24, 0));
  assert.equal(startOfNextDay(at(30, 12)), new Date(2026, 11, 1).getTime());
});

test('dayEntries picks only that day and adds it up', () => {
  const data = {
    sessions: [
      { id: 'a', typeId: 'walking', startedAt: at(22, 18), durationMs: 50 * MINUTE },
      { id: 'b', typeId: 'walking', startedAt: at(23, 8), durationMs: 30 * MINUTE },
      { id: 'c', typeId: 'running', startedAt: at(23, 19), durationMs: 20 * MINUTE },
      { id: 'd', typeId: 'walking', startedAt: at(24, 0), durationMs: 10 * MINUTE },
    ],
    sweets: [
      { id: 'x', name: 'Cookie', eatenAt: at(22, 23, 59) },
      { id: 'y', name: 'Cake', eatenAt: at(23, 15, 40) },
    ],
  };

  const day = dayEntries(data, at(23, 12));
  assert.deepEqual(day.sessions.map((s) => s.id), ['b', 'c']);
  assert.deepEqual(day.sweets.map((s) => s.id), ['y']);
  assert.equal(day.exerciseMs, 50 * MINUTE);
  assert.equal(day.sweetsCount, 1);
});

test('a workout that runs past midnight counts on the day it started', () => {
  const data = {
    sessions: [{ id: 'a', typeId: 'walking', startedAt: at(23, 23, 50), durationMs: 40 * MINUTE }],
    sweets: [],
  };

  assert.equal(dayEntries(data, at(23, 12)).exerciseMs, 40 * MINUTE);
  assert.equal(dayEntries(data, at(24, 12)).exerciseMs, 0);
});

test('an empty day gives zeros', () => {
  const day = dayEntries({ sessions: [], sweets: [] }, at(23, 12));
  assert.equal(day.exerciseMs, 0);
  assert.equal(day.sweetsCount, 0);
});

// ---- weeks ----
// 22 November 2026 is a Sunday.

test('startOfWeek is the Sunday on or before the day', () => {
  assert.equal(startOfWeek(at(22, 0)), at(22, 0)); // Sunday itself
  assert.equal(startOfWeek(at(25, 15)), at(22, 0)); // Wednesday
  assert.equal(startOfWeek(at(28, 23, 59)), at(22, 0)); // Saturday night
  assert.equal(startOfWeek(at(29, 0)), at(29, 0)); // the next Sunday
});

test('startOfWeek works across a month boundary', () => {
  // 1 December 2026 is a Tuesday; its week began on Sunday 29 November.
  assert.equal(startOfWeek(new Date(2026, 11, 1, 10).getTime()), at(29, 0));
});

test('addDays moves by calendar days', () => {
  assert.equal(addDays(at(22, 15), 6), at(28, 0));
  assert.equal(addDays(at(22, 15), -7), at(15, 0));
});

test('weekSummary totals the week and splits it by day and by type', () => {
  const data = {
    sessions: [
      { id: 'old', typeId: 'walking', startedAt: at(21, 20), durationMs: 99 * MINUTE }, // Saturday before
      { id: 'a', typeId: 'walking', startedAt: at(22, 8), durationMs: 30 * MINUTE },
      { id: 'b', typeId: 'running', startedAt: at(22, 18), durationMs: 20 * MINUTE },
      { id: 'c', typeId: 'walking', startedAt: at(28, 23, 50), durationMs: 40 * MINUTE }, // ends after midnight
      { id: 'new', typeId: 'walking', startedAt: at(29, 0), durationMs: 99 * MINUTE }, // Sunday after
    ],
    sweets: [
      { id: 'x', name: 'Cookie', eatenAt: at(21, 23, 59) },
      { id: 'y', name: 'Cake', eatenAt: at(24, 15) },
      { id: 'z', name: 'Cookie', eatenAt: at(24, 21) },
    ],
  };

  const week = weekSummary(data, at(25, 12));
  assert.equal(week.weekStart, at(22, 0));
  assert.equal(week.days.length, 7);
  assert.equal(week.exerciseMs, 90 * MINUTE);
  assert.deepEqual(week.exerciseMsByType, { walking: 70 * MINUTE, running: 20 * MINUTE });
  assert.equal(week.sweetsCount, 2);
  assert.deepEqual(week.days.map((d) => d.exerciseMs / MINUTE), [50, 0, 0, 0, 0, 0, 40]);
  assert.deepEqual(week.days.map((d) => d.sweetsCount), [0, 0, 2, 0, 0, 0, 0]);
});

test('goalProgress reports how far along a goal is', () => {
  assert.equal(goalProgress(10, null), null);
  assert.deepEqual(goalProgress(75, 150), { fraction: 0.5, reached: false, over: false });
  assert.deepEqual(goalProgress(150, 150), { fraction: 1, reached: true, over: false });
  assert.deepEqual(goalProgress(6, 5), { fraction: 1, reached: true, over: true });
});
