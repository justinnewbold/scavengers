import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Update player location
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const body = await request.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Location required' }, { status: 400 });
    }

    // Get player
    const playerResult = await db.query(
      'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, user.id]
    );

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const player = playerResult.rows[0];

    // Calculate zone (grid-based)
    const zone = calculateZone(latitude, longitude);

    // Update player location
    await db.query(
      `UPDATE tag_players
       SET last_latitude = $1,
           last_longitude = $2,
           location_updated_at = NOW(),
           current_zone = $3,
           zone_updated_at = NOW()
       WHERE id = $4`,
      [latitude, longitude, zone, player.id]
    );

    // Check for triggered sabotages
    const sabotageResult = await db.query(
      `SELECT * FROM tag_sabotages
       WHERE tag_game_id = $1
       AND deployed_by != $2
       AND triggered = FALSE
       AND expires_at > NOW()`,
      [gameId, user.id]
    );

    const triggeredSabotages = [];

    for (const sabotage of sabotageResult.rows) {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(sabotage.latitude),
        parseFloat(sabotage.longitude)
      );

      if (distance <= sabotage.radius_meters) {
        // Trigger the sabotage
        await db.query(
          `UPDATE tag_sabotages
           SET triggered = TRUE, triggered_by = $1, triggered_at = NOW()
           WHERE id = $2`,
          [user.id, sabotage.id]
        );

        // Apply sabotage effect
        await applySabotageEffect(gameId, player.id, sabotage);
        triggeredSabotages.push(sabotage);

        // Log event
        await db.query(
          `INSERT INTO tag_events (tag_game_id, event_type, actor_id, target_id, data)
           VALUES ($1, 'sabotage_triggered', $2, $3, $4)`,
          [gameId, sabotage.deployed_by, user.id, JSON.stringify({ type: sabotage.sabotage_type })]
        );
      }
    }

    // Check if in safe zone
    const safeZoneResult = await db.query(
      `SELECT * FROM tag_safe_zones
       WHERE tag_game_id = $1
       AND (
         (active_start_hour IS NULL) OR
         (EXTRACT(HOUR FROM NOW()) BETWEEN active_start_hour AND active_end_hour)
       )`,
      [gameId]
    );

    let inSafeZone = false;
    let currentSafeZone = null;

    for (const zone of safeZoneResult.rows) {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(zone.latitude),
        parseFloat(zone.longitude)
      );
      if (distance <= zone.radius_meters) {
        inSafeZone = true;
        currentSafeZone = zone;
        break;
      }
    }

    // Get nearby players (within 500m) for proximity alerts
    const nearbyResult = await db.query(
      `SELECT tp.*, u.display_name
       FROM tag_players tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.tag_game_id = $1
       AND tp.user_id != $2
       AND tp.last_latitude IS NOT NULL
       AND tp.location_updated_at > NOW() - INTERVAL '5 minutes'
       AND (tp.stealth_until IS NULL OR tp.stealth_until < NOW())`,
      [gameId, user.id]
    );

    const nearbyPlayers = [];
    for (const other of nearbyResult.rows) {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(other.last_latitude),
        parseFloat(other.last_longitude)
      );

      if (distance <= 500) {
        nearbyPlayers.push({
          playerId: other.id,
          displayName: other.display_name,
          distance: Math.round(distance),
          zone: other.current_zone,
          role: other.role,
          // Only share exact location with allies
          location: player.alliance_id && player.alliance_id === other.alliance_id ? {
            latitude: parseFloat(other.last_latitude),
            longitude: parseFloat(other.last_longitude),
          } : null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      zone,
      inSafeZone,
      safeZone: currentSafeZone,
      nearbyPlayers,
      triggeredSabotages: triggeredSabotages.map(s => ({
        type: s.sabotage_type,
        effect: getSabotageEffect(s.sabotage_type),
      })),
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

// Calculate zone based on lat/lng (100m grid)
function calculateZone(lat: number, lng: number): string {
  const latZone = Math.floor(lat * 100);
  const lngZone = Math.floor(lng * 100);
  return `${latZone}_${lngZone}`;
}

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function applySabotageEffect(gameId: string, playerId: string, sabotage: {
  sabotage_type: string;
  data: Record<string, unknown>;
}) {
  switch (sabotage.sabotage_type) {
    case 'point_drain':
      await db.query(
        'UPDATE tag_players SET score = GREATEST(0, score - 50) WHERE id = $1',
        [playerId]
      );
      break;

    case 'speed_trap':
      // Store in sabotage data that this player has slow timers
      // Game logic will check this when calculating challenge time
      break;

    // Other effects handled client-side
  }
}

function getSabotageEffect(type: string): string {
  switch (type) {
    case 'decoy_challenge':
      return 'You attempted a fake challenge! Time wasted.';
    case 'location_scramble':
      return 'Your radar shows scrambled positions for 2 minutes.';
    case 'point_drain':
      return 'You lost 50 points!';
    case 'challenge_intercept':
      return 'Your next challenge completion credits someone else.';
    case 'speed_trap':
      return 'Your challenge timers are 50% slower for 2 minutes.';
    default:
      return 'You triggered a sabotage!';
  }
}
