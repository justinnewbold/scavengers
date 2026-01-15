/**
 * AI-powered photo verification using Google Gemini
 * Validates that submitted photos match the challenge requirements
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Configurable thresholds via environment variables
// PHOTO_VERIFICATION_AUTO_THRESHOLD: minimum confidence for auto-approval (default: 0.7)
// PHOTO_VERIFICATION_MANUAL_THRESHOLD: minimum confidence to flag for manual review (default: 0.3)
const AUTO_APPROVAL_THRESHOLD = parseFloat(process.env.PHOTO_VERIFICATION_AUTO_THRESHOLD || '0.7');
const MANUAL_REVIEW_THRESHOLD = parseFloat(process.env.PHOTO_VERIFICATION_MANUAL_THRESHOLD || '0.3');

export interface PhotoVerificationResult {
  approved: boolean;
  confidence: number;
  reason: string;
  requiresManualReview: boolean;
}

export interface PhotoVerificationData {
  ai_prompt?: string;
  required_objects?: string[];
  keywords?: string[];
}

/**
 * Verify a photo submission using Gemini AI vision
 */
export async function verifyPhotoWithAI(
  imageBase64: string,
  challengeTitle: string,
  challengeDescription: string,
  verificationData?: PhotoVerificationData
): Promise<PhotoVerificationResult> {
  // If no API key, fall back to manual approval
  if (!GEMINI_API_KEY) {
    return {
      approved: false,
      confidence: 0,
      reason: 'AI verification unavailable - manual review required',
      requiresManualReview: true,
    };
  }

  try {
    // Build the verification prompt
    const requiredItems = verificationData?.required_objects?.join(', ') || '';
    const aiPrompt = verificationData?.ai_prompt || '';
    const keywords = verificationData?.keywords?.join(', ') || '';

    const prompt = `You are a scavenger hunt photo verifier. Be fair but thorough.

CHALLENGE: "${challengeTitle}"
DESCRIPTION: "${challengeDescription}"
${aiPrompt ? `VERIFICATION CRITERIA: ${aiPrompt}` : ''}
${requiredItems ? `REQUIRED ITEMS TO FIND: ${requiredItems}` : ''}
${keywords ? `KEYWORDS TO LOOK FOR: ${keywords}` : ''}

Analyze this photo and determine if it successfully completes the challenge.

Consider:
1. Does the photo clearly show what was requested?
2. Is it a genuine photo (not a screenshot of a web image)?
3. Are the required elements visible?

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "approved": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation (max 100 chars)"
}`;

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent verification
          maxOutputTokens: 256,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, response.statusText);
      return {
        approved: false,
        confidence: 0,
        reason: 'AI verification failed - manual review required',
        requiresManualReview: true,
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Parse the JSON response
    const jsonMatch = text?.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const confidence = Number(result.confidence) || 0;

      // Only auto-approve if confidence is above threshold
      const approved = result.approved === true && confidence >= AUTO_APPROVAL_THRESHOLD;

      return {
        approved,
        confidence,
        reason: result.reason || (approved ? 'Photo verified' : 'Verification failed'),
        requiresManualReview: !approved && confidence > MANUAL_REVIEW_THRESHOLD && confidence < AUTO_APPROVAL_THRESHOLD,
      };
    }

    return {
      approved: false,
      confidence: 0,
      reason: 'Unable to parse AI response',
      requiresManualReview: true,
    };
  } catch (error) {
    console.error('Photo verification error:', error);
    return {
      approved: false,
      confidence: 0,
      reason: 'Verification error - manual review required',
      requiresManualReview: true,
    };
  }
}

/**
 * Quick content safety check (detect obviously inappropriate content)
 */
export async function checkContentSafety(imageBase64: string): Promise<{ safe: boolean; reason?: string }> {
  if (!GEMINI_API_KEY) {
    return { safe: true }; // Skip if no API key
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Is this image appropriate for a family-friendly scavenger hunt app? Reply with JSON only: {"safe": true/false, "reason": "brief reason if unsafe"}' },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!response.ok) {
      return { safe: true }; // Default to safe on API error
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = text?.match(/\{[\s\S]*?\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        safe: result.safe !== false,
        reason: result.reason,
      };
    }

    return { safe: true };
  } catch {
    return { safe: true }; // Default to safe on error
  }
}
