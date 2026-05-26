# Claude Build Brief: Guided Daily Routine Cards

Archived previous instruction set:

`Project Planning Context/ARCHIVE PLANS/2026-05-26 archived claude-build-ask-my-notes.md`

You are implementing Guided Daily Routine Cards in Kimapp.

Important: before coding, inspect the repository and produce a concrete implementation plan first. Wait for approval before making code changes.

## Product Goal

Upgrade Kimapp's current "Today's checklist" into Guided Daily Routine Cards.

These cards should help a person with early memory difficulty understand:

- what to do
- what to do next
- where the needed item usually is
- whether the task is already done today
- what to check if they feel unsure

The experience must stay local-first, calm, simple, readable, and independence-preserving.

Do not add:

- caregiver dashboards
- cloud sync
- reminders or notifications
- medical dosing logic
- AI-generated care plans
- adherence analytics
- emergency escalation
- surveillance or monitoring behavior

## Current App Context

Main native app:

- Expo / React Native app under `App Code`
- Today screen: `App Code/app/index.tsx`
- Current checklist row component: `App Code/src/components/ChecklistRow.tsx`
- Checklist service: `App Code/src/services/checklist.ts`
- SQLite schema: `App Code/src/db/schema.ts`
- Migration/seed logic: `App Code/src/db/migrations.ts`
- Text-to-speech helper: `App Code/src/lib/tts.ts`
- Tests can be run with `npm test` from `App Code`

Web preview:

- Inspect the repo to confirm the active static preview file.
- It may be `index.html` at the repo root, or `App Code/web-preview.html` depending on the current branch/state.
- Update the active GitHub Pages preview file so the preview mirrors the native concept.

## Feature Overview

Replace or upgrade checklist items into richer routine cards.

Each routine card needs:

- `id`
- `title`, required
- `instruction`, required
- `context`, optional
- `safetyNote`, optional
- `readAloudText`, optional
- `section`, optional:
  - `morning`
  - `afternoon`
  - `evening`
  - `leaving_home`
  - `bedtime`
  - `custom`
- `customSectionLabel`, optional
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

Completion must remain separate from card definitions.

Use local daily completion state:

- Local date key format: `YYYY-MM-DD`
- Marking done should create or update today's completion record.
- Undo should remove or clear today's completion record.
- Cards themselves must not be deleted, recreated, or reset each day.
- Done state should visually reset on a new local date while preserving the card definitions.

## Native Data Model

Add a `routine_cards` table in `src/db/schema.ts`.

Recommended columns:

- `id TEXT PRIMARY KEY NOT NULL`
- `title TEXT NOT NULL`
- `instruction TEXT NOT NULL`
- `context TEXT`
- `safety_note TEXT`
- `read_aloud_text TEXT`
- `section TEXT`
- `custom_section_label TEXT`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `is_active INTEGER NOT NULL DEFAULT 1`
- `created_at INTEGER NOT NULL`
- `updated_at INTEGER`

Reuse the existing `completion_logs` table with:

- `item_type = 'routine_card'`
- `item_id = routine_cards.id`
- `occurrence_date = YYYY-MM-DD`

Only choose a different completion strategy if the repository already has a clearly better local pattern.

## Migration Strategy

Update `src/db/migrations.ts`.

Migration must:

- Create `routine_cards` if it does not exist.
- Preserve the existing `checklist_items` table and data.
- Avoid duplicate cards across repeated app starts.
- If routine cards already exist, do not seed duplicates.
- If no routine cards exist:
  - Prefer converting existing active checklist items into routine cards.
  - If there are no checklist items, seed the default routine cards below.
- Existing checklist items should be safely preserved, migrated, or converted. Do not drop old data.

Suggested conversion behavior:

- For known default checklist items, convert them into richer routine cards using the default sample content below.
- For unknown/custom checklist items:
  - `title`: existing checklist text
  - `instruction`: existing checklist text, or a short neutral instruction derived from it
  - `context`: null
  - `safetyNote`: null
  - `section`: `custom`
  - preserve approximate sort order

Use stable IDs for seeded cards where practical, such as:

- `routine_morning_water`
- `routine_get_dressed`
- `routine_medication_plan`
- `routine_leaving_home`
- `routine_evening_wind_down`

## Service Layer

Add a service such as `src/services/routineCards.ts`.

Recommended functions:

- `listTodaysRoutineCards()`
- `createRoutineCard()`
- `updateRoutineCard()`
- `deactivateRoutineCard()` or `deleteRoutineCard()`
- `reorderRoutineCards()`
- `markRoutineCardDone()`
- `undoRoutineCardDone()`

Keep audit logging consistent with existing checklist behavior where practical.

## Default Seed Cards

Use these safe defaults if no routine cards exist:

1. Morning water
   - Instruction: `Drink one glass of water.`
   - Context: `Your cup is next to the sink.`
   - Safety note: `If the cup is missing, use the blue cup in the cabinet.`
   - Section: `morning`

2. Get dressed
   - Instruction: `Put on today's clothes.`
   - Context: `Your outfit is on the chair near the closet.`
   - Section: `morning`

3. Check morning medication plan
   - Instruction: `Check the morning medication plan in your pill organizer.`
   - Context: `The pill organizer is next to the coffee maker.`
   - Safety note: `If anything looks wrong, call the person you trust. Kimapp does not decide doses.`
   - Section: `morning`

4. Before leaving home
   - Instruction: `Check keys, wallet, phone, and glasses.`
   - Context: `Your keys are usually in the bowl by the door.`
   - Section: `leaving_home`

5. Evening wind-down
   - Instruction: `Turn off the stove area, lock the door, and put your phone on the charger.`
   - Context: `The charger is on the bedside table.`
   - Section: `evening`

## Today Screen UI

Update the Today screen from "Today's checklist" to something like:

`Today's routine`

Routine cards should become the main daily surface.

Cards must support collapsed and expanded states.

Collapsed card shows:

- title
- short context/subtitle if available
- clear Done control
- completion state

Expanded card shows:

- title
- instruction
- context if present
- safety note if present
- Read aloud button using existing TTS
- Done / Undo Done control

UI requirements:

- large tap targets
- high contrast
- short sentences
- calm language
- visible text labels instead of icon-only controls
- done state should be obvious but still readable
- undo must be available
- avoid clutter and avoid caregiver/admin framing

## Expansion State

Keep expansion state local to the Today screen.

Recommended behavior:

- Tapping the card expands/collapses it.
- The Done control should not accidentally toggle expansion unless that matches an existing app pattern.
- Multiple cards may be expanded unless there is a strong reason to allow only one.
- Completion state comes from today's `completion_logs`, not from the card itself.

## Add/Edit Flow

Add a low cognitive load create/edit routine card flow.

Fields:

- Title, required
- Short instruction, required
- Location/context, optional
- If unsure / safety note, optional
- Read-aloud wording, optional
- Routine section, optional
- Active today / active card boolean
- Sort order or simple move/reorder behavior

The form should be short, readable, and friendly.

Reuse existing design tokens and app patterns. Do not introduce a heavy admin dashboard.

Suggested routing:

- Add routine card: `/routine/new`
- Edit routine card: `/routine/[id]` or `/routine/[id]/edit`

If the existing app routing pattern suggests better route names, follow the existing pattern.

## Deletion / Deactivation

Allow deleting or deactivating a routine card.

Prefer deactivation if that better preserves completion history.

If implementing deactivation:

- Set `isActive = false`
- Keep existing completion logs
- Hide inactive cards from Today by default

## Text-to-Speech

Native app:

- Use `src/lib/tts.ts`.
- Read-aloud text should default to:
  - `readAloudText` if provided
  - otherwise combined `title + instruction + context + safetyNote`

Web preview:

- Use the existing browser speech synthesis pattern.
- Keep behavior simple and consistent with the native app.

## Web Preview

Update the active static web preview so it mirrors the routine card concept.

Requirements:

- Replace the old localStorage checklist shape with routine card definitions and daily completions.
- Preserve or migrate old checklist items if present.
- Add collapsed/expanded routine card UI.
- Add add/edit/delete or deactivate routine card flow if feasible.
- Keep the preview simple and consistent with the native experience.
- Do not introduce external dependencies.

## Safety Copy

Medication wording must avoid medical advice.

Allowed wording:

- "Check your pill organizer."
- "Follow the plan your doctor or trusted person gave you."
- "If anything looks wrong, call the person you trust."
- "Kimapp does not decide doses."

Do not add:

- medication dosage authority
- adherence claims
- caregiver alerts
- emergency escalation
- generated medical guidance

## Acceptance Criteria

- Active routine cards appear on Today.
- Each card can expand to show full guidance.
- User can mark Done.
- User can Undo Done.
- Done state persists for the current local day.
- Done state visually resets on a new local date without deleting cards.
- User can create a routine card.
- User can edit a routine card.
- User can delete or deactivate a routine card.
- Existing checklist items are preserved, migrated, or safely converted.
- TTS read-aloud works where existing TTS support is available.
- Web preview reflects the new routine card concept.
- No cloud, caregiver dashboard, notification, medical advice, or AI-generated care-plan behavior is introduced.
- Available tests/build checks are run and results or blockers are reported.

## Plan First

Before coding, report:

1. What files you will change.
2. Exact data model and migration strategy.
3. How existing checklist data will be preserved.
4. How Today UI expansion, done, and undo state will work.
5. How add/edit/delete or deactivate will be routed.
6. What tests or manual checks you will run.

Wait for approval before making code changes.
