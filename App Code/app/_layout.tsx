import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDb } from '@/db/client';
import { colors, fontSizes, spacing } from '@/theme';
import {
  ensureNotificationPermission,
  scheduleDailyReviewReminders,
} from '@/lib/notifications';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start the app');
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const ok = await ensureNotificationPermission();
      if (ok) {
        try {
          await scheduleDailyReviewReminders();
        } catch {
          /* non-fatal */
        }
      }
    })();
  }, [ready]);

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.fallback}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={styles.fallback}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
            headerTintColor: colors.primary,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="new-note"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="notes/[id]" options={{ title: 'Note' }} />
          <Stack.Screen name="ask-notes" options={{ title: 'Ask My Notes' }} />
          <Stack.Screen
            name="routine/new"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="routine/[id]"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  errorBody: { fontSize: fontSizes.md, color: colors.textMuted, textAlign: 'center' },
});
