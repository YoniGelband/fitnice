import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duration, clock, timeOfDay, dayLabel, dayLetter, dateInputValue, fromDateTimeInputs } from '../js/format.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

test('duration shows minutes only under an hour', () => {
  assert.equal(duration(45 * MINUTE), '45m');
  assert.equal(duration(0), '0m');
});

test('duration shows hours and minutes', () => {
  assert.equal(duration(2 * HOUR + 35 * MINUTE), '2h 35m');
  assert.equal(duration(2 * HOUR), '2h');
});

test('duration drops leftover seconds instead of rounding up', () => {
  assert.equal(duration(59 * MINUTE + 59 * SECOND), '59m');
});

test('duration treats a negative length as zero', () => {
  assert.equal(duration(-5 * MINUTE), '0m');
});

test('clock shows hours, minutes and seconds', () => {
  assert.equal(clock(0), '0:00:00');
  assert.equal(clock(45 * MINUTE + 12 * SECOND), '0:45:12');
  assert.equal(clock(11 * HOUR + 5 * MINUTE + 9 * SECOND), '11:05:09');
});

test('timeOfDay shows local 24-hour time', () => {
  assert.equal(timeOfDay(new Date(2026, 10, 23, 8, 10).getTime()), '08:10');
  assert.equal(timeOfDay(new Date(2026, 10, 23, 15, 40).getTime()), '15:40');
});

test('dayLabel and dayLetter name the day', () => {
  const sunday = new Date(2026, 10, 22, 9).getTime();
  assert.equal(dayLabel(sunday), 'Sun 22 Nov');
  assert.equal(dayLetter(sunday), 'S');
});

test('date and time picker text converts both ways', () => {
  const moment = new Date(2026, 0, 5, 8, 10).getTime();
  assert.equal(dateInputValue(moment), '2026-01-05');
  assert.equal(fromDateTimeInputs('2026-01-05', '08:10'), moment);
});

test('fromDateTimeInputs rejects things that are not real dates', () => {
  assert.equal(fromDateTimeInputs('', '08:10'), null);
  assert.equal(fromDateTimeInputs('2026-01-05', ''), null);
  assert.equal(fromDateTimeInputs('2026-02-31', '08:10'), null);
});
