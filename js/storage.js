// The only file that reads or writes saved data.
// Everything the app remembers is one object, saved as text under one key.
// To move the data to a server later, this is the file to replace.

const KEY = 'fitnice.v1';
const CORRUPT_KEY = 'fitnice.v1.corrupt';
const SCHEMA_VERSION = 1;

// What a brand-new install starts with.
export function defaultData() {
  const type = (id, name) => ({ id, name, archived: false });

  return {
    schemaVersion: SCHEMA_VERSION,
    exerciseTypes: [
      type('walking', 'Walking'),
      type('running', 'Running'),
      type('jump-rope', 'Jump rope'),
      type('strength', 'Strength'),
    ],
    sweetTypes: [
      type('chocolate', 'Chocolate'),
      type('cookie', 'Cookie'),
      type('cake', 'Cake'),
      type('ice-cream', 'Ice cream'),
      type('candy', 'Candy'),
      type('pastry', 'Pastry'),
    ],
    sessions: [],
    sweets: [],
    activeTimer: null,
    goals: {
      exerciseMinutes: {},
      totalExerciseMinutes: null,
      sweetsMax: null,
    },
  };
}

// A unique id for a new entry. crypto.randomUUID only exists on secure pages
// (https or localhost), so over a plain home-network address we build one
// from random bytes instead.
function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.length > 0;
const isAmount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isAmountOrNull = (v) => v === null || isAmount(v);

// icon is optional: the picture the user chose. Without it, one is picked from the name.
const isType = (t) =>
  isObject(t) && isText(t.id) && isText(t.name) && typeof t.archived === 'boolean' && (t.icon === undefined || isText(t.icon));
const isSession = (s) => isObject(s) && isText(s.id) && isText(s.typeId) && isAmount(s.startedAt) && isAmount(s.durationMs);
const isSweet = (s) => isObject(s) && isText(s.id) && isText(s.name) && isAmount(s.eatenAt);
const isTimer = (t) =>
  isObject(t) && isText(t.typeId) && isAmount(t.startedAt) && isAmount(t.accumulatedMs) && isAmountOrNull(t.runningSince);

// Check that a loaded object has the shape the app expects.
// Returns null when it is fine, or a short description of the first problem.
export function validate(data) {
  if (!isObject(data) || data.schemaVersion === undefined) return 'not a Fitnice data file';
  if (data.schemaVersion !== SCHEMA_VERSION) return 'made by a different version of Fitnice';

  const lists = [
    ['exerciseTypes', isType],
    ['sweetTypes', isType],
    ['sessions', isSession],
    ['sweets', isSweet],
  ];
  for (const [name, isValid] of lists) {
    if (!Array.isArray(data[name])) return `${name} is missing`;
    if (!data[name].every(isValid)) return `${name} contains a damaged entry`;
  }

  if (data.activeTimer !== null && !isTimer(data.activeTimer)) return 'the running timer is damaged';

  const goals = data.goals;
  if (!isObject(goals) || !isObject(goals.exerciseMinutes)) return 'goals are missing';
  if (!Object.values(goals.exerciseMinutes).every(isAmount)) return 'an exercise goal is damaged';
  if (!isAmountOrNull(goals.totalExerciseMinutes) || !isAmountOrNull(goals.sweetsMax)) return 'a goal is damaged';

  return null;
}

// Build the storage layer on top of a "backend": anything with getItem and
// setItem. In the app that is the browser's localStorage; in tests it is a fake.
export function createStorage(backend) {
  let data = defaultData();

  function save() {
    backend.setItem(KEY, JSON.stringify(data));
  }

  // Read saved data into memory. Called once when the app opens.
  function load() {
    const text = backend.getItem(KEY);
    if (text === null) {
      data = defaultData();
      return data;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not readable at all; handled below.
    }

    if (validate(parsed) !== null) {
      // Keep the unreadable text aside rather than destroying it.
      backend.setItem(CORRUPT_KEY, text);
      data = defaultData();
      return data;
    }

    data = parsed;
    return data;
  }

  // A damaged entry (say, a duration that is not a number) must never be
  // saved: the whole file would fail its check the next time the app opens.
  const entryChecks = { sessions: isSession, sweets: isSweet };

  // Returns the saved entry, or null if the entry is not valid.
  function addTo(list, entry) {
    const saved = { ...entry, id: newId() };
    if (!entryChecks[list](saved)) return null;
    data[list].push(saved);
    save();
    return saved;
  }

  function updateIn(list, id, changes) {
    const entry = data[list].find((e) => e.id === id);
    if (!entry) return null;
    const updated = { ...entry, ...changes, id };
    if (!entryChecks[list](updated)) return null;
    Object.assign(entry, updated);
    save();
    return entry;
  }

  function deleteFrom(list, id) {
    const before = data[list].length;
    data[list] = data[list].filter((e) => e.id !== id);
    if (data[list].length === before) return false;
    save();
    return true;
  }

  const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

  // Add an exercise or sweet type. "list" is 'exerciseTypes' or 'sweetTypes'.
  // Returns the type, or null if the name is empty or already in use.
  function addType(list, name) {
    const clean = name.trim();
    if (!clean) return null;

    const existing = data[list].find((t) => sameName(t.name, clean));
    if (existing) {
      // Re-adding a removed type brings the old one back, with its history.
      if (!existing.archived) return null;
      existing.archived = false;
      save();
      return existing;
    }

    const type = { id: newId(), name: clean, archived: false };
    data[list].push(type);
    save();
    return type;
  }

  function renameType(list, id, name) {
    const clean = name.trim();
    const type = data[list].find((t) => t.id === id);
    if (!type || !clean) return false;
    if (data[list].some((t) => t.id !== id && sameName(t.name, clean))) return false;

    type.name = clean;
    save();
    return true;
  }

  // Removing a type only hides it (archived: true). Its history stays.
  function setTypeArchived(list, id, archived) {
    const type = data[list].find((t) => t.id === id);
    if (!type) return false;
    type.archived = archived;
    save();
    return true;
  }

  // Remember which picture the user chose for a type.
  function setTypeIcon(list, id, icon) {
    const type = data[list].find((t) => t.id === id);
    if (!type || !isText(icon)) return false;
    type.icon = icon;
    save();
    return true;
  }

  // A goal is a positive number, or null for "no goal".
  const cleanGoal = (value) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

  function setExerciseGoal(typeId, minutes) {
    const goal = cleanGoal(minutes);
    if (goal === null) delete data.goals.exerciseMinutes[typeId];
    else data.goals.exerciseMinutes[typeId] = goal;
    save();
  }

  function setTotalExerciseGoal(minutes) {
    data.goals.totalExerciseMinutes = cleanGoal(minutes);
    save();
  }

  function setSweetsMax(count) {
    data.goals.sweetsMax = cleanGoal(count);
    save();
  }

  // Everything, as text, for a backup file.
  function exportText() {
    return JSON.stringify(data, null, 2);
  }

  // Replace everything with the contents of a backup file.
  // Returns null on success, or a short reason the file was refused.
  // A refused file changes nothing.
  function importText(text) {
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return 'not a Fitnice data file';
    }

    const problem = validate(parsed);
    if (problem !== null) return problem;

    data = parsed;
    save();
    return null;
  }

  return {
    load,
    get data() {
      return data;
    },

    addType,
    renameType,
    setTypeArchived,
    setTypeIcon,
    setExerciseGoal,
    setTotalExerciseGoal,
    setSweetsMax,
    exportText,
    importText,

    // session: { typeId, startedAt, durationMs }
    addSession: (session) => addTo('sessions', session),
    updateSession: (id, changes) => updateIn('sessions', id, changes),
    deleteSession: (id) => deleteFrom('sessions', id),

    // sweet: { name, eatenAt }
    addSweet: (sweet) => addTo('sweets', sweet),
    updateSweet: (id, changes) => updateIn('sweets', id, changes),
    deleteSweet: (id) => deleteFrom('sweets', id),

    saveActiveTimer(timer) {
      data.activeTimer = timer;
      save();
    },
    clearActiveTimer() {
      data.activeTimer = null;
      save();
    },
  };
}
