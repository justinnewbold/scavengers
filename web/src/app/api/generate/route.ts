import { NextRequest, NextResponse } from 'next/server';
import { generateHuntWithAI } from '@/lib/ai';
import { sanitizeString } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Parse body once at the start and save for fallback
  let rawBody: { theme?: string; difficulty?: string; challengeCount?: number; duration?: number; location?: string } = {};
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    // Validate and sanitize inputs
    const theme = sanitizeString(rawBody.theme || '', 100);
    const location = rawBody.location ? sanitizeString(rawBody.location, 255) : undefined;
    const difficulty: 'easy' | 'medium' | 'hard' = ['easy', 'medium', 'hard'].includes(rawBody.difficulty || '')
      ? (rawBody.difficulty as 'easy' | 'medium' | 'hard')
      : 'medium';
    const challengeCount = Math.min(20, Math.max(1, parseInt(String(rawBody.challengeCount), 10) || 5));
    const duration = Math.min(480, Math.max(10, parseInt(String(rawBody.duration), 10) || 60));

    if (!theme || theme.length < 2) {
      return NextResponse.json(
        { error: 'Theme is required (at least 2 characters)' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return mock data if no API key - use the helper function for better challenges
      const themedChallenges = generateThemedChallenges(theme, difficulty, challengeCount);
      return NextResponse.json({
        hunt: {
          title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Explorer`,
          description: `An exciting ${difficulty} scavenger hunt with ${challengeCount} challenges${location ? ` in ${location}` : ''}. Explore, discover, and have fun!`,
          difficulty,
          estimatedTime: duration,
          challengeCount,
          isPublic: true,
          tags: [theme, difficulty, 'scavenger-hunt'],
          location: location || 'Flexible Location',
        },
        challenges: themedChallenges,
      });
    }

    // Use the shared AI generation function
    const result = await generateHuntWithAI(
      { theme, location, difficulty, challengeCount, duration },
      apiKey
    );

    return NextResponse.json(result);
  } catch (error) {
    // Always log errors for debugging (visible in Vercel logs)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI generation error:', {
      message: errorMessage,
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });

    // Use the saved rawBody for fallback
    const theme = rawBody.theme || 'adventure';
    const difficulty = rawBody.difficulty || 'medium';
    const challengeCount = rawBody.challengeCount || 5;
    const duration = rawBody.duration || 60;
    const location = rawBody.location;

    // Generate themed challenges based on the theme
    const themedChallenges = generateThemedChallenges(theme, difficulty, challengeCount);

    return NextResponse.json({
      hunt: {
        title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Explorer`,
        description: `An exciting ${difficulty} scavenger hunt with ${challengeCount} challenges${location ? ` in ${location}` : ''}. Explore, discover, and have fun!`,
        difficulty,
        estimatedTime: duration,
        challengeCount,
        isPublic: true,
        tags: [theme, difficulty, 'scavenger-hunt'],
        location: location || 'Flexible Location',
      },
      challenges: themedChallenges,
      note: 'Generated with template (AI unavailable)',
    });
  }
}

// Helper to generate themed challenges when AI is unavailable
function generateThemedChallenges(theme: string, difficulty: string, count: number) {
  const basePoints = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 40;

  const themeIdeas: Record<string, string[]> = {
    adventure: ['hidden trail marker', 'unusual rock formation', 'scenic viewpoint', 'old bridge', 'wildlife tracks'],
    mystery: ['mysterious symbol', 'hidden message', 'locked door', 'secret passage clue', 'coded message'],
    nature: ['unique flower', 'bird nest', 'interesting insect', 'fallen leaf pattern', 'tree with unusual bark'],
    urban: ['street art mural', 'historic building detail', 'unique door', 'vintage sign', 'architectural feature'],
    history: ['historic plaque', 'old monument', 'vintage storefront', 'memorial statue', 'heritage site'],
    art: ['public sculpture', 'gallery artwork', 'street performance spot', 'artistic graffiti', 'mosaic'],
    food: ['local specialty shop', 'farmers market stall', 'cafe with character', 'food truck', 'bakery display'],
    sports: ['sports field', 'trophy case', 'team memorabilia', 'training equipment', 'championship banner'],
  };

  const ideas = themeIdeas[theme] || themeIdeas.adventure;
  const types = ['photo', 'photo', 'photo', 'text', 'gps'];

  return Array.from({ length: count }, (_, i) => ({
    title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Challenge ${i + 1}`,
    description: `Find and document: ${ideas[i % ideas.length]}`,
    points: basePoints + (i * 5),
    type: types[i % types.length],
    hint: 'Look carefully in your surroundings!',
    order: i + 1,
  }));
}
