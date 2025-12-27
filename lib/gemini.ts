import type { 
  AIGenerationRequest, 
  AIGeneratedHunt, 
  AIGeneratedChallenge,
  VerificationType 
} from '@/types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export class GeminiAI {
  private apiKey: string;
  
  constructor(apiKey: string = GEMINI_API_KEY) {
    this.apiKey = apiKey;
  }
  
  async generateHunt(request: AIGenerationRequest): Promise<AIGeneratedHunt> {
    const prompt = this.buildHuntPrompt(request);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
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
          maxOutputTokens: 4096,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response from Gemini API');
    }
    
    return this.parseHuntResponse(text);
  }
  
  async verifyPhoto(imageBase64: string, challengeDescription: string): Promise<{
    approved: boolean;
    confidence: number;
    reason: string;
  }> {
    const prompt = `You are a scavenger hunt photo verifier. 
    
Challenge: "${challengeDescription}"

Analyze this photo and determine if it successfully completes the challenge.

Respond in JSON format only:
{
  "approved": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation"
}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Photo verification failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall back to manual approval if parsing fails
    }
    
    return {
      approved: false,
      confidence: 0,
      reason: 'Unable to verify photo automatically. Manual review required.'
    };
  }
  
  private buildHuntPrompt(request: AIGenerationRequest): string {
    const verificationTypes: string[] = [];
    if (request.include_photo_challenges) verificationTypes.push('photo');
    if (request.include_gps_challenges) verificationTypes.push('gps');
    verificationTypes.push('text_answer', 'manual');
    
    return `Create a fun and engaging scavenger hunt with the following requirements:

Theme: ${request.theme}
${request.location ? `Location: ${request.location}` : 'Location: General (can be played anywhere)'}
Difficulty: ${request.difficulty}
Number of challenges: ${request.challenge_count}
${request.duration_minutes ? `Estimated duration: ${request.duration_minutes} minutes` : ''}
${request.custom_instructions ? `Special instructions: ${request.custom_instructions}` : ''}

Available verification types: ${verificationTypes.join(', ')}

Respond in JSON format only with this structure:
{
  "title": "Creative hunt title",
  "description": "Brief engaging description (2-3 sentences)",
  "challenges": [
    {
      "title": "Challenge name",
      "description": "What the player needs to do",
      "points": 10-100 based on difficulty,
      "verification_type": "photo|gps|text_answer|manual",
      "hint": "Optional helpful hint",
      "verification_data": {
        // For text_answer: { "correct_answer": "answer", "case_sensitive": false }
        // For photo: { "ai_prompt": "what to look for", "required_objects": ["object1"] }
        // For gps: { "latitude": 0, "longitude": 0, "radius_meters": 50 }
        // For manual: {}
      }
    }
  ]
}

Make the challenges creative, fun, and achievable. Vary the difficulty and points. 
For ${request.difficulty} difficulty:
- Easy: Simple tasks, common items, clear instructions
- Medium: Requires some effort, creativity, or exploration
- Hard: Complex tasks, rare finds, multi-step challenges`;
  }
  
  private parseHuntResponse(text: string): AIGeneratedHunt {
    // Extract JSON from response by finding balanced braces
    const jsonStart = text.indexOf('{');
    if (jsonStart === -1) {
      throw new Error('Failed to parse hunt response: no JSON found');
    }

    let braceCount = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      else if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    if (jsonEnd === -1) {
      throw new Error('Failed to parse hunt response: unbalanced braces');
    }

    const jsonString = text.slice(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);
    
    // Validate and normalize the response
    return {
      title: parsed.title || 'Untitled Hunt',
      description: parsed.description || '',
      challenges: (parsed.challenges || []).map((c: any, index: number) => ({
        title: c.title || `Challenge ${index + 1}`,
        description: c.description || '',
        points: Number(c.points) || 10,
        verification_type: this.normalizeVerificationType(c.verification_type),
        hint: c.hint || null,
        verification_data: c.verification_data || {},
      })),
    };
  }
  
  private normalizeVerificationType(type: string): VerificationType {
    const validTypes: VerificationType[] = ['photo', 'gps', 'qr_code', 'text_answer', 'manual'];
    const normalized = type?.toLowerCase().replace(/[^a-z_]/g, '') as VerificationType;
    return validTypes.includes(normalized) ? normalized : 'manual';
  }
}

// Export singleton instance
export const gemini = new GeminiAI();
