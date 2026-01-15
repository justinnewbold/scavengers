import { NextRequest, NextResponse } from 'next/server';
import { sanitizeString } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimiters, rateLimitResponse } from '@/lib/rateLimit';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface SoloGenerateRequest {
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challengeCount: number;
  duration: number;
  environment: 'outdoor' | 'indoor' | 'any';
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

// Theme-specific prompts for better generation
const THEME_PROMPTS: Record<string, string> = {
  nature: 'Focus on natural elements like plants, trees, flowers, birds, insects, clouds, water features, and natural patterns. Challenges should encourage observation of the natural world.',
  urban: 'Focus on architecture, street art, signs, storefronts, public art, interesting buildings, urban infrastructure, and city life. Challenges should explore the urban environment.',
  photo: 'Focus on creative photography challenges like finding interesting shadows, reflections, symmetry, leading lines, color contrasts, and unique perspectives. Each challenge should result in an interesting photo.',
  fitness: 'Include movement-based challenges like finding spots to do exercises, walking to locations, counting steps, finding stairs, or active exploration. Combine physical activity with discovery.',
  mindful: 'Focus on peaceful, meditative observations like finding quiet spots, noticing small details, observing patterns, listening to sounds, and appreciating surroundings. Encourage slow, thoughtful exploration.',
  color: 'Each challenge should involve finding something of a specific color. Include a variety of colors (red, blue, green, yellow, orange, purple, pink, etc.) and interesting color combinations.',
  texture: 'Focus on finding different textures like rough bark, smooth metal, soft fabric, bumpy surfaces, fuzzy plants, or interesting material patterns. Encourage tactile exploration through photography.',
};

// Environment-specific constraints
const ENVIRONMENT_CONSTRAINTS: Record<string, string> = {
  outdoor: 'All challenges must be completable outdoors. Focus on things found outside like nature, buildings, streets, parks, and outdoor spaces.',
  indoor: 'All challenges must be completable indoors. Focus on things found inside like furniture, decorations, books, appliances, architectural details, and indoor objects.',
  any: 'Challenges can be completed either indoors or outdoors. Provide a mix of both types.',
};

// Difficulty-based point ranges
const DIFFICULTY_POINTS: Record<string, { min: number; max: number }> = {
  easy: { min: 10, max: 25 },
  medium: { min: 20, max: 40 },
  hard: { min: 35, max: 60 },
};

export async function POST(request: NextRequest) {
  // Check rate limit
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, rateLimiters.aiGenerate);

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  let body: SoloGenerateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const {
      theme,
      difficulty = 'medium',
      challengeCount = 5,
      duration = 15,
      environment = 'any',
      latitude,
      longitude,
      locationName,
    } = body;

    // Validate inputs
    const sanitizedTheme = sanitizeString(theme || 'surprise', 50);
    const validDifficulty = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const validChallengeCount = Math.min(20, Math.max(3, challengeCount));
    const validDuration = Math.min(120, Math.max(5, duration));
    const validEnvironment = ['outdoor', 'indoor', 'any'].includes(environment) ? environment : 'any';

    // Build location context
    let locationContext = '';
    if (latitude && longitude) {
      locationContext = `The player is currently at coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      if (locationName) {
        locationContext += ` near "${locationName}"`;
      }
      locationContext += '. Generate challenges that could realistically be found in this general area. ';
    }

    // Build the prompt
    const themePrompt = THEME_PROMPTS[sanitizedTheme] || THEME_PROMPTS.nature;
    const envConstraint = ENVIRONMENT_CONSTRAINTS[validEnvironment];
    const pointRange = DIFFICULTY_POINTS[validDifficulty];

    const prompt = `You are designing a solo scavenger hunt for a mobile app. Generate a fun, engaging hunt that a single player can complete on their own.

HUNT PARAMETERS:
- Theme: ${sanitizedTheme}
- Difficulty: ${validDifficulty}
- Number of challenges: ${validChallengeCount}
- Target duration: ${validDuration} minutes
- Environment: ${validEnvironment}
${locationContext}

THEME GUIDANCE:
${themePrompt}

ENVIRONMENT RULES:
${envConstraint}

CHALLENGE REQUIREMENTS:
1. Each challenge must be completable by taking a photo with a smartphone
2. Challenges should be achievable in the specified environment
3. No challenges requiring purchases, entering private property, or dangerous activities
4. Challenges should be fun, creative, and encourage exploration
5. Points range: ${pointRange.min}-${pointRange.max} per challenge (harder = more points)
6. Include variety - don't make all challenges too similar
7. Challenges should build in difficulty slightly throughout the hunt
8. For ${validDifficulty} difficulty: ${
      validDifficulty === 'easy'
        ? 'challenges should be obvious and easy to find'
        : validDifficulty === 'medium'
        ? 'challenges should require some searching and creativity'
        : 'challenges should be tricky and require effort to complete'
    }

MYSTERY CHALLENGES (make 1-2 challenges mysterious):
- Set is_mystery: true for 1-2 challenges
- These appear as "?" until the player gets close
- Perfect for adding surprise and exploration

Generate a JSON response with this exact structure:
{
  "hunt": {
    "title": "Creative, catchy title for the hunt",
    "description": "Engaging 2-3 sentence description that excites the player"
  },
  "challenges": [
    {
      "title": "Short, catchy challenge title",
      "description": "Clear description of what to find and photograph",
      "points": number between ${pointRange.min}-${pointRange.max},
      "verification_type": "photo",
      "hint": "Helpful hint if player is stuck",
      "is_mystery": false,
      "order_index": 0
    }
  ]
}

Respond ONLY with valid JSON, no markdown code blocks or explanations.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return fallback generated hunt
      return NextResponse.json(generateFallbackHunt(sanitizedTheme, validDifficulty, validChallengeCount, validEnvironment));
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return NextResponse.json(generateFallbackHunt(sanitizedTheme, validDifficulty, validChallengeCount, validEnvironment));
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('No content from Gemini');
      return NextResponse.json(generateFallbackHunt(sanitizedTheme, validDifficulty, validChallengeCount, validEnvironment));
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in Gemini response');
      return NextResponse.json(generateFallbackHunt(sanitizedTheme, validDifficulty, validChallengeCount, validEnvironment));
    }

    const generated = JSON.parse(jsonMatch[0]);

    // Validate and enhance response
    const hunt = {
      title: generated.hunt?.title || `${sanitizedTheme.charAt(0).toUpperCase() + sanitizedTheme.slice(1)} Adventure`,
      description: generated.hunt?.description || `A ${validDifficulty} ${sanitizedTheme} scavenger hunt with ${validChallengeCount} challenges.`,
    };

    const challenges = (generated.challenges || []).map((c: Record<string, unknown>, i: number) => ({
      title: c.title || `Challenge ${i + 1}`,
      description: c.description || 'Find something interesting and take a photo!',
      points: Math.min(pointRange.max, Math.max(pointRange.min, Number(c.points) || pointRange.min)),
      verification_type: 'photo',
      hint: c.hint || 'Look carefully around you!',
      is_mystery: Boolean(c.is_mystery),
      reveal_distance_meters: c.is_mystery ? 50 : undefined,
      order_index: i,
    }));

    return NextResponse.json({ hunt, challenges });
  } catch (error) {
    console.error('Solo hunt generation error:', error);

    // Return fallback
    const theme = body?.theme || 'adventure';
    const difficulty = body?.difficulty || 'medium';
    const count = body?.challengeCount || 5;
    const env = body?.environment || 'any';

    return NextResponse.json(generateFallbackHunt(theme, difficulty, count, env));
  }
}

// Fallback hunt generator when AI is unavailable
function generateFallbackHunt(theme: string, difficulty: string, count: number, environment: string) {
  const pointRange = DIFFICULTY_POINTS[difficulty] || DIFFICULTY_POINTS.medium;

  const themeTemplates: Record<string, Array<{ title: string; description: string }>> = {
    nature: [
      { title: 'Leaf Detective', description: 'Find a leaf with an unusual shape or color' },
      { title: 'Cloud Gazer', description: 'Photograph a cloud that looks like something else' },
      { title: 'Flower Power', description: 'Find and photograph a colorful flower' },
      { title: 'Tree Hugger', description: 'Find a tree with interesting bark texture' },
      { title: 'Wildlife Watcher', description: 'Spot and photograph any animal (bird, insect, etc.)' },
      { title: 'Rock Star', description: 'Find an interesting or unusual rock' },
      { title: 'Water World', description: 'Photograph any water feature (puddle, fountain, stream)' },
      { title: 'Shadow Hunter', description: 'Capture an interesting shadow cast by nature' },
    ],
    urban: [
      { title: 'Street Art Seeker', description: 'Find and photograph street art or graffiti' },
      { title: 'Door Detective', description: 'Find a door with an interesting design' },
      { title: 'Sign Spotter', description: 'Find a funny or unusual sign' },
      { title: 'Architecture Admirer', description: 'Photograph an interesting building detail' },
      { title: 'Window Watcher', description: 'Find an interesting window display' },
      { title: 'Stairway to Heaven', description: 'Find and photograph an interesting staircase' },
      { title: 'Reflection Finder', description: 'Capture an interesting reflection in a window' },
      { title: 'Pattern Seeker', description: 'Find a repeating pattern in the urban environment' },
    ],
    photo: [
      { title: 'Perfect Symmetry', description: 'Find and photograph something perfectly symmetrical' },
      { title: 'Leading Lines', description: 'Capture a photo with strong leading lines' },
      { title: 'Frame Within Frame', description: 'Find a natural frame for your photo' },
      { title: 'Rule of Thirds', description: 'Take a perfectly composed rule-of-thirds photo' },
      { title: 'Interesting Shadow', description: 'Capture a dramatic or unusual shadow' },
      { title: 'Color Pop', description: 'Find a single bright color against a neutral background' },
      { title: 'Texture Master', description: 'Photograph an interesting texture up close' },
      { title: 'Negative Space', description: 'Create a photo with lots of empty space' },
    ],
    fitness: [
      { title: 'Stair Master', description: 'Find a set of stairs and take a photo from the top' },
      { title: 'Bench Press Spot', description: 'Find a bench and take a selfie there' },
      { title: 'Walking Wonder', description: 'Walk 100 steps and photograph what you find' },
      { title: 'Hill Climber', description: 'Find and photograph the highest point nearby' },
      { title: 'Path Finder', description: 'Find a walking path and photograph where it leads' },
      { title: 'Jump Shot', description: 'Find a spot to take a jumping photo' },
      { title: 'Balance Master', description: 'Find something you can balance on safely' },
      { title: 'Distance Runner', description: 'Walk to the farthest visible landmark' },
    ],
    color: [
      { title: 'Red Alert', description: 'Find something bright red' },
      { title: 'Blue Beauty', description: 'Find something blue' },
      { title: 'Green Machine', description: 'Find something green (not a plant!)' },
      { title: 'Yellow Sunshine', description: 'Find something yellow' },
      { title: 'Orange Crush', description: 'Find something orange' },
      { title: 'Purple Rain', description: 'Find something purple' },
      { title: 'Rainbow Finder', description: 'Find something with multiple colors' },
      { title: 'Black & White', description: 'Find a strong black and white contrast' },
    ],
    default: [
      { title: 'Hidden Gem', description: 'Find something interesting that most people would miss' },
      { title: 'Number Hunter', description: 'Find the number 7 somewhere unexpected' },
      { title: 'Letter Seeker', description: 'Find a letter of the alphabet in an unusual place' },
      { title: 'Tiny Treasure', description: 'Find and photograph something very small' },
      { title: 'Giant Discovery', description: 'Find and photograph something very large' },
      { title: 'Oldest Thing', description: 'Find the oldest-looking thing nearby' },
      { title: 'Newest Thing', description: 'Find something that looks brand new' },
      { title: 'Most Unusual', description: 'Find the most unusual thing you can spot' },
    ],
  };

  const templates = themeTemplates[theme] || themeTemplates.default;

  // Select and shuffle challenges
  const selected = [...templates].sort(() => Math.random() - 0.5).slice(0, count);

  const challenges = selected.map((template, i) => ({
    title: template.title,
    description: template.description,
    points: pointRange.min + Math.floor((pointRange.max - pointRange.min) * (i / count)),
    verification_type: 'photo',
    hint: 'Look carefully around you!',
    is_mystery: i === Math.floor(count / 2), // Make middle challenge a mystery
    reveal_distance_meters: i === Math.floor(count / 2) ? 50 : undefined,
    order_index: i,
  }));

  return {
    hunt: {
      title: `${theme.charAt(0).toUpperCase() + theme.slice(1)} Solo Adventure`,
      description: `A ${difficulty} solo scavenger hunt with ${count} ${theme}-themed challenges. Explore your surroundings and have fun!`,
    },
    challenges,
  };
}
