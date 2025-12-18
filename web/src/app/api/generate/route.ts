import { NextRequest, NextResponse } from 'next/server';
import { generateHuntWithAI } from '@/lib/ai';
import { sanitizeString } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and sanitize inputs
    const theme = sanitizeString(body.theme || '', 100);
    const location = body.location ? sanitizeString(body.location, 255) : undefined;
    const difficulty = ['easy', 'medium', 'hard'].includes(body.difficulty)
      ? body.difficulty
      : 'medium';
    const challengeCount = Math.min(20, Math.max(1, parseInt(body.challengeCount, 10) || 5));
    const duration = Math.min(480, Math.max(10, parseInt(body.duration, 10) || 60));

    if (!theme || theme.length < 2) {
      return NextResponse.json(
        { error: 'Theme is required (at least 2 characters)' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return mock data if no API key
      return NextResponse.json({
        hunt: {
          title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Explorer`,
          description: `An exciting ${difficulty} difficulty scavenger hunt with ${challengeCount} challenges in ${location || 'your area'}. Perfect for ${duration} minutes of adventure!`,
          difficulty,
          estimatedTime: duration,
          challengeCount,
          isPublic: true,
          tags: [theme, difficulty, 'ai-generated'],
          location: location || 'Flexible Location',
        },
        challenges: Array.from({ length: challengeCount }, (_, i) => ({
          title: `Challenge ${i + 1}`,
          description: `Find and photograph something related to ${theme}`,
          points: difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 40,
          type: ['photo', 'gps', 'text_answer'][i % 3],
          hint: 'Look around carefully!',
          order: i + 1,
        })),
      });
    }

    // Use the shared AI generation function
    const result = await generateHuntWithAI(
      { theme, location, difficulty, challengeCount, duration },
      apiKey
    );

    return NextResponse.json(result);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('AI generation error:', error);
    }

    // Return a user-friendly error with mock data fallback
    const body = await request.clone().json().catch(() => ({}));
    const theme = body.theme || 'adventure';
    const difficulty = body.difficulty || 'medium';
    const challengeCount = body.challengeCount || 5;
    const duration = body.duration || 60;
    const location = body.location;

    return NextResponse.json({
      hunt: {
        title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Explorer`,
        description: `A ${difficulty} scavenger hunt with ${challengeCount} challenges. AI generation unavailable - using template.`,
        difficulty,
        estimatedTime: duration,
        challengeCount,
        isPublic: true,
        tags: [theme, difficulty],
        location: location || 'Flexible Location',
      },
      challenges: Array.from({ length: challengeCount }, (_, i) => ({
        title: `Challenge ${i + 1}`,
        description: `Find something interesting related to ${theme}`,
        points: difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 40,
        type: 'photo',
        hint: 'Be creative!',
        order: i + 1,
      })),
      warning: 'AI generation failed, using template instead',
    });
  }
}
