// Pure text formatting: turns raw numbers into what the user reads.
// Nothing here touches the page or saved data.

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;

function pad2(n) {
  return String(n).padStart(2, '0');
}

// A length of time for summaries and goals: "45m", "2h", "2h 35m".
export function duration(ms) {
  const totalMinutes = Math.floor(Math.max(0, ms) / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// The running clock, with seconds: "0:45:12".
export function clock(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
}

// The time of day an entry happened, in the phone's local time: "08:10".
export function timeOfDay(timestamp) {
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A day for headings: "Sun 22 Nov".
export function dayLabel(timestamp) {
  const date = new Date(timestamp);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

// The single letter under each bar of the week chart.
export function dayLetter(timestamp) {
  return DAY_NAMES[new Date(timestamp).getDay()][0];
}

// The text a date picker expects: "2026-11-22".
export function dateInputValue(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Turn a date picker's text ("2026-11-22") and a time picker's text ("08:10")
// back into a moment. Returns null if either is not a real date or time.
export function fromDateTimeInputs(dateText, timeText) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(timeText);
  if (!dateMatch || !timeMatch) return null;

  const [year, month, day] = dateMatch.slice(1).map(Number);
  const [hours, minutes] = timeMatch.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);

  // JavaScript quietly turns "31 February" into "3 March". Reject that.
  const unchanged = date.getMonth() === month - 1 && date.getDate() === day && date.getHours() === hours;
  return unchanged ? date.getTime() : null;
}
