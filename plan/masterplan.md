# Fitnice - Master Plan

**Status:** Draft, agreed in a planning interview on 2026-11-23. No code written yet.
**Approval gate:** Owner reviews this plan, then says "start building". Nothing is implemented before that.

## One line

A personal phone app that tracks how much time you spend exercising and how many sweets you eat, and shows honest weekly numbers for both.

## Why it exists

It is easy to feel like you "walked a lot this week" or "barely had any sweets" without knowing the real numbers. Fitnice makes logging so quick (one or two taps) that the numbers are actually there at the end of the week.

## Goal

A web app installed to the home screen of one Android phone. It works with no internet.

- **Exercise:** tap an exercise type to start a clock, tap the clock to pause or resume, tap Done to finish. The time is saved against that exercise type.
- **Sweets:** tap a sweet to log it with the current time.
- **Summary:** for any week (Sunday to Saturday), see time per exercise type, a day-by-day chart, the sweets total, and sweets per day by name. The current week updates live.
- **Goals (optional):** a weekly minimum per exercise type, a weekly minimum for total exercise, and a weekly maximum for sweets. With no goal set, the app only tracks.

The purpose is awareness. Goals are an extra, never required.

## Who it is for

One person, on one phone. No sign-up and no accounts.

"Scale later" is kept open in one specific way: all saving and loading goes through a single storage layer, so a server and accounts could replace it later without rewriting the rest of the app.

## Non-goals for version 1

- Accounts, login, or syncing between devices
- A server or any Python backend
- Reminders or notifications
- Calories, sugar grams, or portion sizes
- Distance, GPS, or step counting
- Sets, reps, or weights for strength training (time only)
- Monthly or yearly views
- Notes on entries
- Hebrew or right-to-left layout (English only)

## Success criteria

1. Starting a workout takes one tap; logging a sweet takes one tap.
2. A workout's saved time is correct even if the phone was locked or the app closed while it ran, and excludes paused time.
3. Closing and reopening the app loses nothing, including a running or paused timer.
4. The weekly summary matches the entries exactly, and updates the moment something is logged.
5. The app opens and works in airplane mode.
6. A full export file can be imported to restore all data.

## Constraints that shape everything

- **Data lives only on the phone.** No server means no cost and full privacy, but a lost phone or cleared browser data loses the history unless there is an export file.
- **Browser-only code.** HTML, CSS, and JavaScript. No framework and no build step, so every file can be read as written.
- **Public code, private data.** The code is hosted on GitHub Pages and is publicly visible. Exercise and sweets data never leaves the phone.
- **One workout at a time.**
