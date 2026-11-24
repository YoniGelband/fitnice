// Pure calculations over saved entries: which day an entry belongs to, and totals.
// Nothing here touches the page or saved data.

// Midnight at the start of the day containing this moment, in the phone's local time.
export function startOfDay(timestamp) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Midnight at the start of the following day.
// Built from the calendar date, not "plus 24 hours", because days on which the
// clocks change are 23 or 25 hours long.
export function startOfNextDay(timestamp) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

// Everything logged on the day containing "timestamp".
// A workout belongs to the day it started, even if it ran past midnight.
export function dayEntries(data, timestamp) {
  const from = startOfDay(timestamp);
  const to = startOfNextDay(timestamp);

  const sessions = data.sessions.filter((s) => s.startedAt >= from && s.startedAt < to);
  const sweets = data.sweets.filter((s) => s.eatenAt >= from && s.eatenAt < to);

  return {
    sessions,
    sweets,
    exerciseMs: sessions.reduce((sum, s) => sum + s.durationMs, 0),
    sweetsCount: sweets.length,
  };
}

// Midnight at the start of the day "count" days after (or before, if negative)
// the day containing this moment. Uses the calendar, so clock changes are safe.
export function addDays(timestamp, count) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count).getTime();
}

// Midnight at the start of the Sunday on or before this moment.
export function startOfWeek(timestamp) {
  const date = new Date(timestamp);
  // getDay() is 0 for Sunday, 1 for Monday ... 6 for Saturday.
  return addDays(timestamp, -date.getDay());
}

// Everything about the Sunday-to-Saturday week containing "timestamp":
// the seven days one by one, plus totals for the whole week.
export function weekSummary(data, timestamp) {
  const weekStart = startOfWeek(timestamp);
  const days = [];
  const exerciseMsByType = {};

  for (let i = 0; i < 7; i++) {
    const dayStart = addDays(weekStart, i);
    const day = dayEntries(data, dayStart);
    days.push({ dayStart, ...day });

    for (const session of day.sessions) {
      exerciseMsByType[session.typeId] = (exerciseMsByType[session.typeId] || 0) + session.durationMs;
    }
  }

  return {
    weekStart,
    days,
    exerciseMsByType,
    exerciseMs: days.reduce((sum, day) => sum + day.exerciseMs, 0),
    sweetsCount: days.reduce((sum, day) => sum + day.sweetsCount, 0),
  };
}

// How far along a goal is. Returns null when there is no goal.
//   fraction  0 to 1, for drawing a progress bar
//   reached   the value is at or past the goal
//   over      the value is past the goal (what matters for a maximum)
export function goalProgress(value, goal) {
  if (goal === null || goal === undefined) return null;

  return {
    fraction: goal > 0 ? Math.min(1, value / goal) : 1,
    reached: value >= goal,
    over: value > goal,
  };
}
