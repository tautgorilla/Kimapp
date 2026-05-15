import type { Note } from '../db/schema';
import {
  rankNotes,
  extractSearchTerms,
  normalizeText,
  levenshteinAtMostOne,
} from './noteRetrievalScoring';

function makeNote(overrides: Partial<Note> & { id: string; transcript: string | null }): Note {
  return {
    id: overrides.id,
    title: overrides.title ?? null,
    rawAudioPath: null,
    transcript: overrides.transcript,
    summary: null,
    durationMs: null,
    tags: null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: null,
    sourceUser: 'patient',
    verifiedByCaregiver: false,
    parserConfidence: null,
    needsReview: false,
    archivedAt: null,
  };
}

describe('normalizeText', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizeText("Where  are MY keys?!")).toBe('where are my keys');
  });
});

describe('extractSearchTerms', () => {
  it('drops stop words and short tokens', () => {
    expect(extractSearchTerms('Where are my keys?')).toEqual(['keys']);
  });

  it('returns empty for filler-only queries', () => {
    expect(extractSearchTerms('the the of for')).toEqual([]);
    expect(extractSearchTerms('   ')).toEqual([]);
    expect(extractSearchTerms('')).toEqual([]);
  });

  it('preserves non-stop meaningful terms', () => {
    expect(extractSearchTerms('Where did I put my blue jacket?')).toEqual([
      'put',
      'blue',
      'jacket',
    ]);
  });
});

describe('levenshteinAtMostOne', () => {
  it('matches identical strings', () => {
    expect(levenshteinAtMostOne('keys', 'keys')).toBe(true);
  });
  it('allows a single substitution', () => {
    expect(levenshteinAtMostOne('keys', 'kets')).toBe(true);
  });
  it('allows a single insertion', () => {
    expect(levenshteinAtMostOne('keys', 'keyss')).toBe(true);
  });
  it('rejects two edits', () => {
    expect(levenshteinAtMostOne('keys', 'kkts')).toBe(false);
  });
  it('rejects very different strings', () => {
    expect(levenshteinAtMostOne('key', 'monkey')).toBe(false);
  });
});

describe('rankNotes — happy paths', () => {
  it('finds the keys note when asked Where are my keys?', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I put my keys on the counter.',
    });
    const results = rankNotes([note], 'Where are my keys?');
    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe('a');
  });

  it('matches singular query against plural note via synonym group', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I put my keys on the counter.',
    });
    const results = rankNotes([note], 'where is my key');
    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe('a');
  });

  it('matches synonym meds → medication', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I took my medication this morning.',
    });
    const results = rankNotes([note], 'did I take my meds?');
    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe('a');
  });

  it('matches synonym meds → pills', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'The blue pills are next to the sink.',
    });
    const results = rankNotes([note], 'where are my meds');
    expect(results.length).toBe(1);
    expect(results[0].note.id).toBe('a');
  });

  it('finds multi-term phrases like blue jacket', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I put my blue jacket in the closet.',
    });
    const results = rankNotes([note], 'Where did I put my blue jacket?');
    expect(results.length).toBe(1);
    expect(results[0].confidence).toBe('strong');
  });
});

describe('rankNotes — empty input', () => {
  it('returns no results for empty query', () => {
    const note = makeNote({ id: 'a', transcript: 'I put my keys on the counter.' });
    expect(rankNotes([note], '')).toEqual([]);
  });

  it('returns no results for filler-only query', () => {
    const note = makeNote({ id: 'a', transcript: 'I put my keys on the counter.' });
    expect(rankNotes([note], 'where is the')).toEqual([]);
  });
});

describe('rankNotes — overmatch protection', () => {
  it('does NOT return a monkey note when asked about a key', () => {
    const monkeyNote = makeNote({
      id: 'm',
      transcript: 'We saw a monkey at the zoo.',
    });
    const results = rankNotes([monkeyNote], 'Where is my key?');
    expect(results.length).toBe(0);
  });

  it('does NOT confuse glasses with random "glass" prefix tokens elsewhere', () => {
    const fragileNote = makeNote({
      id: 'f',
      transcript: 'Be careful with the glassware on the top shelf.',
    });
    const results = rankNotes([fragileNote], 'where are my glasses');
    expect(results.length).toBe(0);
  });
});

describe('rankNotes — confidence', () => {
  it('weak single-term match is possible, not strong', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I put my keys on the counter.',
    });
    const results = rankNotes([note], 'Where are my keys?');
    expect(results[0].confidence).toBe('possible');
  });

  it('synonym-only single match is possible, not strong', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I put my keys on the counter.',
    });
    const results = rankNotes([note], 'where is my key');
    expect(results[0].confidence).toBe('possible');
  });

  it('two distinct meaningful matches yield strong confidence', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I put my keys on the kitchen counter.',
    });
    const results = rankNotes([note], 'keys counter');
    expect(results[0].confidence).toBe('strong');
  });

  it('phrase substring match yields strong confidence', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I put my keys on the counter.',
    });
    const results = rankNotes([note], 'on the counter');
    expect(results[0].confidence).toBe('strong');
  });

  it('fuzzy-only matches never produce strong confidence', () => {
    const note = makeNote({
      id: 'a',
      transcript: 'I left the medication beside the bed.',
    });
    const results = rankNotes([note], 'medicaton');
    if (results.length > 0) {
      expect(results[0].confidence).toBe('possible');
    }
  });
});

describe('rankNotes — recency tie-break', () => {
  it('prefers the more recent note when score is equal', () => {
    const older = makeNote({
      id: 'older',
      transcript: 'I put my keys on the counter.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });
    const newer = makeNote({
      id: 'newer',
      transcript: 'I put my keys on the counter.',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    });
    const results = rankNotes([older, newer], 'where are my keys');
    expect(results[0].note.id).toBe('newer');
  });
});
