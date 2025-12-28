import { NextRequest, NextResponse } from 'next/server';

interface VerificationRequest {
  image: string; // base64
  challengeTitle: string;
  challengeDescription: string;
  requiredElements: string[];
}

// Simulated label detection (in production, use a real ML service like Google Vision, AWS Rekognition, or a local model)
function simulateLabelDetection(challengeTitle: string, description: string): string[] {
  // This would be replaced with actual ML inference
  // For now, return plausible labels based on the challenge
  const keywords = `${challengeTitle} ${description}`.toLowerCase();

  const labelMappings: Record<string, string[]> = {
    flower: ['flower', 'plant', 'petal', 'garden', 'nature'],
    tree: ['tree', 'forest', 'leaf', 'plant', 'nature', 'wood'],
    building: ['building', 'architecture', 'structure', 'house', 'urban'],
    fountain: ['fountain', 'water', 'sculpture', 'park'],
    statue: ['statue', 'sculpture', 'monument', 'art'],
    sign: ['sign', 'text', 'street', 'urban'],
    bench: ['bench', 'furniture', 'park', 'outdoor'],
    bridge: ['bridge', 'architecture', 'structure', 'water'],
    dog: ['dog', 'animal', 'pet', 'mammal'],
    cat: ['cat', 'animal', 'pet', 'mammal'],
    bird: ['bird', 'animal', 'flying', 'wildlife'],
    car: ['car', 'vehicle', 'automotive', 'transportation'],
    food: ['food', 'meal', 'cuisine', 'dish', 'restaurant'],
    coffee: ['coffee', 'beverage', 'cup', 'cafe'],
    book: ['book', 'text', 'reading', 'library'],
    park: ['park', 'nature', 'outdoor', 'green', 'recreation'],
    mural: ['mural', 'art', 'wall', 'painting', 'graffiti'],
    street: ['street', 'road', 'urban', 'city'],
    sunset: ['sunset', 'sky', 'sun', 'nature', 'horizon'],
    water: ['water', 'lake', 'river', 'pond', 'ocean'],
  };

  const detectedLabels: string[] = [];

  for (const [keyword, labels] of Object.entries(labelMappings)) {
    if (keywords.includes(keyword)) {
      detectedLabels.push(...labels);
    }
  }

  // Add some generic labels
  detectedLabels.push('outdoor', 'photograph');

  // Simulate some randomness in detection
  return [...new Set(detectedLabels)].slice(0, 10);
}

function calculateSimilarity(detected: string[], required: string[]): number {
  if (required.length === 0) return 100;

  const normalizedDetected = detected.map(l => l.toLowerCase());
  let matches = 0;

  for (const req of required) {
    const reqLower = req.toLowerCase();
    if (normalizedDetected.some(d => d.includes(reqLower) || reqLower.includes(d))) {
      matches++;
    }
  }

  return (matches / required.length) * 100;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json();
    const { image, challengeTitle, challengeDescription, requiredElements } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate image size
    const imageSize = Buffer.from(image, 'base64').length;
    if (imageSize > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large' }, { status: 400 });
    }

    // Simulate label detection
    // In production, you would call a real ML API here:
    // - Google Cloud Vision API
    // - AWS Rekognition
    // - Azure Computer Vision
    // - TensorFlow.js with a local model
    const detectedLabels = simulateLabelDetection(challengeTitle, challengeDescription);

    // Calculate confidence based on required elements
    const confidence = calculateSimilarity(detectedLabels, requiredElements);

    // Threshold for verification
    const verificationThreshold = 40; // 40% match required
    const verified = confidence >= verificationThreshold;

    // Generate feedback
    let feedback: string;
    if (verified) {
      if (confidence >= 80) {
        feedback = 'Excellent! Your photo perfectly captures the challenge.';
      } else if (confidence >= 60) {
        feedback = 'Great job! Challenge completed successfully.';
      } else {
        feedback = 'Photo accepted. Challenge complete!';
      }
    } else {
      feedback = "This photo doesn't quite match what we're looking for. Make sure the main subject is clearly visible.";
    }

    return NextResponse.json({
      verified,
      confidence: Math.round(confidence),
      matchedLabels: detectedLabels,
      feedback,
    });
  } catch (error) {
    console.error('Photo verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
