import { listNotes } from './note';
import { rankNotes, type NoteSearchResult } from './noteRetrievalScoring';

export type {
  NoteSearchResult,
  MatchConfidence,
} from './noteRetrievalScoring';

export {
  formatRecordedAt,
  buildAnswerText,
  normalizeText,
  extractSearchTerms,
} from './noteRetrievalScoring';

export async function searchNotesForMemory(query: string): Promise<NoteSearchResult[]> {
  const notes = await listNotes();
  return rankNotes(notes, query);
}
