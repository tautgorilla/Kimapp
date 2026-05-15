import * as Notifications from 'expo-notifications';

const MIDDAY_ID = 'daily-review-midday';
const EVENING_ID = 'daily-review-evening';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
    },
  });
  return result.granted;
}

export async function scheduleDailyReviewReminders(): Promise<void> {
  await cancelDailyReviewReminders();

  await Notifications.scheduleNotificationAsync({
    identifier: MIDDAY_ID,
    content: {
      title: 'Time to review your notes',
      body: 'Open Kimapp to see what you wrote earlier today.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 12,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    identifier: EVENING_ID,
    content: {
      title: 'Review your notes from today',
      body: 'Open Kimapp to look back at your notes before bed.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelDailyReviewReminders(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MIDDAY_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(EVENING_ID).catch(() => {});
}
