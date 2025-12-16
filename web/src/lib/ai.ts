import { AIGenerateRequest, AIGenerateResponse } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateHuntWithAI(
  request: AIGenerateRequest,
  apiKey: string
): Promise<AIGenerateResponse> {
  const prompt = `You are a creative scavenger hunt designer. Generate a fun, engaging scavenger hunt based on these parameters:

Theme: ${request.theme}
Location: ${request.location || 'Any location (indoor/outdoor flexible)'}
Difficulty: ${request.difficulty}
Number of challenges: ${request.challengeCount}
Estimated duration: ${request.duration} minutes

Generate a JSON response with this exact structure:
{
  "hunt": {
    "title": "Creative hunt title",
    "description": "Engaging 2-3 sentence description",
    "difficulty": "${request.difficulty}",
    "estimatedTime": ${request.duration},
    "challengeCount": ${request.challengeCount},
    "isPublic": true,
    "tags": ["tag1", "tag2", "tag3"],
    "location": "${request.location || 'Flexible'}"
  },
  "challenges": [
    {
      "title": "Challenge title",
      "description": "Clear description of what to find/do",
      "points": 10-50 based on difficulty,
      "type": "photo" | "gps" | "text",
      "hint": "Optional helpful hint",
      "order": 1
    }
  ]
}

Make the challenges creative, fun, and achievable. Use varied challenge types.
Points should be 10-20 for easy, 20-35 for medium, 35-50 for hard challenges.
Respond ONLY with valid JSON, no markdown or explanations.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`AI generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    throw new Error('No content generated');
  }

  // Parse JSON from response (handle potential markdown wrapping)
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from AI');
  }

  return JSON.parse(jsonMatch[0]) as AIGenerateResponse;
}

// Demo hunts for showcase
export const demoHunts = [
  {
    id: 'demo-1',
    title: 'Downtown Discovery',
    description: 'Explore the heart of the city and uncover hidden gems, historic landmarks, and local favorites.',
    difficulty: 'easy' as const,
    estimatedTime: 45,
    challengeCount: 8,
    participantCount: 234,
    location: 'City Center',
    isPublic: true,
    createdAt: new Date().toISOString(),
    createdBy: 'Scavengers Team',
    tags: ['urban', 'walking', 'landmarks'],
  },
  {
    id: 'demo-2',
    title: 'Nature Navigator',
    description: 'Venture into the wilderness and discover the beauty of nature through this outdoor adventure.',
    difficulty: 'medium' as const,
    estimatedTime: 90,
    challengeCount: 12,
    participantCount: 156,
    location: 'Local Park',
    isPublic: true,
    createdAt: new Date().toISOString(),
    createdBy: 'Scavengers Team',
    tags: ['nature', 'outdoor', 'hiking'],
  },
  {
    id: 'demo-3',
    title: 'Museum Mystery',
    description: 'Solve clues and puzzles while exploring art, history, and science in this indoor adventure.',
    difficulty: 'hard' as const,
    estimatedTime: 120,
    challengeCount: 15,
    participantCount: 89,
    location: 'Local Museum',
    isPublic: true,
    createdAt: new Date().toISOString(),
    createdBy: 'Scavengers Team',
    tags: ['museum', 'puzzles', 'educational'],
  },
];
