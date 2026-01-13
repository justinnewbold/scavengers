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

// Expo Push Notification Service URL
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  ttl?: number;
  expiration?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Send push notification to user's devices
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; tickets?: ExpoPushTicket[]; error?: string }> {
  try {
    // Get user's push tokens
    const result = await sql`
      SELECT token, platform FROM push_tokens
      WHERE user_id = ${userId}
    `;

    if (result.rows.length === 0) {
      return { success: true }; // No tokens to send to
    }

    // Build messages for each token
    const messages: ExpoPushMessage[] = result.rows
      .filter(row => row.token && isValidExpoPushToken(row.token))
      .map(row => ({
        to: row.token,
        sound: 'default' as const,
        title,
        body,
        data,
        priority: 'high' as const,
        channelId: 'default',
      }));

    if (messages.length === 0) {
      return { success: true }; // No valid tokens
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sending push notifications:', { userId, title, body, messageCount: messages.length });
    }

    // Send to Expo Push Service (batch up to 100 at a time)
    const tickets: ExpoPushTicket[] = [];
    const chunks = chunkArray(messages, 100);

    for (const chunk of chunks) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Expo push error:', response.status, errorText);
        return { success: false, error: `Expo push failed: ${response.status}` };
      }

      const responseData = await response.json();
      tickets.push(...(responseData.data || []));
    }

    // Handle failed tickets and potentially remove invalid tokens
    await handlePushTickets(userId, result.rows, tickets);

    return { success: true, tickets };
  } catch (error) {
    console.error('Push notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Validate Expo push token format
function isValidExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
}

// Split array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Handle push tickets - remove invalid tokens
async function handlePushTickets(
  userId: string,
  tokens: { token: string; platform: string }[],
  tickets: ExpoPushTicket[]
): Promise<void> {
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const tokenInfo = tokens[i];

    if (ticket.status === 'error') {
      console.error('Push ticket error:', ticket.message, ticket.details);

      // Remove invalid tokens
      if (ticket.details?.error === 'DeviceNotRegistered' && tokenInfo) {
        console.log('Removing invalid push token for user:', userId);
        await sql`
          DELETE FROM push_tokens
          WHERE user_id = ${userId} AND token = ${tokenInfo.token}
        `;
      }
    }
  }
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
