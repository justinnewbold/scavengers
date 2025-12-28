import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications';

export interface NotificationSettings {
  enabled: boolean;
  huntReminders: boolean;
  teamUpdates: boolean;
  achievements: boolean;
  dailyChallenge: boolean;
}

export interface ScheduledNotification {
  id: string;
  type: 'hunt_reminder' | 'team_update' | 'achievement' | 'daily_challenge' | 'hunt_expiry';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  scheduledFor: number;
  notificationId?: string;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  huntReminders: true,
  teamUpdates: true,
  achievements: true,
  dailyChallenge: false,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    loadSettings();
    registerForPushNotifications();
    loadScheduledNotifications();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses (user tapped)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      handleNotificationResponse(data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const loadScheduledNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (stored) {
        const notifications: ScheduledNotification[] = JSON.parse(stored);
        // Filter out past notifications
        const upcoming = notifications.filter(n => n.scheduledFor > Date.now());
        setScheduledNotifications(upcoming);
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  };

  const saveScheduledNotifications = async (notifications: ScheduledNotification[]) => {
    try {
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(notifications));
      setScheduledNotifications(notifications);
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error);
    }
  };

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID,
      });

      setExpoPushToken(tokenData.data);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });

        await Notifications.setNotificationChannelAsync('hunt-reminders', {
          name: 'Hunt Reminders',
          description: 'Reminders about in-progress hunts',
          importance: Notifications.AndroidImportance.HIGH,
        });

        await Notifications.setNotificationChannelAsync('team-updates', {
          name: 'Team Updates',
          description: 'Updates from your team members',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  };

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  }, [settings]);

  const scheduleNotification = useCallback(async (
    notification: Omit<ScheduledNotification, 'notificationId'>
  ): Promise<string | null> => {
    if (!settings.enabled) return null;

    // Check if this type is enabled
    const typeSettings: Record<string, keyof NotificationSettings> = {
      hunt_reminder: 'huntReminders',
      team_update: 'teamUpdates',
      achievement: 'achievements',
      daily_challenge: 'dailyChallenge',
      hunt_expiry: 'huntReminders',
    };

    const settingKey = typeSettings[notification.type];
    if (settingKey && !settings[settingKey]) return null;

    try {
      const trigger = new Date(notification.scheduledFor);

      // Don't schedule if in the past
      if (trigger.getTime() <= Date.now()) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
        },
        trigger,
      });

      const scheduled: ScheduledNotification = {
        ...notification,
        notificationId,
      };

      const updated = [...scheduledNotifications, scheduled];
      await saveScheduledNotifications(updated);

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }, [settings, scheduledNotifications]);

  const cancelNotification = useCallback(async (id: string) => {
    const notification = scheduledNotifications.find(n => n.id === id);
    if (notification?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
    }

    const updated = scheduledNotifications.filter(n => n.id !== id);
    await saveScheduledNotifications(updated);
  }, [scheduledNotifications]);

  const cancelAllNotifications = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await saveScheduledNotifications([]);
  }, []);

  const handleNotificationResponse = (data: Record<string, unknown>) => {
    // Handle navigation based on notification data
    if (data.huntId) {
      // Navigate to hunt - this would integrate with navigation
      console.log('Navigate to hunt:', data.huntId);
    }
    if (data.achievementId) {
      console.log('Navigate to achievement:', data.achievementId);
    }
  };

  // Convenience methods for common notifications
  const scheduleHuntReminder = useCallback(async (
    huntId: string,
    huntName: string,
    reminderTime: Date
  ) => {
    return scheduleNotification({
      id: `hunt_reminder_${huntId}_${reminderTime.getTime()}`,
      type: 'hunt_reminder',
      title: 'Continue your hunt!',
      body: `Don't forget to complete "${huntName}" - your adventure awaits!`,
      data: { huntId },
      scheduledFor: reminderTime.getTime(),
    });
  }, [scheduleNotification]);

  const scheduleHuntExpiry = useCallback(async (
    huntId: string,
    huntName: string,
    expiryTime: Date
  ) => {
    // Schedule reminder 1 hour before expiry
    const reminderTime = new Date(expiryTime.getTime() - 60 * 60 * 1000);

    return scheduleNotification({
      id: `hunt_expiry_${huntId}`,
      type: 'hunt_expiry',
      title: 'Hunt ending soon!',
      body: `"${huntName}" expires in 1 hour. Finish up to earn your points!`,
      data: { huntId },
      scheduledFor: reminderTime.getTime(),
    });
  }, [scheduleNotification]);

  const notifyTeamProgress = useCallback(async (
    teamId: string,
    memberName: string,
    challengeCompleted: string
  ) => {
    // Immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Team Progress!',
        body: `${memberName} completed "${challengeCompleted}"`,
        data: { teamId },
      },
      trigger: null, // Immediate
    });
  }, []);

  const notifyAchievement = useCallback(async (
    achievementId: string,
    achievementName: string,
    points: number
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 Achievement Unlocked!',
        body: `${achievementName} - Earned ${points} points!`,
        data: { achievementId },
      },
      trigger: null,
    });
  }, []);

  return {
    settings,
    updateSettings,
    expoPushToken,
    scheduledNotifications,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    scheduleHuntReminder,
    scheduleHuntExpiry,
    notifyTeamProgress,
    notifyAchievement,
  };
}
