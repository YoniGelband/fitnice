# Fitnice - Technologies

Last updated: 2026-11-23

## Language and runtime

| Choice | Why |
| --- | --- |
| HTML, CSS, JavaScript (ES modules), run by the phone's browser | The whole app lives on the phone, so the browser's own languages are all that is needed. ES modules (the built-in `import`/`export` system) let us split code into small files with no build tool. |
| No Python in version 1 | Python would only be the server, and there is no server yet. The `.venv` in this folder is used only for a local test web server (see Dev tooling). |

## Framework

**None.** Plain JavaScript. The app is five small screens; a framework (React, Vue, Svelte) would add tooling and concepts before any feature exists. Considered and rejected for version 1. Worth revisiting only if the app grows well past three screens.

## Libraries

**None** (the font file above is not code). The bar chart is drawn with plain HTML/CSS bars. No chart library, no date library (week maths is a few small functions we write and test).

## Fonts

**Montserrat** (variable weight, Latin subset, 38 KB `fonts/montserrat.woff2`), the font named by the design template. Open licence (SIL Open Font License), so it can be shipped with the app. Stored in the project and in the service worker's file list rather than loaded from Google, so the app still needs no internet. Downloaded 2026-11-25 from the Fontsource package on jsDelivr.

## Browser features used

| Feature | Used for | Notes |
| --- | --- | --- |
| `localStorage` | Saving all data on the phone | A small key-value store every website gets. Limit is about 5 MB; years of entries are a few hundred KB. IndexedDB (the browser's full database) was considered and rejected as too fiddly for this data size. Wrapped in one storage layer so it can be swapped. |
| `navigator.storage.persist()` | Asking the browser not to clear our data when the phone runs low on space | By default browsers may evict a site's data under storage pressure. Chrome decides silently and tends to grant this to installed apps. It is a request, not a guarantee, which is why Export exists. Checked 2026-11-23 (web.dev "Persistent storage"); the exact grant rules for installed apps were not confirmed from a current source. |
| Web app manifest (`manifest.webmanifest`) | Making the app installable with a name and icon | Chrome needs a name, a 192px and a 512px icon, a `start_url`, and `display: standalone`. Checked 2026-11-23 (Chrome for Developers, web.dev). |
| Service worker (`sw.js`) | Working with no internet | A small script the browser runs in the background that keeps a copy of the app's files and serves them when offline. Chrome on Android no longer requires one to install an app (since Chrome 108), but offline use still needs it. |
| File download and file input | Export and Import of a JSON backup file | No library needed. |
| `prefers-color-scheme` (CSS) | Following the phone's light or dark setting | |

## Hosting

**GitHub Pages**, free, served over HTTPS (the secure connection a phone requires before it will install an app). The repository must be public on a free GitHub account. Alternative if private code is ever wanted: Cloudflare Pages.

## Dev tooling

| Tool | Version found on this machine (2026-11-23) | Used for |
| --- | --- | --- |
| Node.js | v24.19.0 | Running tests with its built-in test runner (`node --test`). Nothing to install. |
| Python (`.venv`) | present | `python -m http.server` to serve the app locally. ES modules do not load from a plain double-clicked file, so a local web server is needed. |
| git | 2.45.1 | Version control. Repository: `github.com/YoniGelband/fitnice`, branch `main`. |
| GitHub CLI (`gh`) | 2.97.0 | Creating the repository and enabling Pages. Logged in. |
| Chrome DevTools | - | Phone-sized preview on the computer, and inspecting saved data. |

No linter, bundler, or package manager. No `package.json` needed unless that changes.

## Undecided

- ~~**GitHub account and repository name.**~~ Decided 2026-11-24: `YoniGelband/fitnice`, live at https://yonigelband.github.io/fitnice/.
- **App icon.** A simple generated icon is the default unless the owner supplies one.
- **Server stack if the app scales.** Deliberately not chosen now. Python (for example FastAPI) is the natural candidate given the owner's setup, but nothing depends on that today.
