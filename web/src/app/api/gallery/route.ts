import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption?: string;
  challenge_title: string;
  hunt_title: string;
  created_at: string;
  is_favorite: boolean;
}

// GET - Fetch user's photo gallery
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const huntId = searchParams.get('hunt_id');
    const favoritesOnly = searchParams.get('favorites') === 'true';

    let query = supabase
      .from('submissions')
      .select(`
        id,
        photo_url,
        caption,
        created_at,
        is_favorite,
        challenge_index,
        hunt:hunts!inner(id, title, challenges)
      `)
      .eq('user_id', user.id)
      .not('photo_url', 'is', null)
      .order('created_at', { ascending: false });

    if (huntId) {
      query = query.eq('hunt_id', huntId);
    }

    if (favoritesOnly) {
      query = query.eq('is_favorite', true);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Gallery fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }

    // Transform data to gallery format
    const photos: GalleryPhoto[] = (submissions || []).map((sub: any) => {
      const challenges = sub.hunt?.challenges || [];
      const challenge = challenges[sub.challenge_index] || {};

      return {
        id: sub.id,
        photo_url: sub.photo_url,
        caption: sub.caption,
        challenge_title: challenge.title || `Challenge ${sub.challenge_index + 1}`,
        hunt_title: sub.hunt?.title || 'Unknown Hunt',
        created_at: sub.created_at,
        is_favorite: sub.is_favorite || false,
      };
    });

    // Group by hunt for organized view
    const groupedByHunt = photos.reduce((acc, photo) => {
      if (!acc[photo.hunt_title]) {
        acc[photo.hunt_title] = [];
      }
      acc[photo.hunt_title].push(photo);
      return acc;
    }, {} as Record<string, GalleryPhoto[]>);

    return NextResponse.json({
      photos,
      grouped: groupedByHunt,
      total: photos.length,
      favorites_count: photos.filter(p => p.is_favorite).length,
    });
  } catch (error) {
    console.error('Gallery error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update photo (caption, favorite status)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { photo_id, caption, is_favorite } = body;

    if (!photo_id) {
      return NextResponse.json({ error: 'Missing photo_id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (caption !== undefined) updates.caption = caption;
    if (is_favorite !== undefined) updates.is_favorite = is_favorite;

    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', photo_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }

    return NextResponse.json({ photo: data });
  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate shareable memory (collage/slideshow)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { hunt_id, photo_ids, title, type } = body;

    if (!hunt_id || !photo_ids?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get hunt details
    const { data: hunt } = await supabase
      .from('hunts')
      .select('title, theme')
      .eq('id', hunt_id)
      .single();

    // Get selected photos
    const { data: photos } = await supabase
      .from('submissions')
      .select('id, photo_url, caption, created_at')
      .in('id', photo_ids)
      .eq('user_id', user.id);

    // Create shareable memory record
    const { data: memory, error: memoryError } = await supabase
      .from('hunt_memories')
      .insert({
        user_id: user.id,
        hunt_id,
        title: title || `${hunt?.title || 'Hunt'} Memories`,
        photo_ids,
        type: type || 'collage',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Memory creation error:', memoryError);
      return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
    }

    // Generate share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/memory/${memory.id}`;

    return NextResponse.json({
      memory: {
        id: memory.id,
        title: memory.title,
        photos: photos || [],
        share_url: shareUrl,
        hunt_title: hunt?.title,
        created_at: memory.created_at,
      },
    });
  } catch (error) {
    console.error('Create memory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
