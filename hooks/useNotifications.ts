import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

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

      // Get project ID from Expo config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        || process.env.EXPO_PROJECT_ID;

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      setExpoPushToken(token);

      // Register token with backend server
      await registerTokenWithServer(token);

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

      return token;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  };

  // Register push token with the backend server
  const registerTokenWithServer = async (token: string) => {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) {
        // User not logged in, save token for later registration
        await AsyncStorage.setItem('pending_push_token', token);
        return;
      }

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      const response = await fetch(`${API_BASE}/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token, platform }),
      });

      if (response.ok) {
        // Clear any pending token
        await AsyncStorage.removeItem('pending_push_token');
        console.log('Push token registered with server');
      } else {
        console.error('Failed to register push token:', await response.text());
      }
    } catch (error) {
      console.error('Error registering push token with server:', error);
    }
  };

  // Register any pending push token (call after login)
  const registerPendingToken = useCallback(async () => {
    const pendingToken = await AsyncStorage.getItem('pending_push_token');
    if (pendingToken) {
      await registerTokenWithServer(pendingToken);
    } else if (expoPushToken) {
      await registerTokenWithServer(expoPushToken);
    }
  }, [expoPushToken]);

  // Unregister push token from server (call on logout)
  const unregisterFromServer = useCallback(async () => {
    if (!expoPushToken) return;

    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) return;

      await fetch(`${API_BASE}/push/register?token=${encodeURIComponent(expoPushToken)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      console.log('Push token unregistered from server');
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }, [expoPushToken]);

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
      const triggerDate = new Date(notification.scheduledFor);

      // Don't schedule if in the past
      if (triggerDate.getTime() <= Date.now()) return null;

      // Calculate seconds from now
      const seconds = Math.floor((triggerDate.getTime() - Date.now()) / 1000);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
        },
        trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
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

  const handleNotificationResponse = useCallback((data: Record<string, unknown>) => {
    // Handle navigation based on notification data
    const notificationType = data.type as string | undefined;

    // Small delay to ensure app is fully loaded
    setTimeout(() => {
      try {
        if (data.huntId) {
          // Navigate to hunt play screen or details based on context
          if (notificationType === 'competition_update' || notificationType === 'hunt_reminder') {
            router.push(`/play/${data.huntId}`);
          } else {
            router.push(`/hunt/${data.huntId}`);
          }
        } else if (data.achievementId) {
          // Navigate to achievements screen
          router.push('/achievements');
        } else if (data.teamId) {
          // Navigate to teams screen
          router.push('/teams');
        } else if (notificationType === 'streak_reminder' || notificationType === 'daily_reminder') {
          // Navigate to home/discover to start a hunt
          router.push('/(tabs)');
        }
      } catch (error) {
        console.error('Failed to navigate from notification:', error);
      }
    }, 100);
  }, []);

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

  // Schedule streak expiry warning
  const scheduleStreakReminder = useCallback(async (
    streakCount: number,
    expiresAt: Date
  ) => {
    if (!settings.enabled || !settings.huntReminders) return null;

    // Schedule reminder 30 minutes before expiry
    const reminderTime = new Date(expiresAt.getTime() - 30 * 60 * 1000);
    if (reminderTime.getTime() <= Date.now()) return null;

    const seconds = Math.floor((reminderTime.getTime() - Date.now()) / 1000);

    try {
      // Cancel any existing streak reminder
      const existingReminder = scheduledNotifications.find(n => n.id === 'streak_reminder');
      if (existingReminder?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(existingReminder.notificationId);
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Streak expiring soon!',
          body: `Your ${streakCount}-streak expires in 30 mins! Complete a challenge to keep it going.`,
          data: { type: 'streak_reminder' },
          sound: true,
        },
        trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
      });

      const scheduled: ScheduledNotification = {
        id: 'streak_reminder',
        type: 'hunt_reminder',
        title: 'Streak expiring soon!',
        body: `Your ${streakCount}-streak expires in 30 mins!`,
        data: { type: 'streak_reminder' },
        scheduledFor: reminderTime.getTime(),
        notificationId,
      };

      const updated = scheduledNotifications.filter(n => n.id !== 'streak_reminder');
      updated.push(scheduled);
      await saveScheduledNotifications(updated);

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule streak reminder:', error);
      return null;
    }
  }, [settings, scheduledNotifications]);

  // Notify when behind in multiplayer
  const notifyBehindInHunt = useCallback(async (
    huntId: string,
    huntName: string,
    playerName: string,
    challengesAhead: number
  ) => {
    if (!settings.enabled || !settings.teamUpdates) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `You're ${challengesAhead} behind!`,
        body: `${playerName} is pulling ahead in "${huntName}". Time to catch up!`,
        data: { huntId, type: 'competition_update' },
        sound: true,
      },
      trigger: null,
    });
  }, [settings]);

  // Daily streak reminder
  const scheduleDailyReminder = useCallback(async (
    currentStreak: number,
    reminderHour: number = 18 // 6 PM default
  ) => {
    if (!settings.enabled || !settings.dailyChallenge) return null;

    // Cancel existing daily reminder
    const existing = scheduledNotifications.find(n => n.id === 'daily_reminder');
    if (existing?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
    }

    // Schedule for today or tomorrow at the specified hour
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(reminderHour, 0, 0, 0);

    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const seconds = Math.floor((reminderTime.getTime() - Date.now()) / 1000);

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: currentStreak > 0 ? `🔥 Keep your ${currentStreak}-day streak!` : '🗺️ Ready for an adventure?',
          body: currentStreak > 0
            ? 'Play a quick hunt to maintain your streak!'
            : 'Start a quick solo hunt and earn some points!',
          data: { type: 'daily_reminder' },
          sound: true,
        },
        trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
      return null;
    }
  }, [settings, scheduledNotifications]);

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
    scheduleStreakReminder,
    notifyBehindInHunt,
    scheduleDailyReminder,
    registerPendingToken,
    unregisterFromServer,
  };
}
