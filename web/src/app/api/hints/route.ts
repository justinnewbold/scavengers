import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HintRequest {
  hunt_id: string;
  challenge_index: number;
  hint_level: 1 | 2 | 3; // 1 = subtle, 2 = moderate, 3 = direct
  user_location?: { lat: number; lng: number };
  previous_attempts?: string[];
}

const HINT_COSTS = {
  1: 5,   // Subtle hint costs 5 points
  2: 15,  // Moderate hint costs 15 points
  3: 30,  // Direct hint costs 30 points
};

// AI-powered hint generation based on challenge type
function generateHint(
  challenge: {
    type: string;
    title: string;
    description: string;
    hint?: string;
    answer?: string;
    location?: { lat: number; lng: number };
  },
  hintLevel: 1 | 2 | 3,
  userLocation?: { lat: number; lng: number },
  previousAttempts?: string[]
): string {
  const { type, title, description, hint, answer, location } = challenge;

  // Level 1: Subtle hints - general direction/context
  if (hintLevel === 1) {
    switch (type) {
      case 'photo':
        return `Look for something that matches the theme "${title}". Pay attention to colors and shapes in your surroundings.`;
      case 'location':
        if (location && userLocation) {
          const distance = calculateDistance(userLocation, location);
          const direction = getDirection(userLocation, location);
          return `You're about ${formatDistance(distance)} away. Try heading ${direction}.`;
        }
        return hint || `Explore the area and look for landmarks mentioned in the description.`;
      case 'qr':
        return `The QR code is hidden somewhere related to "${title}". Look carefully at eye-level.`;
      case 'text':
        return `Think about the key words in the question. The answer relates to "${title}".`;
      default:
        return hint || `Focus on the details in the challenge description.`;
    }
  }

  // Level 2: Moderate hints - more specific guidance
  if (hintLevel === 2) {
    switch (type) {
      case 'photo':
        const photoKeywords = extractKeywords(description);
        return `Look for: ${photoKeywords.join(', ')}. The AI verification is looking for these specific elements.`;
      case 'location':
        if (location && userLocation) {
          const distance = calculateDistance(userLocation, location);
          return `You need to get within 50 meters of the target. Current distance: ${formatDistance(distance)}. ${hint || ''}`;
        }
        return `${hint || description} Look for recognizable features nearby.`;
      case 'qr':
        return `${hint || `The QR code is placed near something related to: ${title}`}. Check signs, posters, or displays.`;
      case 'text':
        if (answer) {
          return `The answer has ${answer.length} characters and starts with "${answer.charAt(0)}".`;
        }
        return hint || `Re-read the challenge description for context clues.`;
      default:
        return hint || description;
    }
  }

  // Level 3: Direct hints - nearly gives the answer
  if (hintLevel === 3) {
    switch (type) {
      case 'photo':
        return `Take a clear photo of ${description}. Make sure ${title.toLowerCase()} is clearly visible and centered in your photo.`;
      case 'location':
        if (location) {
          return `Go to these coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}. ${hint || ''}`;
        }
        return `The exact location is: ${hint || description}`;
      case 'qr':
        return `The QR code is located: ${hint || `exactly where you'd expect to find "${title}"`}. It may be partially hidden.`;
      case 'text':
        if (answer) {
          const revealed = answer.split('').map((c, i) =>
            i === 0 || i === answer.length - 1 ? c : '_'
          ).join('');
          return `The answer is: ${revealed}`;
        }
        return hint || description;
      default:
        return hint || `Complete solution: ${description}`;
    }
  }

  return hint || 'No additional hints available.';
}

function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.round(meters)} meters`;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} meters`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getDirection(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): string {
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;

  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;

  if (angle >= -22.5 && angle < 22.5) return 'north';
  if (angle >= 22.5 && angle < 67.5) return 'northeast';
  if (angle >= 67.5 && angle < 112.5) return 'east';
  if (angle >= 112.5 && angle < 157.5) return 'southeast';
  if (angle >= 157.5 || angle < -157.5) return 'south';
  if (angle >= -157.5 && angle < -112.5) return 'southwest';
  if (angle >= -112.5 && angle < -67.5) return 'west';
  return 'northwest';
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'find', 'take', 'photo', 'picture', 'image']);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}

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

    const body: HintRequest = await request.json();
    const { hunt_id, challenge_index, hint_level, user_location, previous_attempts } = body;

    if (!hunt_id || challenge_index === undefined || !hint_level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (![1, 2, 3].includes(hint_level)) {
      return NextResponse.json({ error: 'Invalid hint level' }, { status: 400 });
    }

    // Get the hunt and challenge
    const { data: hunt, error: huntError } = await supabase
      .from('hunts')
      .select('id, challenges')
      .eq('id', hunt_id)
      .single();

    if (huntError || !hunt) {
      return NextResponse.json({ error: 'Hunt not found' }, { status: 404 });
    }

    const challenges = hunt.challenges as Array<{
      type: string;
      title: string;
      description: string;
      hint?: string;
      answer?: string;
      location?: { lat: number; lng: number };
    }>;

    if (challenge_index < 0 || challenge_index >= challenges.length) {
      return NextResponse.json({ error: 'Invalid challenge index' }, { status: 400 });
    }

    const challenge = challenges[challenge_index];
    const pointCost = HINT_COSTS[hint_level];

    // Record hint usage
    await supabase.from('hint_usage').insert({
      user_id: user.id,
      hunt_id,
      challenge_index,
      hint_level,
      point_cost: pointCost,
      created_at: new Date().toISOString(),
    });

    // Generate the hint
    const hint = generateHint(challenge, hint_level, user_location, previous_attempts);

    return NextResponse.json({
      hint,
      hint_level,
      point_cost: pointCost,
      remaining_hints: 3 - hint_level, // Can still get more detailed hints
    });
  } catch (error) {
    console.error('Hint generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get hint history for a participation
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

    if (!huntId) {
      return NextResponse.json({ error: 'Missing hunt_id' }, { status: 400 });
    }

    const { data: hints, error } = await supabase
      .from('hint_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('hunt_id', huntId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch hints' }, { status: 500 });
    }

    const totalCost = hints.reduce((sum, h) => sum + h.point_cost, 0);

    return NextResponse.json({
      hints: hints || [],
      total_cost: totalCost,
    });
  } catch (error) {
    console.error('Get hints error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
