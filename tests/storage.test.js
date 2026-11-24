import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, defaultData, validate } from '../js/storage.js';

const KEY = 'fitnice.v1';
const CORRUPT_KEY = 'fitnice.v1.corrupt';

// Stands in for the browser's localStorage.
function fakeBackend(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

test('default data is valid and has the starting lists', () => {
  const data = defaultData();
  assert.equal(validate(data), null);
  assert.deepEqual(data.exerciseTypes.map((t) => t.name), ['Walking', 'Running', 'Jump rope', 'Strength']);
  assert.equal(data.sweetTypes.length, 6);
});

test('validate rejects things that are not Fitnice data', () => {
  assert.notEqual(validate(null), null);
  assert.notEqual(validate('hello'), null);
  assert.notEqual(validate([]), null);
  assert.notEqual(validate({}), null);
  assert.notEqual(validate({ ...defaultData(), schemaVersion: 2 }), null);
});

test('validate rejects damaged entries', () => {
  const badSession = defaultData();
  badSession.sessions.push({ id: 'a', typeId: 'walking', startedAt: 1, durationMs: -5 });
  assert.notEqual(validate(badSession), null);

  const badSweet = defaultData();
  badSweet.sweets.push({ id: 'a', name: '', eatenAt: 1 });
  assert.notEqual(validate(badSweet), null);

  const badTimer = defaultData();
  badTimer.activeTimer = { typeId: 'walking' };
  assert.notEqual(validate(badTimer), null);

  const badGoal = defaultData();
  badGoal.goals.sweetsMax = 'five';
  assert.notEqual(validate(badGoal), null);
});

test('a first launch loads the defaults', () => {
  const storage = createStorage(fakeBackend());
  assert.deepEqual(storage.load(), defaultData());
});

test('entries survive closing and reopening the app', () => {
  const backend = fakeBackend();

  const first = createStorage(backend);
  first.load();
  const session = first.addSession({ typeId: 'walking', startedAt: 1000, durationMs: 60000 });
  const sweet = first.addSweet({ name: 'Cookie', eatenAt: 2000 });

  // A new storage on the same backend is what a fresh launch looks like.
  const second = createStorage(backend);
  const data = second.load();
  assert.deepEqual(data.sessions, [session]);
  assert.deepEqual(data.sweets, [sweet]);
});

test('each entry gets its own id', () => {
  const storage = createStorage(fakeBackend());
  storage.load();
  const a = storage.addSweet({ name: 'Cookie', eatenAt: 1 });
  const b = storage.addSweet({ name: 'Cookie', eatenAt: 1 });
  assert.notEqual(a.id, b.id);
});

test('an entry can be edited and deleted', () => {
  const backend = fakeBackend();
  const storage = createStorage(backend);
  storage.load();
  const session = storage.addSession({ typeId: 'walking', startedAt: 1000, durationMs: 60000 });

  storage.updateSession(session.id, { durationMs: 120000 });
  assert.equal(createStorage(backend).load().sessions[0].durationMs, 120000);

  assert.equal(storage.deleteSession(session.id), true);
  assert.deepEqual(createStorage(backend).load().sessions, []);
});

test('editing cannot change an entry id, and unknown ids are ignored', () => {
  const storage = createStorage(fakeBackend());
  storage.load();
  const sweet = storage.addSweet({ name: 'Cookie', eatenAt: 1 });

  storage.updateSweet(sweet.id, { id: 'hijacked', name: 'Cake' });
  assert.equal(storage.data.sweets[0].id, sweet.id);
  assert.equal(storage.data.sweets[0].name, 'Cake');

  assert.equal(storage.updateSweet('no-such-id', { name: 'x' }), null);
  assert.equal(storage.deleteSweet('no-such-id'), false);
});

test('a running timer survives closing and reopening the app', () => {
  const backend = fakeBackend();
  const storage = createStorage(backend);
  storage.load();
  const timer = { typeId: 'walking', startedAt: 1000, accumulatedMs: 0, runningSince: 1000 };

  storage.saveActiveTimer(timer);
  assert.deepEqual(createStorage(backend).load().activeTimer, timer);

  storage.clearActiveTimer();
  assert.equal(createStorage(backend).load().activeTimer, null);
});

test('unreadable saved data is set aside, not destroyed', () => {
  for (const broken of ['{not json', JSON.stringify({ schemaVersion: 1 })]) {
    const backend = fakeBackend({ [KEY]: broken });
    const storage = createStorage(backend);

    assert.deepEqual(storage.load(), defaultData());
    assert.equal(backend.getItem(CORRUPT_KEY), broken);
  }
});

// ---- types, goals, export and import ----

function freshStorage() {
  const backend = fakeBackend();
  const storage = createStorage(backend);
  storage.load();
  return { storage, backend };
}

test('a type can be added, and the same name cannot be added twice', () => {
  const { storage, backend } = freshStorage();

  const added = storage.addType('exerciseTypes', '  Swimming ');
  assert.equal(added.name, 'Swimming');
  assert.equal(storage.addType('exerciseTypes', 'swimming'), null);
  assert.equal(storage.addType('exerciseTypes', '   '), null);
  assert.equal(createStorage(backend).load().exerciseTypes.length, 5);
});

test('a type can be renamed, but not to a name already in use', () => {
  const { storage } = freshStorage();

  assert.equal(storage.renameType('exerciseTypes', 'walking', 'Hiking'), true);
  assert.equal(storage.data.exerciseTypes[0].name, 'Hiking');
  assert.equal(storage.renameType('exerciseTypes', 'walking', 'Running'), false);
  assert.equal(storage.renameType('exerciseTypes', 'walking', ''), false);
  assert.equal(storage.renameType('exerciseTypes', 'no-such-id', 'X'), false);
});

test('removing a type hides it but keeps its history, and re-adding brings it back', () => {
  const { storage } = freshStorage();
  storage.addSession({ typeId: 'walking', startedAt: 1000, durationMs: 60000 });

  storage.setTypeArchived('exerciseTypes', 'walking', true);
  assert.equal(storage.data.exerciseTypes.find((t) => t.id === 'walking').archived, true);
  assert.equal(storage.data.sessions.length, 1);

  const back = storage.addType('exerciseTypes', 'Walking');
  assert.equal(back.id, 'walking');
  assert.equal(back.archived, false);
  assert.equal(storage.data.exerciseTypes.length, 4);
});

test('goals can be set and cleared', () => {
  const { storage, backend } = freshStorage();

  storage.setExerciseGoal('walking', 150);
  storage.setTotalExerciseGoal(300);
  storage.setSweetsMax(5);
  assert.deepEqual(createStorage(backend).load().goals, {
    exerciseMinutes: { walking: 150 },
    totalExerciseMinutes: 300,
    sweetsMax: 5,
  });

  storage.setExerciseGoal('walking', null);
  storage.setTotalExerciseGoal(0);
  storage.setSweetsMax(NaN);
  assert.deepEqual(storage.data.goals, { exerciseMinutes: {}, totalExerciseMinutes: null, sweetsMax: null });
});

test('an export can be imported into a fresh install', () => {
  const { storage } = freshStorage();
  storage.addSession({ typeId: 'walking', startedAt: 1000, durationMs: 60000 });
  storage.addSweet({ name: 'Cookie', eatenAt: 2000 });
  storage.setSweetsMax(5);
  const backup = storage.exportText();

  const { storage: other, backend } = freshStorage();
  assert.equal(other.importText(backup), null);
  assert.deepEqual(other.data, storage.data);
  assert.deepEqual(createStorage(backend).load(), storage.data);
});

test('a bad import is refused and changes nothing', () => {
  const { storage } = freshStorage();
  storage.addSweet({ name: 'Cookie', eatenAt: 2000 });
  const before = storage.exportText();

  assert.notEqual(storage.importText('hello'), null);
  assert.notEqual(storage.importText('{"schemaVersion":1}'), null);
  assert.equal(storage.exportText(), before);
});

test('a damaged entry is refused instead of being saved', () => {
  const { storage, backend } = freshStorage();
  const session = storage.addSession({ typeId: 'walking', startedAt: 1000, durationMs: 60000 });
  const before = backend.getItem(KEY);

  assert.equal(storage.addSession({ typeId: 'walking', startedAt: 1000, durationMs: NaN }), null);
  assert.equal(storage.updateSession(session.id, { durationMs: NaN }), null);
  assert.equal(storage.addSweet({ name: '', eatenAt: 2000 }), null);
  assert.equal(backend.getItem(KEY), before);
  assert.equal(storage.data.sessions[0].durationMs, 60000);
});

test('a new entry always gets its own id', () => {
  const { storage } = freshStorage();
  const sweet = storage.addSweet({ id: 'mine', name: 'Cookie', eatenAt: 2000 });
  assert.notEqual(sweet.id, 'mine');
});

test('ids still work where crypto.randomUUID does not exist', () => {
  const real = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    value: { getRandomValues: (bytes) => real.getRandomValues(bytes) },
    configurable: true,
  });
  try {
    const { storage } = freshStorage();
    const a = storage.addSweet({ name: 'Cookie', eatenAt: 2000 });
    const b = storage.addSweet({ name: 'Cake', eatenAt: 3000 });
    assert.match(a.id, /^[0-9a-f]{32}$/);
    assert.notEqual(a.id, b.id);
    assert.equal(validate(storage.data), null);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true });
  }
});
