# Claude Build Brief: Ask My Notes Retrieval + Mission Cleanup

## Goal

Build a grounded memory-retrieval feature for Kimapp that lets a person with mild Alzheimer's or mild dementia ask a natural-language question about their saved notes and receive the most relevant saved memory back.

Example:

1. Patient saves: "I put my keys on the counter."
2. Two hours later, patient opens Ask My Notes and types or dictates: "Where are my keys?"
3. App searches local notes.
4. App replies: "I found a note that says: I put my keys on the counter. Recorded today at 8:55 AM."

This should feel like a simple chatbot window, but it must not be implemented as an open-ended chatbot. It is local retrieval plus grounded answer formatting.

## Product Guardrails

- Preserve the existing home contract:
  - Checklist remains the primary home view.
  - The notes log remains accessible by horizontal swipe.
  - The blue "+ New Note" pill remains fixed bottom-center on every main page.
  - Do not convert home into a tile menu.
- Notes are text-only. Use iOS keyboard dictation via `TextInput`; do not add voice recording, audio files, or speech-recognition libraries.
- All retrieval is local SQLite only.
- No cloud sync.
- No HIPAA/cloud scope.
- No open-ended LLM response.
- The app must only answer from saved notes. If no relevant note is found, say that clearly.
- When in doubt, quote the matched note rather than paraphrasing.

## Feature Name

Use the user-facing name:

`Ask My Notes`

Avoid calling it "chatbot" in the UI. Internally, names like `ask-notes`, `searchNotes`, or `retrieveMemory` are fine.

## Current Project Location

The Expo app lives here:

`/Users/cameronreagan/Desktop/Kimapp/App Code`

Use paths below relative to `App Code/`.

## Required Work

### 1. Add A Local Note Retrieval Service

Create a service such as:

`src/services/noteRetrieval.ts`

It should expose something close to:

```ts
export interface NoteSearchResult {
  note: Note;
  score: number;
  matchedTerms: string[];
  answerText: string;
}

export async function searchNotesForMemory(query: string): Promise<NoteSearchResult[]>;
```

Implementation expectations:

- Normalize the query to lower case.
- Remove simple filler words such as:
  - `where`
  - `what`
  - `when`
  - `did`
  - `do`
  - `i`
  - `my`
  - `the`
  - `a`
  - `an`
  - `is`
  - `are`
  - `was`
  - `were`
  - `to`
  - `of`
  - `for`
  - `about`
- Keep meaningful terms like `keys`, `wallet`, `medicine`, `phone`, `remote`.
- Search note `title` and `transcript`.
- Prefer recent notes when relevance is similar.
- Ignore archived notes.
- Return no result if the query is empty after normalization.

Start with a robust TypeScript implementation using existing Drizzle queries. Do not overbuild.

Suggested first-pass scoring:

- Exact full-query substring in title: high boost.
- Exact full-query substring in transcript: high boost.
- Each matched meaningful term in title: medium boost.
- Each matched meaningful term in transcript: smaller boost.
- Recency boost for notes from today / yesterday.
- Sort by score descending, then created date descending.

This is enough for the initial "Where are my keys?" use case.

### 2. Optional SQLite FTS5, But Do Not Block On It

If adding FTS5 is straightforward, add it. If it creates migration complexity, skip it for now and use deterministic scoring in TypeScript.

If you add FTS5:

- Add migration SQL for a virtual table such as `notes_fts`.
- Keep it synchronized on create/update.
- Make sure existing notes are indexed.
- Still keep the TypeScript fallback scoring if FTS fails.

Do not spend the whole implementation on FTS. The feature should one-shot with simple local retrieval.

### 3. Add An Ask My Notes Screen

Create:

`app/ask-notes.tsx`

UI requirements:

- Simple, calm screen.
- Large input field with placeholder:
  - `Ask about something you saved`
- Text input should support iOS keyboard dictation naturally.
- Primary button:
  - `Search Notes`
- Show a clear answer area after search.
- If one strong match is found:
  - Show: `I found this saved note:`
  - Quote the note text.
  - Show recorded time.
- If several matches are found:
  - Show the top answer first.
  - Then show up to 3 matched notes below.
- If no match:
  - `I could not find a saved note about that.`
- Add a read-aloud button for the answer using existing `src/lib/tts.ts`.
- Do not show invented information.
- Do not use a typing animation.
- Do not use external AI APIs.

Recommended answer format:

```txt
I found this saved note:

"I put my keys on the counter."

Recorded today at 8:55 AM.
```

Avoid over-paraphrasing for v1. It is safer and more trustworthy to quote the note.

### 4. Add A Clear Entry Point Without Redesigning Home

Preserve the home contract.

Recommended entry:

- Add a compact `Ask Notes` button in the notes-log page header in `app/index.tsx`.
- This button routes to `/ask-notes`.
- Keep the bottom-center blue `+ New Note` CTA untouched.
- Do not add a tile menu.

Optional but useful:

- On the checklist page, add a small text/button affordance near the header or below the subtitle only if it does not compete with the checklist:
  - `Ask saved notes`

If the layout starts to feel crowded, only add the entry on the notes page for this pass.

### 5. Register The Route

Update:

`app/_layout.tsx`

Add a Stack screen for `ask-notes`, with title:

`Ask My Notes`

### 6. Make Note Capture Body-First

Update:

`app/new-note.tsx`

Currently the optional title receives focus first. Change the default focus to the body field because the title is optional and quick memory capture is the main behavior.

Keep the title field available.

### 7. Remove Abandoned Audio Recording Scope

Update:

`app.json`

Remove or correct stale audio recording declarations:

- Remove `NSMicrophoneUsageDescription`.
- Remove `NSSpeechRecognitionUsageDescription`.
- Remove `UIBackgroundModes: ["audio"]`.
- Remove the `expo-av` config plugin.

Update:

`package.json`

Remove unused audio-era dependencies if not imported anywhere:

- `expo-av`
- `expo-file-system`

Then run install/update lockfile:

```bash
npm install --legacy-peer-deps
```

Make sure no files import `expo-av` or audio helpers.

Keep `expo-speech`, because note detail and Ask My Notes need read-aloud.

### 8. Remove Dead/Stale Theme State If Easy

`src/theme/index.ts` still has `recording`.

If unused, remove it. This is small but keeps the codebase from drifting back toward the old recording concept.

### 9. Audit Any Retrieval Mutations

Searching notes is read-only and does not need an audit event.

But fix the existing mutation gap:

`src/services/note.ts`

Update `flagForReview(id)` so it records an audit event, because it changes note state.

### 10. Medication Safety Cleanup

Do not implement the full medication feature in this pass unless specifically asked.

But address the seed checklist concern:

`src/db/migrations.ts`

The seed item `Take morning medications` is risky before caregiver medication setup exists. Replace it with a safer phrase such as:

`Check morning medication plan`

or:

`Review morning health routine`

This avoids implying that the app has verified medication schedules before the medication module exists.

## Strongly Recommended Implementation Shape

### Retrieval Helpers

Use pure helper functions in `src/services/noteRetrieval.ts`:

```ts
function normalizeText(value: string): string;
function extractSearchTerms(query: string): string[];
function scoreNote(note: Note, query: string, terms: string[]): number;
function buildAnswerText(note: Note): string;
function formatRecordedAt(date: Date | number): string;
```

Keep them testable even if the project does not have a test runner yet.

### Query Handling

For `Where are my keys?`, terms should become:

```ts
["keys"]
```

For `Where did I put my blue jacket?`, terms should become something like:

```ts
["put", "blue", "jacket"]
```

It is okay if v1 is simple.

### Answer Grounding

Always include the original note text or title/body quote. This is the trust anchor.

Good:

```txt
I found this saved note:
"I put my keys on the counter."
Recorded today at 8:55 AM.
```

Acceptable:

```txt
The closest saved note says:
"I put my keys on the counter."
Recorded today at 8:55 AM.
```

Avoid:

```txt
Your keys are definitely on the counter.
```

That overstates certainty.

## Acceptance Criteria

Run these checks before stopping:

```bash
npx tsc --noEmit
```

Also run:

```bash
rg -n "expo-av|RecordButton|recording|NSMicrophoneUsageDescription|NSSpeechRecognitionUsageDescription|UIBackgroundModes|raw audio|voice note"
```

There should be no active user-facing audio-recording scope left. It is okay if the database column `raw_audio_path` remains for backward compatibility, but do not expose it or build on it.

Manual behavior to verify:

1. Create a note with body:
   - `I put my keys on the counter`
2. Save it.
3. Open Ask My Notes.
4. Search:
   - `Where are my keys?`
5. Expected:
   - The app returns the saved note.
   - The response includes the recorded time.
   - The answer does not invent extra details.
6. Search:
   - `Where is my passport?`
7. Expected:
   - If there is no passport note, the app says it could not find a saved note.

## Files Likely To Change

- `app/_layout.tsx`
- `app/index.tsx`
- `app/new-note.tsx`
- `app/ask-notes.tsx`
- `src/services/noteRetrieval.ts`
- `src/services/note.ts`
- `src/db/migrations.ts`
- `src/theme/index.ts`
- `app.json`
- `package.json`
- `package-lock.json`

## Non-Goals For This Pass

- Do not add OpenAI, CoreML, Gemma, or any LLM.
- Do not add audio recording.
- Do not add medication reminders yet.
- Do not add caregiver PIN mode yet.
- Do not add cloud sync.
- Do not redesign the home screen.
- Do not create a general assistant.

## Product Rationale

This feature gives the patient the emotional shape of asking a helper, while keeping the technical behavior safe and deterministic. The app is not guessing where the keys are. It is retrieving a saved memory and presenting it clearly.

That is the core Kimapp promise: structured memory support, not free-form AI conversation.
