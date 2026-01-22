/**
 * Sound asset generator - creates simple WAV sound effects
 * Run with: node scripts/generate-sounds.js
 */

const fs = require('fs');
const path = require('path');

const SOUNDS_DIR = path.join(__dirname, '..', 'assets', 'sounds');

const SOUND_CONFIGS = {
  success: { frequency: 880, duration: 150, volume: 0.5, fadeOut: 50, type: 'sine' },
  achievement: { frequency: 660, duration: 400, volume: 0.6, fadeIn: 20, fadeOut: 100, type: 'sine' },
  levelUp: { frequency: 523, duration: 300, volume: 0.5, fadeOut: 80, type: 'triangle' },
  challenge_complete: { frequency: 784, duration: 200, volume: 0.5, fadeOut: 60, type: 'sine' },
  button_tap: { frequency: 1200, duration: 30, volume: 0.3, type: 'square' },
  notification: { frequency: 587, duration: 120, volume: 0.4, fadeOut: 40, type: 'sine' },
  error: { frequency: 220, duration: 250, volume: 0.4, fadeOut: 80, type: 'square' },
  countdown: { frequency: 440, duration: 80, volume: 0.4, type: 'sine' },
  rankUp: { frequency: 698, duration: 350, volume: 0.5, fadeIn: 30, fadeOut: 100, type: 'triangle' },
  rankDown: { frequency: 294, duration: 300, volume: 0.4, fadeOut: 100, type: 'square' },
};

function generateWav(config) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * (config.duration / 1000));
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Generate samples
  const fadeInSamples = config.fadeIn ? Math.floor(sampleRate * (config.fadeIn / 1000)) : 0;
  const fadeOutSamples = config.fadeOut ? Math.floor(sampleRate * (config.fadeOut / 1000)) : 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample;

    // Generate waveform
    const phase = 2 * Math.PI * config.frequency * t;
    switch (config.type) {
      case 'sine':
        sample = Math.sin(phase);
        break;
      case 'square':
        sample = Math.sin(phase) > 0 ? 1 : -1;
        break;
      case 'triangle':
        sample = 2 * Math.abs(2 * ((t * config.frequency) % 1) - 1) - 1;
        break;
    }

    // Apply volume
    sample *= config.volume;

    // Apply fade in
    if (i < fadeInSamples) {
      sample *= i / fadeInSamples;
    }

    // Apply fade out
    if (i > numSamples - fadeOutSamples) {
      sample *= (numSamples - i) / fadeOutSamples;
    }

    // Convert to 16-bit signed integer
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

function main() {
  // Ensure sounds directory exists
  if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  }

  console.log('Generating sound effects...\n');

  for (const [name, config] of Object.entries(SOUND_CONFIGS)) {
    const wavBuffer = generateWav(config);
    const filePath = path.join(SOUNDS_DIR, `${name}.wav`);
    fs.writeFileSync(filePath, wavBuffer);
    console.log(`✓ Generated ${name}.wav (${config.frequency}Hz, ${config.duration}ms, ${config.type})`);
  }

  console.log(`\n✅ All ${Object.keys(SOUND_CONFIGS).length} sound files generated in assets/sounds/`);
}

main();
