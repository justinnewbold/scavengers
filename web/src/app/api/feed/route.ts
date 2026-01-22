import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

interface FeedRow {
  submission_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  hunt_title: string;
  challenge_title: string;
  photo_url: string | null;
  submission_data: Record<string, unknown>;
  points_awarded: number;
  created_at: string;
  fire_count: string;
  laugh_count: string;
  wow_count: string;
  love_count: string;
  clap_count: string;
  user_reaction: string | null;
}

// GET /api/feed - Get photo feed
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const filter = searchParams.get('filter') || 'all'; // 'all', 'following', 'mine'

    // Build query based on filter
    let filterCondition = '';
    if (filter === 'mine') {
      filterCondition = `AND u.id = '${auth.user.id}'`;
    }
    // Note: 'following' would require a followers table - skip for now

    const result = await sql<FeedRow>`
      SELECT
        s.id as submission_id,
        u.id as user_id,
        u.display_name,
        u.avatar_url,
        h.title as hunt_title,
        c.title as challenge_title,
        (s.submission_data->>'photoUrl') as photo_url,
        s.submission_data,
        s.points_awarded,
        s.created_at,
        COALESCE(
          (SELECT COUNT(*) FROM reactions r WHERE r.submission_id = s.id AND r.reaction_type = 'fire'),
          0
        ) as fire_count,
        COALESCE(
          (SELECT COUNT(*) FROM reactions r WHERE r.submission_id = s.id AND r.reaction_type = 'laugh'),
          0
        ) as laugh_count,
        COALESCE(
          (SELECT COUNT(*) FROM reactions r WHERE r.submission_id = s.id AND r.reaction_type = 'wow'),
          0
        ) as wow_count,
        COALESCE(
          (SELECT COUNT(*) FROM reactions r WHERE r.submission_id = s.id AND r.reaction_type = 'love'),
          0
        ) as love_count,
        COALESCE(
          (SELECT COUNT(*) FROM reactions r WHERE r.submission_id = s.id AND r.reaction_type = 'clap'),
          0
        ) as clap_count,
        (SELECT reaction_type FROM reactions r WHERE r.submission_id = s.id AND r.user_id = ${auth.user.id} LIMIT 1) as user_reaction
      FROM submissions s
      INNER JOIN participants p ON s.participant_id = p.id
      INNER JOIN users u ON p.user_id = u.id
      INNER JOIN challenges c ON s.challenge_id = c.id
      INNER JOIN hunts h ON c.hunt_id = h.id
      WHERE s.status = 'approved'
        AND s.submission_type = 'photo'
        AND (s.submission_data->>'photoUrl' IS NOT NULL OR s.submission_data->>'photoData' IS NOT NULL)
        ${filter === 'mine' ? sql`AND u.id = ${auth.user.id}` : sql``}
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Transform to FeedItem format
    const feedItems = result.rows.map((row) => ({
      id: row.submission_id,
      submission_id: row.submission_id,
      user_id: row.user_id,
      display_name: row.display_name || 'Anonymous',
      avatar_url: row.avatar_url,
      hunt_title: row.hunt_title,
      challenge_title: row.challenge_title,
      photo_url: row.photo_url || (row.submission_data as Record<string, string>)?.photoData,
      points_awarded: row.points_awarded,
      created_at: row.created_at,
      reactions: {
        fire: parseInt(row.fire_count) || 0,
        laugh: parseInt(row.laugh_count) || 0,
        wow: parseInt(row.wow_count) || 0,
        love: parseInt(row.love_count) || 0,
        clap: parseInt(row.clap_count) || 0,
        total:
          (parseInt(row.fire_count) || 0) +
          (parseInt(row.laugh_count) || 0) +
          (parseInt(row.wow_count) || 0) +
          (parseInt(row.love_count) || 0) +
          (parseInt(row.clap_count) || 0),
      },
      user_reaction: row.user_reaction || undefined,
    }));

    return NextResponse.json({
      feed: feedItems,
      pagination: {
        page,
        limit,
        hasMore: feedItems.length === limit,
      },
    });
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
