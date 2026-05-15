# Claude Build Brief: Ask My Notes Implementation Hardening

Archived previous instruction set:

`Project Planning Context/ARCHIVE PLANS/2026-05-08 archived claude-build-ask-my-notes.md`

## Goal

Improve the existing `Ask My Notes` implementation so it is more reliable, forgiving, and trustworthy for a person with mild Alzheimer's or mild dementia.

Claude already created the first pass of the feature. This brief is not asking for a redesign. It is asking for implementation hardening around retrieval quality, confidence, graceful errors, discoverability, dependency cleanup, and tests.

## Current Project Location

The Expo app lives here:

`/Users/cameronreagan/Desktop/Kimapp/App Code`

Use paths below relative to `App Code/`.

## Product Guardrails

- Preserve the existing home contract:
  - Checklist remains the primary home view.
  - Notes log remains accessible by horizontal swipe.
  - The blue `+ New Note` pill remains fixed bottom-center on every main page.
  - Do not convert home into a tile menu.
- Keep `Ask My Notes` as local retrieval only.
- Do not add cloud sync.
- Do not add external AI APIs.
- Do not add an open-ended chatbot.
- Do not add voice recording, audio files, or speech-recognition libraries.
- Continue using iOS keyboard dictation naturally through `TextInput`.
- The app must only answer from saved notes.
- When in doubt, quote the matched note rather than paraphrasing.

## Required Work

### 1. Improve Retrieval So It Handles Normal Human Wording

Update `src/services/noteRetrieval.ts`.

The current search is too literal. It can find exact words but may miss normal variations.

Add small, deterministic matching improvements:

- Singular/plural handling:
  - `key` should match `keys`.
  - `medication` should match `medications`.
  - `note` should match `notes`.
- Common memory-support synonyms:
  - `meds`, `medicine`, `medication`, `pills`
  - `phone`, `cell`, `cellphone`
  - `remote`, `clicker`
  - `wallet`, `purse`
  - `keys`, `key`
  - `glasses`, `eyeglasses`
- Minor typo tolerance for meaningful terms when safe and simple.
  - Keep this conservative. Do not make wild guesses.
  - A small edit-distance helper is fine.
- Keep the implementation deterministic and local.
- Do not use an LLM.
- Do not add a heavy search library unless absolutely necessary.

Expected effect:

If a saved note says `I put my keys on the counter`, searches like `where is my key`, `where are the keys`, and `counter key` should all find it.

### 2. Add Confidence Levels So The App Is Not Overconfident

Right now the app says `I found this saved note:` for any match, even a weak one.

Add confidence handling to the retrieval result.

Something close to this is fine:

```ts
export type MatchConfidence = 'strong' | 'possible';

export interface NoteSearchResult {
  note: Note;
  score: number;
  matchedTerms: string[];
  answerText: string;
  confidence: MatchConfidence;
}
```

Suggested behavior:

- Strong match:
  - Multiple meaningful terms match, or there is a strong title/transcript phrase match.
  - UI says: `I found this saved note:`
- Possible match:
  - Only a weak but plausible match exists.
  - UI says: `This might be related:`
- No match:
  - Score is too low or no meaningful term matched.
  - UI says: `I could not find a saved note about that.`

Tune thresholds conservatively. For this app, it is better to say "I could not find it" than to confidently show an unrelated note.

### 3. Add Graceful Error Handling On Ask My Notes

Update `app/ask-notes.tsx`.

If search fails for any reason, the screen should not stay stuck on `Searching...`.

Add an error state with a calm message:

`I could not search your notes right now. Please try again.`

Also make sure:

- The search button becomes usable again after an error.
- Read-aloud works for the error message if shown.
- A new search clears the old error.

### 4. Add A Small Ask Entry Point On The Checklist Page

Update `app/index.tsx`.

The current `Ask My Notes` entry point only appears on the notes page. That is okay technically, but a person who needs memory help may not remember to swipe first.

Add a small, calm `Ask saved notes` button or text button near the checklist header.

Constraints:

- Do not make home into a tile menu.
- Do not compete visually with the checklist.
- Keep the fixed blue `+ New Note` button untouched.
- The notes-page `Ask My Notes` button should remain.

Expected effect:

The patient can reach memory search from the main screen without having to remember the notes swipe gesture.

### 5. Finish Dependency Cleanup

The visible audio-era dependencies were removed from `package.json`, but the lockfile/node_modules still showed `expo-file-system`.

Run the appropriate install/prune step from `App Code/` so the lockfile matches the actual dependencies.

Suggested command:

```bash
npm install --legacy-peer-deps
```

Then verify:

```bash
rg "expo-av|expo-file-system" .
```

Acceptable remaining matches:

- None in app source.
- None in `package.json`.
- Ideally none in `package-lock.json` unless pulled transitively by Expo itself.

Keep `expo-speech`.

### 6. Add Focused Tests For Retrieval

Add a small test setup if the project does not already have one.

The most important behavior to protect is the retrieval scoring. Tests can focus on pure helper functions in `src/services/noteRetrieval.ts`.

Cover at least:

- `Where are my keys?` finds a note containing `I put my keys on the counter.`
- Singular/plural matching works, such as `key` finding `keys`.
- Synonyms work, such as `meds` finding `medication` or `pills`.
- Empty or filler-only searches return no results.
- Weak matches are not treated as strong matches.
- Recent notes win when relevance is otherwise similar.

If testing the database-backed `searchNotesForMemory` is cumbersome, extract pure scoring helpers and test those directly.

Expected effect:

Future edits should not accidentally break the core memory-search behavior.

### 7. Verify The App Still Builds

Run:

```bash
npm exec tsc -- --noEmit
```

If tests are added, also run the test command and add it to `package.json`.

Report exactly what commands passed.

## Explicitly Do Not Do

Do not implement the existing-user medication checklist migration from the evaluation report.

Reason:

No one has installed the app yet, so there is no existing user database with the old checklist phrase. The seed text in `src/db/migrations.ts` is already the safer wording:

`Check morning medication plan`

Leave that as-is.

## Success Criteria

This pass is complete when:

- Ask My Notes handles normal wording variations better.
- Weak matches are labeled as possible, not certain.
- Bad matches are rejected.
- Search failures show a friendly message.
- Ask My Notes is reachable from the main checklist page and the notes page.
- Audio-era dependency cleanup is complete.
- Retrieval behavior has focused tests.
- TypeScript passes.
