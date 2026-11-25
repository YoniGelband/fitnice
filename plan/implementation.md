# Fitnice - Implementation Plan

Last updated: 2026-11-24. Milestones 1 to 7 are built and checked in a browser. Milestone 8 is deployed: the app is live at https://yonigelband.github.io/fitnice/ and the service worker was confirmed there (18 files kept, page reloads while offline, checked in desktop Chromium). It has not yet been installed or tried on the phone. The code map below matches the real files as of this date.

To run locally: `.venvScriptspython.exe -m http.server 8010 --bind 127.0.0.1`, then open `http://127.0.0.1:8010` (port 8000 is used by another project on this machine). To test: `node --test`.

## User flow

The bottom bar has four tabs: Exercise, Sweets, Summary, Settings. Exercise and Sweets are separate pages (owner decision 2026-11-24; the original plan had them together on one "Log" screen).

### Exercise screen (opens by default)
1. A "today" line at the top: total exercise time today.
2. Exercise buttons (walking, running, jump rope, strength, plus any added).
3. Under the buttons: today's workouts, newest first ("Walking 32m", "08:10").
4. Tap an exercise: the app switches to the clock screen.

### Clock screen (only while a workout is running or paused)
1. Replaces every other screen, and the bottom bar is hidden, so the app stays here until the workout is finished (owner decision 2026-11-24). Reopening the app mid-workout lands here too.
2. The clock starts at `0:00:00` and counts up.
3. Tap the clock: it pauses, the ring turns grey, the time blinks, and it shows "Paused". Tap again: it resumes.
4. Tap **Done**: a confirmation shows the duration. It can be corrected. **Save** stores it, **Discard** throws it away, **Keep going** returns to the clock as it was.
5. After Save or Discard the app returns to the Exercise screen.
6. Only one workout at a time. This now follows from the design: the exercise buttons cannot be reached during a workout.
7. Planned (Milestone 9): if the app opens and a timer has been running more than 3 hours, it asks "Still going?" with options to keep going or finish (with an editable duration).

### Sweets screen
1. A "today" line at the top: sweets count today.
2. Sweet buttons (chocolate, cookie, cake, ice cream, candy, pastry, Other). One tap logs it now. A message "Logged: Cookie" with Undo shows for a few seconds. "Other" asks for a name first.
3. Under the buttons: today's sweets, newest first.
4. Sweets cannot be logged while a workout is on, because the clock screen is the only screen then.

### Summary screen
1. Shows the current week (Sunday to Saturday), with arrows to earlier weeks.
2. Time per exercise type, with a progress bar where a goal is set.
3. Total exercise time, with a progress bar if a total goal is set.
4. A bar chart of exercise time per day.
5. Sweets total, with a progress bar against the maximum if set.
6. Sweets per day, listed by name.
7. Tapping an entry opens it to edit or delete. An "Add past entry" button adds a workout or sweet by hand for any date.

### Settings screen
1. Exercise types: add, rename, remove.
2. Sweet list: add, rename, remove.
3. Goals: per exercise type, total exercise, sweets maximum. All optional, entered as hours and minutes (sweets as a count).
4. Export (download a backup file) and Import (restore from one).

Removing a type hides it from the buttons. Its past entries stay in history and summaries.

## Rules agreed

- Durations show as hours and minutes ("2h 35m", or "45m" under an hour). The running clock also shows seconds.
- Paused time is never counted.
- A session belongs to the day and week in which it **started**, even if it ends after midnight.
- Weeks start Sunday 00:00 local time.
- A sweet entry counts as one. Three cookies is three taps.

## Architecture

Everything runs in the browser on the phone. There is no server.

```
 Screens (ui-exercise, ui-sweets, ui-summary,   <- draw the page, react to taps
          ui-settings)
        |                 |
        v                 v
   timer.js           stats.js                  <- pure logic: no page, no storage
   format.js          (week totals, goals)
        |                 |
        +--------+--------+
                 v
            storage.js                          <- the ONLY file that touches localStorage
                 |
                 v
           localStorage (on the phone)

 sw.js keeps a copy of all files so the app opens offline.
```

Two deliberate boundaries:

1. **Only `storage.js` reads or writes saved data.** This is the "scale later" seam: swapping in a server means rewriting this one file.
2. **`timer.js`, `stats.js`, and `format.js` are pure logic.** They take values in and return values out, never touching the page or storage. That makes them testable on the computer without a phone or browser.

### How the timer stays correct

A web page is frozen when the phone locks, so counting ticks would lose time. Instead we store timestamps and do arithmetic:

- `accumulatedMs`: time already counted from earlier running stretches.
- `runningSince`: when the current running stretch began, or `null` while paused.
- Elapsed time = `accumulatedMs` + (now - `runningSince`) if running, otherwise just `accumulatedMs`.

Pause adds the current stretch into `accumulatedMs` and clears `runningSince`. Resume sets `runningSince` to now. The on-screen clock simply recalculates this ten times a second while the app is open, so it always looks like it never stopped.

## Code map

The project is functions in modules, not classes.

**End to end:** the app loads, reads all saved data, and draws the Exercise screen (or the clock screen if a workout is on). Taps change the data, the change is saved immediately, and the screen redraws from the saved data. The Summary screen calculates its numbers fresh from the entries every time it is shown; no totals are stored.

**One workout, traced:** `app.js` `init` calls `storage.load()` and `refresh()` -> `ui-exercise.js` draws buttons -> tap "Walking" -> `startWorkout` -> `timer.start(typeId, now)` -> `storage.saveActiveTimer()` -> `app.js` `refresh()` sees an active timer, shows the clock screen and hides the bottom bar -> ten times a second `tick` calls `timer.elapsedMs()` and `format.clock()`, and moves the ring around the clock -> tap Done -> `openDone` pauses the timer and shows the dialog -> Save -> `closeDone` -> `storage.addSession()` and `storage.clearActiveTimer()` -> `refresh()` shows the Exercise screen again. Later, `ui-summary.js` calls `stats.weekSummary(data, timestamp)` and draws the result.

| File | Responsibility | Key functions |
| --- | --- | --- |
| `index.html` | The single page: five screen containers (exercise, clock, sweets, summary, settings), the four-button bottom bar, and the three dialogs (finish workout, other sweet, add/edit entry). | - |
| `styles.css` | All styling, large tap targets, light and dark themes. | - |
| `manifest.webmanifest` | App name, icons, colours, so Android can install it. | - |
| `sw.js` | Service worker: keeps a copy of the app's files for offline use. Answers from the kept copy at once and fetches a newer copy in the background, so an update appears the second time the app is opened and no version number needs bumping. Not registered on `localhost`/`127.0.0.1` unless the address has `?sw`, so development edits are never hidden by old copies. | install, activate, fetch handlers; the `FILES` list |
| `js/app.js` | Entry point. Loads data, owns the bottom bar, and decides which screen shows. `refresh` shows the clock screen and hides the bar whenever a workout is active; otherwise it shows the chosen tab and asks that screen to redraw. Also requests persistent storage and registers the service worker. | `init`, `refresh`, `showTab`, `protectSavedData`, `registerServiceWorker` |
| `js/storage.js` | The only code that touches `localStorage`. Loads, saves, and validates data. `createStorage(backend)` returns the storage object; the app passes `localStorage`, tests pass a fake. Saved data that cannot be read is copied to the key `fitnice.v1.corrupt` and the app starts from defaults. | `defaultData`, `validate`, `createStorage` -> `load`, `data`, `addSession`, `updateSession`, `deleteSession`, `addSweet`, `updateSweet`, `deleteSweet`, `saveActiveTimer`, `clearActiveTimer`, `addType`, `renameType`, `setTypeArchived`, `setExerciseGoal`, `setTotalExerciseGoal`, `setSweetsMax`, `exportText`, `importText` |
| `js/timer.js` | Pure timer arithmetic. | `start`, `pause`, `resume`, `elapsedMs`, `isRunning` |
| `js/stats.js` | Pure calculations over entries. | `startOfDay`, `startOfNextDay`, `addDays`, `startOfWeek`, `dayEntries`, `weekSummary`, `goalProgress` |
| `js/format.js` | Pure text formatting and date-picker conversion. | `duration` ("2h 35m"), `clock` ("0:45:12"), `timeOfDay`, `dayLabel` ("Sun 22 Nov"), `dayLetter`, `dateInputValue`, `fromDateTimeInputs` |
| `js/ui-exercise.js` | Draws the Exercise screen (buttons, today's workouts) and the clock screen, and handles the Done dialog (whose HTML lives in `index.html`). Tells `app.js` when a workout starts or ends through the `onWorkoutChange` callback. | `initExerciseScreen(storage, onWorkoutChange, entryDialog)` -> `{ render }`, containing `startWorkout`, `togglePause`, `openDone`, `closeDone`, `tick` |
| `js/ui-sweets.js` | Draws the Sweets screen: buttons, the Other dialog, Undo, today's sweets. | `initSweetsScreen(storage, entryDialog)` -> `{ render }`, containing `logSweet`, `openOther`, `closeOther` |
| `js/dom.js` | Helper for building page elements. Always sets text with `textContent`, which is the app's protection against typed names being run as HTML. | `el` |
| `js/toast.js` | Short self-hiding message above the bottom bar, with an optional action button (used for "Undo" in Milestone 5). | `showToast` |
| `js/ui-summary.js` | Draws the Summary screen for one week. Remembers which week is on screen. Opens the shared entry dialog to add or edit entries. | `initSummaryScreen(storage, entryDialog)` -> `{ render }`, containing `renderExercise`, `renderChart`, `renderSweets`, `renderEntries`, `afterDialog` |
| `js/entry-dialog.js` | The one dialog for adding, editing (type or name, date, time, duration), or deleting an entry (HTML in `index.html`). Shared by the Exercise, Sweets, and Summary screens: `app.js` creates it once and hands it to each. | `initEntryDialog(storage)` -> `{ openAdd(whenClosed), openEdit(kind, entry, whenClosed) }`; `whenClosed` receives `{ action, kind, when }` |
| `js/wheel.js` | A "dial": a scrolling column of numbers that comes to rest with one in the middle, like a phone's alarm time picker. Used for hours and minutes in the finish-workout dialog. Remembers its value itself, because a closed dialog's contents read as scrolled to 0. | `createWheel(box, count)` -> `{ get(), set(n) }` |
| `js/tiles.js` | The app's own line-drawn icons, picked by words in a name (a name that matches none shows its first letter), and the pieces built from them: round icon tiles and the "hero" ring with today's total. | `iconFor(name)`, `tile(name, onclick)`, `plusTile(label, onclick)`, `hero(valueText, label, fraction)` |
| `js/ui-settings.js` | Draws the Settings screen: one card per type list (icon, name you tap to rename, x to remove with Undo, "+ Add" row), goal rows that open the goal dialog with dials, and Export/Import. | `initSettingsScreen(storage, onDataReplaced)` -> `{ render }`, containing `renderList`, `goalRow`, `renderGoals`, `openGoal`, `closeGoal`, `exportData`, `importData` |
| `icons/` | `icon.svg`, `icon-192.png`, `icon-512.png`: a placeholder icon, to be replaced in the design pass. | - |
| `tests/*.test.js` | 49 tests: `format`, `timer`, `stats`, `storage`, and `sw` (the service worker's file list matches the real files). | - |

**Dependency direction:** `app.js` creates the storage object and hands it to each `ui-*` file; the `ui-*` files import `timer`, `stats`, `format`, `dom`, and `toast`, never `storage.js` directly. The pure files import nothing from the UI or storage. `storage.js` imports nothing from the UI. Nothing imports `app.js`.

## Data model

One JSON object saved under a single `localStorage` key (`fitnice.v1`).

```
{
  schemaVersion: 1,
  exerciseTypes: [ { id, name, archived } ],
  sweetTypes:    [ { id, name, archived } ],
  sessions:      [ { id, typeId, startedAt, durationMs } ],
  sweets:        [ { id, name, eatenAt } ],
  activeTimer:   null | { typeId, startedAt, accumulatedMs, runningSince },
  goals: {
    exerciseMinutes: { <typeId>: minutes },   // only for types with a goal
    totalExerciseMinutes: null | minutes,
    sweetsMax: null | count
  }
}
```

- Times are stored as milliseconds since 1970 (what `Date.now()` returns), and turned into local days and weeks only when calculating.
- Sweets store the **name** at the time of logging, so renaming or removing a sweet type never changes history.
- Sessions store `typeId`, and removed types are only marked `archived`, so their name is still available for history.
- `schemaVersion` lets a future version recognise and upgrade old data and old export files.

## Confirmed technical facts

- 2026-11-23: Project folder contains only a Python `.venv`. No source code, no git repository.
- 2026-11-23: Node v24.19.0, git 2.45.1, GitHub CLI 2.97.0 are installed. GitHub CLI is not logged in.
- 2026-11-23 (from Chrome for Developers and web.dev, not tested on the phone yet): Chrome on Android installs a web app with a manifest containing a name, 192px and 512px icons, `start_url`, and a standalone display mode; a service worker is no longer required for installing, only for offline use.
- 2026-11-23 (web.dev): browser storage is "best effort" by default and can be cleared under storage pressure; `navigator.storage.persist()` asks for it to be protected, and Chrome grants or denies silently.

## Security approach

There is no server, no login, and no data leaving the phone, so the exposure is small. Concrete controls:

- **Typed names are never treated as HTML.** Exercise and sweet names are placed on the page with `textContent`, so a name containing HTML or script is shown as plain text rather than run.
- **Import is validated.** An imported file is checked for the expected shape and types before it replaces anything; a bad file is rejected with a message and existing data is left alone. Import asks for confirmation because it overwrites current data.
- **No secrets in the repository.** The code is public; there is nothing to hide in it.
- **No third-party scripts.** No libraries or external resources are loaded, so nothing outside the app's own files runs.

## Testing strategy

- **Automated (Node's built-in runner):** the pure logic, written alongside each module. Timer arithmetic including pause and resume; week boundaries (Saturday night into Sunday, sessions crossing midnight, daylight saving changes); totals and goal progress; duration formatting and parsing; import validation.
- **Manual on the computer:** each screen in Chrome's phone-sized preview.
- **Manual on the phone:** install, airplane mode, lock the phone mid-workout, close the app mid-workout, export then import.

## Milestones

Each is built in small steps with an explanation after each one.

- [x] **1. Skeleton.** `index.html`, `styles.css`, bottom bar switching between three empty screens. Local server running. Done 2026-11-23, checked in a 390px-wide browser.
- [x] **2. Formatting and timer logic.** `format.js` and `timer.js` with tests. Done 2026-11-23, 14 tests pass. `parseDuration` was left out of `format.js` until Settings needs it (Milestone 7).
- [x] **3. Storage layer.** `storage.js`: load, save, default types, with tests for validation. Done 2026-11-23, 24 tests pass in total. Built as `createStorage(backend)` so tests can pass a fake in place of `localStorage`. Editing types and goals, export, and import are added in Milestone 7.
- [x] **4. Log screen, exercise.** Buttons, clock, pause, Done confirmation, one-at-a-time rule, timer survives closing. Done 2026-11-24, checked in a browser: start, pause, resume, refusal of a second workout, Keep going, Save with a corrected time, and a running timer surviving a page reload. Added a third dialog choice, "Keep going", so a mis-tapped Done loses nothing.
- [x] **5. Log screen, sweets.** Buttons, Other, undo, today's entries and today line. Done 2026-11-24, 29 tests pass; checked in a browser: one-tap logging, Undo, Other with a typed name (HTML in a name is shown as text), Cancel, and the today line and list updating.
- [x] **5b. Split the Log screen** (owner request, 2026-11-24). Exercise and Sweets became separate tabs, and a workout now takes over the app on its own clock screen with the bottom bar hidden. `ui-log.js` was replaced by `ui-exercise.js` and `ui-sweets.js`. Checked in a browser, including reopening the app mid-workout.
- [x] **5c. Editable Today lists** (owner request, 2026-11-24). Entries in the Today lists on the Exercise and Sweets screens can be tapped to change the name/type, time, or duration, or to delete them. The dialog moved out of `ui-summary.js` into the shared `entry-dialog.js`. Checked in a phone-sized browser.
- [x] **10a. Design pass, first version** (2026-11-25). Restyled after a template the owner supplied (a three-screen "workout tracker" mock-up: white screens, soft waves, a thick ring, pill buttons, pill-bar chart, Montserrat). The template's yellow and brown were replaced by rose (`#f27da4`) and plum (`#8a2f5e`) at the owner's request. All colours are CSS variables at the top of `styles.css`, with a dark-mode set. The workout ring is now an SVG drawn in `ui-exercise.js` (`buildRing`), so its ends are rounded. Icons and theme colour recoloured to plum. Checked in a phone-sized browser, light and dark. Not yet reviewed by the owner on the phone.
- [x] **10b. Finish-workout dialog** (owner request, 2026-11-25). The dialog now shows the measured time as plain text with Save, Discard and Keep going. The hours and minutes are no longer editable boxes: an "Edit time" link swaps the text for two dials (hours 0-23, minutes 0-59). Saving without editing, or with the dials left where they started, keeps the exact measured time. Checked in a phone-sized browser; the dials have not been tried with a real finger yet.
- [x] **10c. Less blocky pages** (owner request, 2026-11-25). Exercise and Sweets: a hero ring with today's total at the top (filled towards one seventh of the weekly goal when there is one), round icon tiles three per row, "Other" as a dashed "+" tile, Today lists as plain rows. Settings: one card per section with thin dividers, names as plain text you tap to rename, a grey x to remove, "+ Add ..." rows, goals shown as text and set with dials in a new goal dialog (`goal-dialog` in `index.html`), Backup as rows. The waves moved down to sit just above the bottom bar. Checked in a phone-sized browser.
- [x] **6. Stats and Summary.** `stats.js` with tests, week view, chart, week navigation, edit/delete/add past entry. Done 2026-11-24. Checked in a browser: totals, chart, editing a workout's duration, deleting a sweet, adding a past sweet (the view jumps to that week), week arrows, and refusal of a zero-length workout.
- [x] **7. Settings.** Edit types, goals with progress bars on Summary, Export and Import. Done 2026-11-24. Checked in a browser: add, rename, remove with Undo; goals saved and shown as bars; export downloads `fitnice-backup-<date>.json`; importing it restores the data; a wrong file is refused and changes nothing.
- [ ] **8. Installable and offline.** Built 2026-11-24: `manifest.webmanifest`, `icons/` (placeholder white F on green), `sw.js`, the persistent storage request, `.gitignore`. A test checks the service worker's file list against the real files. Deployed 2026-11-24 to https://yonigelband.github.io/fitnice/ (public repository `YoniGelband/fitnice`, Pages serves the `main` branch root; a push to `main` republishes). Offline reload confirmed in desktop Chromium. **Still to do:** install on the phone and confirm offline use there.
- [ ] **9. Phone test pass.** Run the manual phone checklist and fix what it finds. Includes the 3-hour "still going?" prompt.

- [ ] **10. Design pass.** Owner decision 2026-11-24: visual design is worked on only after the application is functionally complete. Until then styling stays minimal and functional.

## Open questions and risks

- ~~**GitHub account not connected.**~~ Resolved 2026-11-24: repository `YoniGelband/fitnice`.
- **Data loss risk.** If Chrome's site data is cleared or the app is uninstalled with data removal, history is gone. Mitigation: persistent storage request plus Export. Consider a gentle "last export was N weeks ago" note in Settings if this worries the owner.
- **Updates reaching the phone.** Resolved in design 2026-11-24: the service worker refreshes its copies in the background on every launch, so an update appears on the second launch with no version bump. Still to be confirmed on the phone after deploy.
- **Rough edges left for the design pass.** Import asks for confirmation with the browser's plain built-in box. A name typed through "Other" on the Sweets screen is logged but not added to the button list.
- **No sweets during a workout.** The clock screen locks the app until the workout ends, so a sweet eaten mid-workout is logged afterwards (its time can be corrected once editing exists in Milestone 6). Revisit if this is annoying in real use.
- **Accidental pause.** Tap-to-pause on a large clock can be hit by accident in a pocket. The grey ring and blinking time make it visible; revisit if it happens in real use.

## Reused infrastructure

None. Everything is written fresh. The existing `.venv` is used only to run a local web server during development.
