# Claude Build Brief: Standalone Web Preview

Archived previous instruction set:

`Project Planning Context/ARCHIVE PLANS/2026-05-14 archived claude-build-ask-my-notes.md`

## Goal

Build a clean standalone HTML preview of the current Kim app so it can be opened directly in a browser and tested live without running Expo.

The preview should preserve the current app's primary behavior:

- Today's checklist is the main view.
- Checklist items can be marked complete and undone.
- Saved notes are visible from the notes view.
- A fixed `+ New Note` action creates notes.
- Note details can be opened and read aloud.
- `Ask My Notes` searches only saved local notes.
- Search uses the same deterministic local matching ideas as the app: stop words, common memory-support synonyms, conservative typo tolerance, confidence labels, and no cloud AI.

## Current Project Location

The Expo app lives here:

`/Users/cameronreagan/Desktop/Kimapp/App Code`

The standalone browser preview should live at:

`App Code/web-preview.html`

## Implementation Notes

- Keep it as a single self-contained HTML file with embedded CSS and JavaScript.
- Use `localStorage` so notes and checklist completions persist across browser refreshes.
- Seed the same checklist items used by the Expo migration:
  - `Check morning medication plan`
  - `Eat breakfast`
  - `Drink a glass of water`
  - `Get dressed`
  - `Bring hearing aids and glasses`
- Use hash navigation so the file works from disk:
  - `#/today`
  - `#/notes`
  - `#/new-note`
  - `#/ask-notes`
  - `#/notes/:id`
- Keep the interface calm, large-tap, and close to the existing app style.
- Avoid external dependencies, build tools, or network calls.

## Success Criteria

This pass is complete when:

- `App Code/web-preview.html` opens as a usable webpage from disk.
- The checklist can be toggled live.
- Notes can be created, listed, opened, and read aloud.
- Ask My Notes searches saved notes and labels results as strong or possible.
- No-match and error states are calm and recoverable.
- The old Claude note has been archived with the date-prefixed archive filename above.
