# Session Summaries

This folder stores end-of-session summaries for the Kimapp project.

Use this folder when Cameron asks to write, save, create, or update a session summary. Each summary should capture what happened in that work session so a non-technical person can quickly understand the progress, and a future AI model can pick up the project history without rereading the entire chat.

## File Naming

Create one Markdown file per summary.

Use the date the summary is created in the filename:

```txt
YYYY-MM-DD session summary.md
```

If more than one summary is created on the same date, append a short label:

```txt
YYYY-MM-DD ask-my-notes hardening summary.md
YYYY-MM-DD planning summary.md
```

## Required Structure

Every summary should use this structure.

```md
# YYYY-MM-DD Session Summary

## TLDR For A Layperson

Explain, in plain English, where the app or project stood at the start of the session, what changed during the session, and what the app can now do because of those changes. This section should be specific enough that Cameron can read only the TLDR and understand the before-and-after state without needing the technical details below.

Include:

- What the app could or could not do before the session.
- What was added, fixed, reviewed, or decided.
- What the app can now do in practical user terms.
- Any important limitation that still affects the user experience.

Keep this concise, but not vague. Prefer concrete app behavior over generic progress language.

## Detailed Summary For Future AI Context

Provide a more complete technical and project-history summary. Include enough context for a future AI model to understand what changed, what decisions were made, what files were touched or discussed, and what still needs attention.

## Files And Artifacts

List important files created, edited, archived, reviewed, or referenced.

## Verification

List any commands, tests, builds, or checks that were run, plus whether they passed or failed. If nothing was run, say so.

## Open Questions Or Next Steps

List unresolved issues, likely next actions, or decisions Cameron may need to make later.
```

## Writing Guidelines

- Put the layperson TLDR at the top.
- Keep the TLDR free of jargon, but make it concrete.
- In the TLDR, describe the app's before-and-after state. Avoid vague lines like "we improved the app" unless followed by what actually changed for the user.
- Make the detailed section useful for future AI handoff.
- Mention exact file paths when they matter.
- Note whether work was only planned, actually implemented, or verified.
- Be clear about what remains unfinished.
- Do not invent verification. Only list commands or checks that actually ran.
- If the session involved reviewing another AI's work, summarize both what that AI did and the gaps found.
- If instructions were created for another AI, include where those instructions were saved.

## Purpose

These summaries are project memory. They should make it easy to answer:

- What did we do today?
- Why did we do it?
- What changed in the app or planning files?
- What should the next AI know before continuing?
- What should Cameron know without needing technical details?
