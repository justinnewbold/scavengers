import { sql } from './db';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

// Create a notification in the database
export async function createNotification(payload: NotificationPayload): Promise<void> {
  await sql`
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (${payload.userId}, ${payload.type}, ${payload.title}, ${payload.body || null}, ${JSON.stringify(payload.data || {})})
  `;
}

// Send push notification to user's devices
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  // Get user's push tokens
  const result = await sql`
    SELECT token, platform FROM push_tokens
    WHERE user_id = ${userId}
  `;

  if (result.rows.length === 0) return;

  // In production, integrate with Expo Push Notification Service
  // For now, just log the notification
  if (process.env.NODE_ENV !== 'production') {
    console.log('Push notification:', { userId, title, body, data, tokens: result.rows });
  }

  // TODO: Implement actual push notification sending
  // For Expo: https://docs.expo.dev/push-notifications/sending-notifications/
  // const messages = result.rows.map(row => ({
  //   to: row.token,
  //   sound: 'default',
  //   title,
  //   body,
  //   data,
  // }));
  // await fetch('https://exp.host/--/api/v2/push/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(messages),
  // });
}

// Notification types
export const NotificationTypes = {
  HUNT_COMPLETED: 'hunt_completed',
  CHALLENGE_APPROVED: 'challenge_approved',
  CHALLENGE_REJECTED: 'challenge_rejected',
  PLAYER_JOINED: 'player_joined',
  ACHIEVEMENT_EARNED: 'achievement_earned',
  TEAM_INVITE: 'team_invite',
  HUNT_STARTING: 'hunt_starting',
  LEADERBOARD_UPDATE: 'leaderboard_update',
} as const;

// Helper to notify hunt creator when someone joins
export async function notifyPlayerJoined(
  huntId: string,
  creatorId: string,
  playerName: string
): Promise<void> {
  await createNotification({
    userId: creatorId,
    type: NotificationTypes.PLAYER_JOINED,
    title: 'New Player Joined!',
    body: `${playerName} joined your scavenger hunt`,
    data: { huntId },
  });

  await sendPushNotification(
    creatorId,
    'New Player Joined!',
    `${playerName} joined your scavenger hunt`,
    { huntId }
  );
}

// Helper to notify player of achievement
export async function notifyAchievementEarned(
  userId: string,
  achievementName: string,
  achievementId: string
): Promise<void> {
  await createNotification({
    userId,
    type: NotificationTypes.ACHIEVEMENT_EARNED,
    title: 'Achievement Unlocked!',
    body: `You earned the "${achievementName}" badge`,
    data: { achievementId },
  });

  await sendPushNotification(
    userId,
    'Achievement Unlocked! 🏆',
    `You earned the "${achievementName}" badge`,
    { achievementId }
  );
}
