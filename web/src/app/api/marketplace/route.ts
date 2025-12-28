import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MarketplaceHunt {
  id: string;
  title: string;
  description: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challenge_count: number;
  estimated_duration: number;
  creator_id: string;
  creator_name: string;
  creator_avatar?: string;
  rating: number;
  review_count: number;
  play_count: number;
  featured: boolean;
  published_at: string;
  tags: string[];
  preview_image?: string;
}

// GET - Browse marketplace hunts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const theme = searchParams.get('theme');
    const difficulty = searchParams.get('difficulty');
    const sort = searchParams.get('sort') || 'popular';
    const featured = searchParams.get('featured') === 'true';
    const creatorId = searchParams.get('creator');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let dbQuery = supabase
      .from('hunts')
      .select(`
        id,
        title,
        description,
        theme,
        difficulty,
        challenges,
        estimated_duration,
        created_by,
        is_public,
        featured,
        published_at,
        tags,
        preview_image,
        creator:users!created_by(id, display_name, avatar_url)
      `)
      .eq('is_public', true)
      .eq('is_template', true);

    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (theme) {
      dbQuery = dbQuery.eq('theme', theme);
    }

    if (difficulty) {
      dbQuery = dbQuery.eq('difficulty', difficulty);
    }

    if (featured) {
      dbQuery = dbQuery.eq('featured', true);
    }

    if (creatorId) {
      dbQuery = dbQuery.eq('created_by', creatorId);
    }

    // Apply sorting
    switch (sort) {
      case 'popular':
        dbQuery = dbQuery.order('play_count', { ascending: false });
        break;
      case 'rating':
        dbQuery = dbQuery.order('avg_rating', { ascending: false });
        break;
      case 'recent':
        dbQuery = dbQuery.order('published_at', { ascending: false });
        break;
      case 'trending':
        // Would need a more complex query for trending
        dbQuery = dbQuery.order('play_count', { ascending: false });
        break;
    }

    dbQuery = dbQuery.range((page - 1) * limit, page * limit - 1);

    const { data: hunts, error, count } = await dbQuery;

    if (error) {
      console.error('Marketplace fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch marketplace' }, { status: 500 });
    }

    // Get ratings for each hunt
    const huntIds = hunts?.map(h => h.id) || [];
    const { data: ratings } = await supabase
      .from('hunt_reviews')
      .select('hunt_id, rating')
      .in('hunt_id', huntIds);

    const ratingMap = (ratings || []).reduce((acc, r) => {
      if (!acc[r.hunt_id]) acc[r.hunt_id] = { sum: 0, count: 0 };
      acc[r.hunt_id].sum += r.rating;
      acc[r.hunt_id].count++;
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    // Get play counts
    const { data: playCounts } = await supabase
      .from('participations')
      .select('hunt_id')
      .in('hunt_id', huntIds);

    const playCountMap = (playCounts || []).reduce((acc, p) => {
      acc[p.hunt_id] = (acc[p.hunt_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transform to marketplace format
    const marketplaceHunts: MarketplaceHunt[] = (hunts || []).map((hunt: any) => ({
      id: hunt.id,
      title: hunt.title,
      description: hunt.description,
      theme: hunt.theme,
      difficulty: hunt.difficulty,
      challenge_count: Array.isArray(hunt.challenges) ? hunt.challenges.length : 0,
      estimated_duration: hunt.estimated_duration || 30,
      creator_id: hunt.created_by,
      creator_name: hunt.creator?.display_name || 'Anonymous',
      creator_avatar: hunt.creator?.avatar_url,
      rating: ratingMap[hunt.id] ? ratingMap[hunt.id].sum / ratingMap[hunt.id].count : 0,
      review_count: ratingMap[hunt.id]?.count || 0,
      play_count: playCountMap[hunt.id] || 0,
      featured: hunt.featured || false,
      published_at: hunt.published_at,
      tags: hunt.tags || [],
      preview_image: hunt.preview_image,
    }));

    // Get featured hunts if on first page
    let featuredHunts: MarketplaceHunt[] = [];
    if (page === 1 && !featured) {
      const { data: featuredData } = await supabase
        .from('hunts')
        .select('*')
        .eq('is_public', true)
        .eq('featured', true)
        .limit(5);

      featuredHunts = (featuredData || []).map((h: any) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        theme: h.theme,
        difficulty: h.difficulty,
        challenge_count: Array.isArray(h.challenges) ? h.challenges.length : 0,
        estimated_duration: h.estimated_duration || 30,
        creator_id: h.created_by,
        creator_name: 'Creator',
        rating: 4.5,
        review_count: 0,
        play_count: playCountMap[h.id] || 0,
        featured: true,
        published_at: h.published_at,
        tags: h.tags || [],
      }));
    }

    // Get available themes for filtering
    const { data: themes } = await supabase
      .from('hunts')
      .select('theme')
      .eq('is_public', true);

    const uniqueThemes = [...new Set((themes || []).map(t => t.theme).filter(Boolean))];

    return NextResponse.json({
      hunts: marketplaceHunts,
      featured: featuredHunts,
      themes: uniqueThemes,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (count || 0) > page * limit,
      },
    });
  } catch (error) {
    console.error('Marketplace error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Publish hunt to marketplace or submit review
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
    const { action, hunt_id, rating, review_text, tags } = body;

    if (action === 'publish') {
      // Publish hunt to marketplace
      if (!hunt_id) {
        return NextResponse.json({ error: 'Missing hunt_id' }, { status: 400 });
      }

      // Verify ownership
      const { data: hunt, error: huntError } = await supabase
        .from('hunts')
        .select('*')
        .eq('id', hunt_id)
        .eq('created_by', user.id)
        .single();

      if (huntError || !hunt) {
        return NextResponse.json({ error: 'Hunt not found or not owned by you' }, { status: 404 });
      }

      // Update hunt to be public and a template
      const { error: updateError } = await supabase
        .from('hunts')
        .update({
          is_public: true,
          is_template: true,
          published_at: new Date().toISOString(),
          tags: tags || [],
        })
        .eq('id', hunt_id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to publish hunt' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Hunt published to marketplace' });
    }

    if (action === 'review') {
      // Submit a review
      if (!hunt_id || !rating) {
        return NextResponse.json({ error: 'Missing hunt_id or rating' }, { status: 400 });
      }

      if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }

      // Check if user has played this hunt
      const { data: participation } = await supabase
        .from('participations')
        .select('id')
        .eq('hunt_id', hunt_id)
        .eq('user_id', user.id)
        .single();

      if (!participation) {
        return NextResponse.json({ error: 'You must play a hunt before reviewing it' }, { status: 400 });
      }

      // Check for existing review
      const { data: existingReview } = await supabase
        .from('hunt_reviews')
        .select('id')
        .eq('hunt_id', hunt_id)
        .eq('user_id', user.id)
        .single();

      if (existingReview) {
        // Update existing review
        await supabase
          .from('hunt_reviews')
          .update({ rating, review_text, updated_at: new Date().toISOString() })
          .eq('id', existingReview.id);
      } else {
        // Create new review
        await supabase
          .from('hunt_reviews')
          .insert({
            hunt_id,
            user_id: user.id,
            rating,
            review_text,
            created_at: new Date().toISOString(),
          });
      }

      return NextResponse.json({ success: true, message: 'Review submitted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Marketplace POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
