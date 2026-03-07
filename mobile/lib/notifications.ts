import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-checkin', {
      name: 'Daily Check-in',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyCheckin(hour = 20, minute = 0): Promise<string> {
  // Cancel any existing check-in notifications first
  await cancelDailyCheckin();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Check-in',
      body: 'How was your day? Tap to log your check-in. (60 seconds)',
      data: { screen: '/(tabs)/journal' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

export async function cancelDailyCheckin(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.screen === '/(tabs)/journal') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleRetestReminder(retestDate: Date): Promise<void> {
  const reminderDate = new Date(retestDate);
  reminderDate.setDate(reminderDate.getDate() - 5);

  if (reminderDate > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bloodwork Re-test Coming Up',
        body: 'Your 30-day re-test is in 5 days. Time to schedule your bloodwork.',
        data: { screen: '/bloodwork/upload' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });
  }
}
