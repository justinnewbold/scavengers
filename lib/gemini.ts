import type {
  AIGenerationRequest,
  AIGeneratedHunt,
  AIGeneratedChallenge,
  VerificationType,
} from '@/types';
import { fetchWithTimeout, TimeoutError } from './fetchWithTimeout';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

/** Generation can take a while - Gemini is doing real work behind this. */
const GENERATE_TIMEOUT_MS = 45000;

/** Raised with a message that is safe (and useful) to show the user. */
export class HuntGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HuntGenerationError';
  }
}

interface ServerChallenge {
  title?: string;
  description?: string;
  points?: number;
  verification_type?: string;
  type?: string;
  hint?: string | null;
  verification_data?: Record<string, unknown>;
}

interface ServerHuntResponse {
  hunt?: { title?: string; description?: string };
  challenges?: ServerChallenge[];
  error?: string;
}

const VALID_VERIFICATION_TYPES: VerificationType[] = [
  'photo',
  'gps',
  'qr_code',
  'text_answer',
  'manual',
];

function normalizeVerificationType(type: string | undefined): VerificationType {
  const normalized = (type || '').toLowerCase().trim();
  if ((VALID_VERIFICATION_TYPES as string[]).includes(normalized)) {
    return normalized as VerificationType;
  }
  if (normalized === 'qr' || normalized === 'qrcode') return 'qr_code';
  if (normalized === 'text') return 'text_answer';
  return 'manual';
}

/**
 * Hunt generation, performed server-side.
 *
 * This used to call the Google Generative Language API directly from the
 * device using EXPO_PUBLIC_GEMINI_API_KEY. That key is inlined into the app
 * bundle, so anyone could extract it and bill the account. It also had no
 * empty-key guard, so an unconfigured build sent an empty key and surfaced
 * `Gemini API error: ` (React Native usually leaves statusText blank) to the
 * user.
 *
 * The server holds the key, and /api/generate already falls back to a
 * generated hunt when it is unset - so this path degrades gracefully instead
 * of failing.
 */
export class GeminiAI {
  async generateHunt(request: AIGenerationRequest): Promise<AIGeneratedHunt> {
    let response: Response;

    try {
      response = await fetchWithTimeout(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: GENERATE_TIMEOUT_MS,
        body: JSON.stringify({
          theme: request.theme,
          location: request.location,
          difficulty: request.difficulty,
          challengeCount: request.challenge_count,
          duration: request.duration_minutes,
          customInstructions: request.custom_instructions,
          includePhoto: request.include_photo_challenges,
          includeGps: request.include_gps_challenges,
        }),
      });
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new HuntGenerationError(
          'Generating took too long. Please try again.'
        );
      }
      throw new HuntGenerationError(
        'Could not reach the server. Check your connection and try again.'
      );
    }

    let data: ServerHuntResponse;
    try {
      data = await response.json();
    } catch {
      throw new HuntGenerationError('The server returned an unexpected response.');
    }

    if (!response.ok) {
      throw new HuntGenerationError(
        data?.error || `Could not generate a hunt (error ${response.status}).`
      );
    }

    const challenges = Array.isArray(data.challenges) ? data.challenges : [];
    if (challenges.length === 0) {
      throw new HuntGenerationError(
        'The server did not return any challenges. Please try a different theme.'
      );
    }

    const mapped: AIGeneratedChallenge[] = challenges.map((c, index) => ({
      title: c.title || `Challenge ${index + 1}`,
      description: c.description || '',
      points: Number(c.points) || 10,
      // The server sends both `type` and `verification_type`; prefer the latter.
      verification_type: normalizeVerificationType(c.verification_type ?? c.type),
      hint: c.hint ?? null,
      verification_data: c.verification_data,
    }));

    return {
      title: data.hunt?.title || request.theme,
      description: data.hunt?.description || '',
      challenges: mapped,
    };
  }
}

export const gemini = new GeminiAI();

export default gemini;
