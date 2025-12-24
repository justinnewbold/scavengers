import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { isValidUUID } from '@/lib/auth';

// Store active connections per hunt
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// Interval for polling database updates (in production, use database triggers or pub/sub)
const POLL_INTERVAL = 3000; // 3 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  const { huntId } = await params;

  // Validate hunt ID
  if (!isValidUUID(huntId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid hunt ID format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add connection to the set for this hunt
      if (!connections.has(huntId)) {
        connections.set(huntId, new Set());
      }
      connections.get(huntId)!.add(controller);

      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'connected', huntId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Start polling for this hunt if not already
      startPolling(huntId);
    },
    cancel(controller) {
      // Remove connection when client disconnects
      connections.get(huntId)?.delete(controller);
      if (connections.get(huntId)?.size === 0) {
        connections.delete(huntId);
        stopPolling(huntId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// Track active polling intervals
const pollingIntervals = new Map<string, NodeJS.Timeout>();
const lastLeaderboardData = new Map<string, string>();

function startPolling(huntId: string) {
  if (pollingIntervals.has(huntId)) return;

  const interval = setInterval(async () => {
    try {
      const leaderboard = await fetchLeaderboard(huntId);
      const dataString = JSON.stringify(leaderboard);

      // Only send if data changed
      if (lastLeaderboardData.get(huntId) !== dataString) {
        lastLeaderboardData.set(huntId, dataString);
        broadcastToHunt(huntId, { type: 'update', data: leaderboard });
      }
    } catch (error) {
      console.error(`Error polling leaderboard for hunt ${huntId}:`, error);
    }
  }, POLL_INTERVAL);

  pollingIntervals.set(huntId, interval);

  // Send initial data immediately
  fetchLeaderboard(huntId)
    .then((leaderboard) => {
      lastLeaderboardData.set(huntId, JSON.stringify(leaderboard));
      broadcastToHunt(huntId, { type: 'update', data: leaderboard });
    })
    .catch((error) => {
      console.error(`Error fetching initial leaderboard for hunt ${huntId}:`, error);
    });
}

function stopPolling(huntId: string) {
  const interval = pollingIntervals.get(huntId);
  if (interval) {
    clearInterval(interval);
    pollingIntervals.delete(huntId);
    lastLeaderboardData.delete(huntId);
  }
}

function broadcastToHunt(huntId: string, data: unknown) {
  const huntConnections = connections.get(huntId);
  if (!huntConnections) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  for (const controller of huntConnections) {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      // Connection closed, remove it
      huntConnections.delete(controller);
    }
  }
}

async function fetchLeaderboard(huntId: string) {
  const result = await sql`
    SELECT
      p.id,
      p.user_id,
      p.score,
      p.status,
      p.started_at,
      p.completed_at,
      COALESCE(u.display_name, 'Anonymous') as display_name,
      u.avatar_url,
      (SELECT COUNT(*) FROM submissions s WHERE s.participant_id = p.id AND s.status = 'approved') as completed_challenges
    FROM participants p
    LEFT JOIN users u ON u.id::text = p.user_id
    WHERE p.hunt_id = ${huntId}
    ORDER BY p.score DESC, p.completed_at ASC NULLS LAST
    LIMIT 100
  `;

  return result.rows.map((row, index) => ({
    rank: index + 1,
    participantId: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    score: row.score,
    status: row.status,
    completedChallenges: Number(row.completed_challenges),
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }));
}

// Utility function to trigger an update (can be called from other routes)
export function triggerLeaderboardUpdate(huntId: string) {
  if (connections.has(huntId)) {
    fetchLeaderboard(huntId)
      .then((leaderboard) => {
        lastLeaderboardData.set(huntId, JSON.stringify(leaderboard));
        broadcastToHunt(huntId, { type: 'update', data: leaderboard });
      })
      .catch((error) => {
        console.error(`Error triggering leaderboard update for hunt ${huntId}:`, error);
      });
  }
}
