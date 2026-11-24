// Pure timer arithmetic. A timer is a small plain object:
//
//   typeId         which exercise is being timed
//   startedAt      when the workout began (decides which day it belongs to)
//   accumulatedMs  time already counted from earlier running stretches
//   runningSince   when the current running stretch began, or null while paused
//
// All times are milliseconds since 1970, which is what Date.now() returns.
// Every function takes "now" as an input instead of reading the clock itself,
// and returns a new object instead of changing the one it was given.

export function start(typeId, now) {
  return { typeId, startedAt: now, accumulatedMs: 0, runningSince: now };
}

export function isRunning(timer) {
  return timer.runningSince !== null;
}

// Total counted time so far. Paused time is never included.
export function elapsedMs(timer, now) {
  if (!isRunning(timer)) return timer.accumulatedMs;
  return timer.accumulatedMs + Math.max(0, now - timer.runningSince);
}

// Bank the current running stretch and stop counting.
export function pause(timer, now) {
  if (!isRunning(timer)) return timer;
  return { ...timer, accumulatedMs: elapsedMs(timer, now), runningSince: null };
}

// Begin a new running stretch from now.
export function resume(timer, now) {
  if (isRunning(timer)) return timer;
  return { ...timer, runningSince: now };
}
