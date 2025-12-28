import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const VERIFICATION_API_URL = '/api/verify-photo';

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  matchedLabels: string[];
  feedback: string;
  processingTimeMs: number;
}

export interface VerificationRequest {
  imageUri: string;
  challengeTitle: string;
  challengeDescription: string;
  requiredElements?: string[];
}

/**
 * Compress image for efficient upload
 */
async function compressImage(uri: string): Promise<string> {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error('Failed to compress image:', error);
    return uri;
  }
}

/**
 * Convert image to base64
 */
async function imageToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw error;
  }
}

/**
 * Extract keywords from challenge description for matching
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'find', 'take', 'photo', 'picture', 'image', 'capture', 'show',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Local verification using keyword matching (fallback)
 */
function localVerification(
  detectedLabels: string[],
  requiredKeywords: string[]
): { verified: boolean; matchedLabels: string[]; confidence: number } {
  const normalizedLabels = detectedLabels.map(l => l.toLowerCase());
  const matchedLabels: string[] = [];

  for (const keyword of requiredKeywords) {
    for (const label of normalizedLabels) {
      if (label.includes(keyword) || keyword.includes(label)) {
        matchedLabels.push(label);
        break;
      }
    }
  }

  const confidence = requiredKeywords.length > 0
    ? (matchedLabels.length / requiredKeywords.length) * 100
    : 0;

  return {
    verified: matchedLabels.length >= Math.ceil(requiredKeywords.length * 0.5),
    matchedLabels,
    confidence,
  };
}

/**
 * Verify a photo against challenge requirements using AI
 */
export async function verifyPhoto(request: VerificationRequest): Promise<VerificationResult> {
  const startTime = Date.now();

  try {
    // Compress the image
    const compressedUri = await compressImage(request.imageUri);

    // Convert to base64
    const base64Image = await imageToBase64(compressedUri);

    // Extract keywords from challenge
    const keywords = request.requiredElements || extractKeywords(
      `${request.challengeTitle} ${request.challengeDescription}`
    );

    // Call verification API
    const response = await fetch(VERIFICATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        challengeTitle: request.challengeTitle,
        challengeDescription: request.challengeDescription,
        requiredElements: keywords,
      }),
    });

    if (!response.ok) {
      throw new Error(`Verification API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      verified: result.verified,
      confidence: result.confidence,
      matchedLabels: result.matchedLabels || [],
      feedback: result.feedback || generateFeedback(result.verified, result.confidence),
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Photo verification failed:', error);

    // Return a lenient result on error (don't block user progress)
    return {
      verified: true,
      confidence: 0,
      matchedLabels: [],
      feedback: 'Photo accepted (verification unavailable)',
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Generate user-friendly feedback based on verification result
 */
function generateFeedback(verified: boolean, confidence: number): string {
  if (verified) {
    if (confidence >= 90) {
      return 'Perfect match! Great photo!';
    } else if (confidence >= 70) {
      return 'Good job! Photo verified successfully.';
    } else {
      return 'Photo accepted.';
    }
  } else {
    if (confidence >= 40) {
      return "Almost there! Try getting a clearer shot of the main subject.";
    } else if (confidence >= 20) {
      return "Hmm, couldn't find what we're looking for. Check the challenge description.";
    } else {
      return "This doesn't seem to match. Make sure you're photographing the right thing!";
    }
  }
}

/**
 * Quick local check before uploading (client-side heuristics)
 */
export async function quickCheck(imageUri: string): Promise<{
  isValid: boolean;
  issue?: string;
}> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);

    if (!fileInfo.exists) {
      return { isValid: false, issue: 'Image file not found' };
    }

    const size = (fileInfo as { size?: number }).size || 0;

    // Check file size (too small might be corrupted)
    if (size < 10000) {
      return { isValid: false, issue: 'Image too small or corrupted' };
    }

    // Check file size (too large)
    if (size > 20 * 1024 * 1024) {
      return { isValid: false, issue: 'Image too large. Maximum size is 20MB.' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Quick check failed:', error);
    return { isValid: true }; // Allow through on error
  }
}

/**
 * Analyze image for common issues
 */
export async function analyzeImageQuality(imageUri: string): Promise<{
  quality: 'good' | 'acceptable' | 'poor';
  issues: string[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    const size = (fileInfo as { size?: number }).size || 0;

    // Very small file might indicate low quality
    if (size < 50000) {
      issues.push('Low resolution');
      suggestions.push('Try taking the photo in better lighting');
    }

    // Determine quality based on issues
    let quality: 'good' | 'acceptable' | 'poor' = 'good';
    if (issues.length > 2) {
      quality = 'poor';
    } else if (issues.length > 0) {
      quality = 'acceptable';
    }

    return { quality, issues, suggestions };
  } catch (error) {
    return { quality: 'acceptable', issues: [], suggestions: [] };
  }
}
