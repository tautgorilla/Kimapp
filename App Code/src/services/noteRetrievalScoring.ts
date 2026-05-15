import type { Note } from '../db/schema';

export type MatchConfidence = 'strong' | 'possible';

export interface NoteSearchResult {
  note: Note;
  score: number;
  matchedTerms: string[];
  answerText: string;
  confidence: MatchConfidence;
}

const STOP_WORDS = new Set([
  'where',
  'what',
  'when',
  'did',
  'do',
  'i',
  'my',
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'to',
  'of',
  'for',
  'about',
]);

const SYNONYM_GROUPS: string[][] = [
  ['key', 'keys'],
  ['med', 'meds', 'medicine', 'medicines', 'medication', 'medications', 'pill', 'pills'],
  ['phone', 'cell', 'cellphone'],
  ['remote', 'clicker'],
  ['wallet', 'purse'],
  ['glass', 'glasses', 'eyeglasses'],
  ['note', 'notes'],
];

const SYNONYM_LOOKUP: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    const set = new Set(group);
    for (const word of group) {
      map.set(word, set);
    }
  }
  return map;
})();

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FUZZY_MIN_LEN = 5;
const SCORE_FLOOR = 1;

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

export function extractSearchTerms(query: string): string[] {
  const tokens = tokenize(query);
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    if (token.length < 2) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
  }
  return terms;
}

export function expandTerm(term: string): Set<string> {
  const group = SYNONYM_LOOKUP.get(term);
  if (group) return group;
  return new Set([term]);
}

export function levenshteinAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 1) return false;

  if (a.length === b.length) {
    let mismatches = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        mismatches++;
        if (mismatches > 1) return false;
      }
    }
    return true;
  }

  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      j++;
    }
  }
  return true;
}

type TermMatchKind = 'direct' | 'synonym' | 'fuzzy';

interface TermMatch {
  term: string;
  kind: TermMatchKind;
  fieldsHit: { title: boolean; transcript: boolean };
}

function matchTermAgainstTokens(
  term: string,
  titleTokens: string[],
  transcriptTokens: string[]
): TermMatch | null {
  const expanded = expandTerm(term);

  let directInTitle = false;
  let directInTranscript = false;
  let synonymInTitle = false;
  let synonymInTranscript = false;

  const titleSet = new Set(titleTokens);
  const transcriptSet = new Set(transcriptTokens);

  for (const variant of expanded) {
    const inTitle = titleSet.has(variant);
    const inTranscript = transcriptSet.has(variant);
    if (!inTitle && !inTranscript) continue;
    if (variant === term) {
      directInTitle = directInTitle || inTitle;
      directInTranscript = directInTranscript || inTranscript;
    } else {
      synonymInTitle = synonymInTitle || inTitle;
      synonymInTranscript = synonymInTranscript || inTranscript;
    }
  }

  if (directInTitle || directInTranscript) {
    return {
      term,
      kind: 'direct',
      fieldsHit: { title: directInTitle, transcript: directInTranscript },
    };
  }
  if (synonymInTitle || synonymInTranscript) {
    return {
      term,
      kind: 'synonym',
      fieldsHit: { title: synonymInTitle, transcript: synonymInTranscript },
    };
  }

  if (term.length >= FUZZY_MIN_LEN) {
    let fuzzyTitle = false;
    let fuzzyTranscript = false;
    for (const token of titleTokens) {
      if (token.length < FUZZY_MIN_LEN - 1) continue;
      if (levenshteinAtMostOne(term, token)) {
        fuzzyTitle = true;
        break;
      }
    }
    for (const token of transcriptTokens) {
      if (token.length < FUZZY_MIN_LEN - 1) continue;
      if (levenshteinAtMostOne(term, token)) {
        fuzzyTranscript = true;
        break;
      }
    }
    if (fuzzyTitle || fuzzyTranscript) {
      return {
        term,
        kind: 'fuzzy',
        fieldsHit: { title: fuzzyTitle, transcript: fuzzyTranscript },
      };
    }
  }

  return null;
}

export interface ScoredNote {
  score: number;
  matchedTerms: string[];
  ideaCount: number;
  hasPhraseMatch: boolean;
}

export function scoreNote(note: Note, normalizedQuery: string, terms: string[]): ScoredNote {
  const titleNormalized = note.title ? normalizeText(note.title) : '';
  const transcriptNormalized = note.transcript ? normalizeText(note.transcript) : '';
  const titleTokens = titleNormalized ? titleNormalized.split(' ') : [];
  const transcriptTokens = transcriptNormalized ? transcriptNormalized.split(' ') : [];

  let score = 0;
  let hasPhraseMatch = false;

  const queryWordCount = normalizedQuery ? normalizedQuery.split(' ').length : 0;
  if (normalizedQuery && queryWordCount >= 2) {
    if (titleNormalized.includes(normalizedQuery)) {
      score += 20;
      hasPhraseMatch = true;
    } else if (transcriptNormalized.includes(normalizedQuery)) {
      score += 15;
      hasPhraseMatch = true;
    }
  }

  const matchedTerms: string[] = [];
  let ideaCount = 0;

  for (const term of terms) {
    const match = matchTermAgainstTokens(term, titleTokens, transcriptTokens);
    if (!match) continue;
    matchedTerms.push(term);

    if (match.kind === 'direct') {
      ideaCount++;
      if (match.fieldsHit.title) score += 6;
      if (match.fieldsHit.transcript) score += 3;
    } else if (match.kind === 'synonym') {
      ideaCount++;
      if (match.fieldsHit.title) score += 4;
      if (match.fieldsHit.transcript) score += 2;
    } else {
      if (match.fieldsHit.title) score += 2;
      if (match.fieldsHit.transcript) score += 1;
    }
  }

  if (score > 0) {
    const ageDays = (Date.now() - note.createdAt.getTime()) / MS_PER_DAY;
    if (ageDays < 1) score += 3;
    else if (ageDays < 2) score += 1;
  }

  return { score, matchedTerms, ideaCount, hasPhraseMatch };
}

export function formatRecordedAt(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `today at ${time}`;
  if (isYesterday) return `yesterday at ${time}`;
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return `${dateLabel} at ${time}`;
}

export function buildAnswerText(note: Note): string {
  const quote = (note.transcript ?? note.title ?? '').trim();
  const recordedAt = formatRecordedAt(note.createdAt);
  if (!quote) return `Saved note recorded ${recordedAt}.`;
  return `"${quote}"\n\nRecorded ${recordedAt}.`;
}

export function rankNotes(notes: Note[], query: string): NoteSearchResult[] {
  const terms = extractSearchTerms(query);
  if (terms.length === 0) return [];
  const normalizedQuery = normalizeText(query);

  const results: NoteSearchResult[] = [];
  for (const note of notes) {
    const scored = scoreNote(note, normalizedQuery, terms);
    if (scored.score < SCORE_FLOOR) continue;
    if (scored.matchedTerms.length === 0 && !scored.hasPhraseMatch) continue;

    const confidence: MatchConfidence =
      scored.hasPhraseMatch || scored.ideaCount >= 2 ? 'strong' : 'possible';

    results.push({
      note,
      score: scored.score,
      matchedTerms: scored.matchedTerms,
      answerText: buildAnswerText(note),
      confidence,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.note.createdAt.getTime() - a.note.createdAt.getTime();
  });

  return results;
}
