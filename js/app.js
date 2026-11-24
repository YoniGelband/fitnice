// Entry point: loads saved data, sets up the screens, and decides which one shows.

import { createStorage } from './storage.js';
import { initExerciseScreen } from './ui-exercise.js';
import { initSweetsScreen } from './ui-sweets.js';
import { initSummaryScreen } from './ui-summary.js';
import { initSettingsScreen } from './ui-settings.js';
import { initEntryDialog } from './entry-dialog.js';

// The screens reachable from the bottom bar.
const TABS = ['exercise', 'sweets', 'summary', 'settings'];
// The clock screen has no button: it takes over while a workout is on.
const ALL_SCREENS = [...TABS, 'clock'];

const storage = createStorage(window.localStorage);
const bottomBar = document.querySelector('.bottom-bar');

let currentTab = 'exercise';
let screens = {}; // name -> { render } for screens that draw themselves

// Show the right screen for the current state and redraw it.
// While a workout is running or paused, that is always the clock, and the
// bottom bar is hidden so there is nowhere else to go until it is finished.
function refresh() {
  const workoutOn = storage.data.activeTimer !== null;
  const visible = workoutOn ? 'clock' : currentTab;

  for (const name of ALL_SCREENS) {
    document.getElementById(`screen-${name}`).hidden = name !== visible;
  }

  bottomBar.hidden = workoutOn;
  for (const button of bottomBar.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.screen === currentTab);
  }

  // The clock is drawn by the exercise screen's code.
  const drawer = screens[workoutOn ? 'exercise' : currentTab];
  if (drawer) drawer.render();
}

function showTab(name) {
  if (!TABS.includes(name)) return;
  currentTab = name;
  refresh();
}

function init() {
  storage.load();

  // One edit dialog, shared by the three screens that list entries.
  const entryDialog = initEntryDialog(storage);

  screens = {
    exercise: initExerciseScreen(storage, refresh, entryDialog),
    sweets: initSweetsScreen(storage, entryDialog),
    summary: initSummaryScreen(storage, entryDialog),
    settings: initSettingsScreen(storage, refresh),
  };

  for (const button of bottomBar.querySelectorAll('button')) {
    button.addEventListener('click', () => showTab(button.dataset.screen));
  }

  // Coming back to the app: the clock has moved on, and it may be a new day.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });

  refresh();
  protectSavedData();
  registerServiceWorker();
}

// Ask the browser not to clear our saved data when the phone runs low on
// space. The browser decides by itself and may say no; Export is the real backup.
function protectSavedData() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

// The service worker (sw.js) keeps a copy of the app's files so it opens
// without internet. It is skipped on this computer during development, where
// its saved copies would hide fresh edits. Add ?sw to the address to test it locally.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (local && !location.search.includes('sw')) return;

  navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();
