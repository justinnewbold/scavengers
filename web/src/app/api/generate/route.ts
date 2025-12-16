import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, location, difficulty, challengeCount, duration } = body;

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
          type: ['photo', 'gps', 'text'][i % 3],
          hint: 'Look around carefully!',
          order: i + 1,
        })),
      });
    }

    const prompt = `You are a creative scavenger hunt designer. Generate a fun, engaging scavenger hunt based on these parameters:

Theme: ${theme}
Location: ${location || 'Any location (indoor/outdoor flexible)'}
Difficulty: ${difficulty}
Number of challenges: ${challengeCount}
Estimated duration: ${duration} minutes

Generate a JSON response with this exact structure:
{
  "hunt": {
    "title": "Creative hunt title",
    "description": "Engaging 2-3 sentence description",
    "difficulty": "${difficulty}",
    "estimatedTime": ${duration},
    "challengeCount": ${challengeCount},
    "isPublic": true,
    "tags": ["tag1", "tag2", "tag3"],
    "location": "${location || 'Flexible'}"
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

Make the challenges creative, fun, and achievable.
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
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error('No content generated');
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);

  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hunt' },
      { status: 500 }
    );
  }
}
