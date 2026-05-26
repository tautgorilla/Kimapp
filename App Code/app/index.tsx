import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { colors, fontSizes, radii, spacing } from '@/theme';
import { RoutineCard } from '@/components/RoutineCard';
import { NoteCard } from '@/components/NoteCard';
import {
  listTodaysRoutineCards,
  markRoutineCardDone,
  undoRoutineCardDone,
  type RoutineCardEntry,
} from '@/services/routineCards';
import { listNotes } from '@/services/note';
import type { Note } from '@/db/schema';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGES = ['today', 'notes'] as const;

type TodayListItem =
  | { kind: 'header'; label: string; key: string }
  | { kind: 'card'; entry: RoutineCardEntry; key: string };

function sectionLabel(section: string): string {
  switch (section) {
    case 'morning': return 'Morning';
    case 'afternoon': return 'Afternoon';
    case 'evening': return 'Evening';
    case 'leaving_home': return 'Before leaving home';
    case 'bedtime': return 'Bedtime';
    case 'custom': return 'Other';
    default: return section;
  }
}

function buildListData(entries: RoutineCardEntry[]): TodayListItem[] {
  const items: TodayListItem[] = [];
  let lastSection: string | null = null;
  for (const entry of entries) {
    const section = entry.card.section;
    if (section && section !== lastSection) {
      items.push({ kind: 'header', label: sectionLabel(section), key: `header-${section}` });
      lastSection = section;
    }
    items.push({ kind: 'card', entry, key: entry.card.id });
  }
  return items;
}

export default function Home() {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [entries, setEntries] = useState<RoutineCardEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList<(typeof PAGES)[number]>>(null);

  const refresh = useCallback(async () => {
    const [c, n] = await Promise.all([listTodaysRoutineCards(), listNotes()]);
    setEntries(c);
    setNotes(n);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onToggle = useCallback(
    async (entry: RoutineCardEntry) => {
      if (entry.status === 'done') {
        await undoRoutineCardDone(entry.card.id);
      } else {
        await markRoutineCardDone(entry.card.id);
      }
      await refresh();
    },
    [refresh]
  );

  const onToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setPageIndex(viewableItems[0].index);
    }
  }).current;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPageIndex(idx);
  };

  const goNewNote = () => router.push('/new-note');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(p) => p}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) =>
          item === 'today' ? (
            <TodayPage
              entries={entries}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onToggleExpand={onToggleExpand}
              canSwipeToNotes={notes.length > 0}
              onAsk={() => router.push('/ask-notes')}
              onAddRoutine={() => router.push('/routine/new' as Href)}
              onEditRoutine={(id) => router.push(`/routine/${id}` as Href)}
            />
          ) : (
            <NotesPage
              notes={notes}
              onOpen={(id) => router.push(`/notes/${id}`)}
              onAsk={() => router.push('/ask-notes')}
            />
          )
        }
      />
      <View style={styles.dotsRow} pointerEvents="none">
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === pageIndex && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.ctaWrap} pointerEvents="box-none">
        <Pressable
          onPress={goNewNote}
          accessibilityRole="button"
          accessibilityLabel="Create a new note"
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
        >
          <Text style={styles.ctaPlus}>＋</Text>
          <Text style={styles.ctaLabel}>New Note</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function TodayPage({
  entries,
  expandedIds,
  onToggle,
  onToggleExpand,
  canSwipeToNotes,
  onAsk,
  onAddRoutine,
  onEditRoutine,
}: {
  entries: RoutineCardEntry[];
  expandedIds: Set<string>;
  onToggle: (e: RoutineCardEntry) => void;
  onToggleExpand: (id: string) => void;
  canSwipeToNotes: boolean;
  onAsk: () => void;
  onAddRoutine: () => void;
  onEditRoutine: (id: string) => void;
}) {
  const remaining = entries.filter((e) => e.status !== 'done').length;
  const total = entries.length;
  const listData = buildListData(entries);

  return (
    <View style={[styles.page, { width: SCREEN_W }]}>
      <View style={styles.headerBlock}>
        <Text style={styles.dateLabel}>{formatToday()}</Text>
        <Text style={styles.title}>Today's routine</Text>
        <Text style={styles.subtitle}>
          {remaining === 0 && total > 0
            ? 'All done — nice work.'
            : `${remaining} of ${total} left`}
        </Text>
        <Pressable
          onPress={onAsk}
          accessibilityRole="button"
          accessibilityLabel="Ask saved notes"
          style={({ pressed }) => [styles.askInline, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.askInlineLabel}>Ask saved notes</Text>
        </Pressable>
      </View>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.sectionHeader}>{item.label}</Text>;
          }
          return (
            <RoutineCard
              entry={item.entry}
              expanded={expandedIds.has(item.entry.card.id)}
              onToggleExpand={() => onToggleExpand(item.entry.card.id)}
              onMarkDone={() => onToggle(item.entry)}
              onUndoDone={() => onToggle(item.entry)}
              onEdit={() => onEditRoutine(item.entry.card.id)}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Tap "Add routine" below to add your first routine step.</Text>
        }
        ListFooterComponent={
          <Pressable
            onPress={onAddRoutine}
            accessibilityRole="button"
            accessibilityLabel="Add a routine card"
            style={({ pressed }) => [styles.addRoutineBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.addRoutineBtnLabel}>+ Add routine</Text>
          </Pressable>
        }
      />
      {canSwipeToNotes && (
        <Text style={styles.swipeHint}>Swipe left to see your notes →</Text>
      )}
    </View>
  );
}

function NotesPage({
  notes,
  onOpen,
  onAsk,
}: {
  notes: Note[];
  onOpen: (id: string) => void;
  onAsk: () => void;
}) {
  return (
    <View style={[styles.page, { width: SCREEN_W }]}>
      <View style={styles.headerBlock}>
        <View style={styles.notesHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>← Swipe right for today</Text>
            <Text style={styles.title}>Your notes</Text>
          </View>
          <Pressable
            onPress={onAsk}
            accessibilityRole="button"
            accessibilityLabel="Ask My Notes"
            style={({ pressed }) => [styles.askBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.askBtnLabel}>Ask My Notes</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {notes.length === 0
            ? 'Tap the blue button below to start one.'
            : `${notes.length} note${notes.length === 1 ? '' : 's'} saved`}
        </Text>
      </View>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <NoteCard note={item} onPress={() => onOpen(item.id)} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No notes yet.</Text>
            <Text style={styles.emptyHint}>Tap "New Note" below to create one.</Text>
          </View>
        }
      />
    </View>
  );
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    paddingTop: spacing.md,
  },
  headerBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  askBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.xs,
  },
  askBtnLabel: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  askInline: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  askInlineLabel: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  dateLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
  },
  sectionHeader: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 200,
  },
  empty: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  emptyWrap: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  addRoutineBtn: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addRoutineBtnLabel: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  swipeHint: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 180,
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 144,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 28,
  },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    alignItems: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
    minHeight: 64,
  },
  ctaPlus: {
    color: '#FFFFFF',
    fontSize: fontSizes.xl,
    fontWeight: '300',
    marginTop: -4,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
});
