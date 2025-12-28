import { AccessibilityInfo, Platform } from 'react-native';

// Screen reader announcement helper
export function announce(message: string): void {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

// Check if screen reader is enabled
export async function isScreenReaderEnabled(): Promise<boolean> {
  return AccessibilityInfo.isScreenReaderEnabled();
}

// Subscribe to screen reader changes
export function onScreenReaderChanged(callback: (enabled: boolean) => void): () => void {
  const subscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    callback
  );
  return () => subscription.remove();
}

// Accessibility labels for common actions
export const a11yLabels = {
  // Navigation
  back: 'Go back',
  close: 'Close',
  menu: 'Open menu',
  home: 'Go to home',

  // Actions
  submit: 'Submit',
  delete: 'Delete',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  refresh: 'Refresh',

  // Media
  takePhoto: 'Take a photo',
  scanQR: 'Scan QR code',
  playAudio: 'Play audio',
  stopAudio: 'Stop audio',

  // Status
  loading: 'Loading, please wait',
  success: 'Action completed successfully',
  error: 'An error occurred',
  offline: 'You are currently offline',

  // Hunt
  joinHunt: 'Join this scavenger hunt',
  startHunt: 'Start the hunt',
  completeChallenge: 'Mark challenge as complete',
  verifyChallenge: 'Verify this challenge',

  // Forms
  required: 'Required field',
  optional: 'Optional field',
};

// Accessibility hints for complex interactions
export const a11yHints = {
  doubleTap: 'Double tap to activate',
  swipe: 'Swipe left or right to navigate',
  pinch: 'Pinch to zoom',
  longPress: 'Long press for more options',
};

// Role mappings for semantic meaning
export const a11yRoles = {
  button: 'button' as const,
  link: 'link' as const,
  header: 'header' as const,
  image: 'image' as const,
  text: 'text' as const,
  search: 'search' as const,
  alert: 'alert' as const,
  checkbox: 'checkbox' as const,
  radio: 'radio' as const,
  menu: 'menu' as const,
  menuitem: 'menuitem' as const,
  progressbar: 'progressbar' as const,
  timer: 'timer' as const,
};

// High contrast color alternatives
export const highContrastColors = {
  text: '#FFFFFF',
  background: '#000000',
  primary: '#00BFFF',
  success: '#00FF00',
  error: '#FF0000',
  warning: '#FFFF00',
  border: '#FFFFFF',
};

// Minimum touch target size (48x48 dp recommended by WCAG)
export const minTouchTargetSize = 48;

// Generate accessible description for challenge
export function getChallengeDescription(challenge: {
  title: string;
  points: number;
  verification_type: string;
  completed?: boolean;
}): string {
  const status = challenge.completed ? 'Completed' : 'Not completed';
  const type = getVerificationTypeLabel(challenge.verification_type);
  return `${challenge.title}. ${challenge.points} points. ${type} challenge. ${status}`;
}

function getVerificationTypeLabel(type: string): string {
  switch (type) {
    case 'photo': return 'Photo';
    case 'gps': return 'Location';
    case 'qr_code': return 'QR Code';
    case 'text_answer': return 'Text Answer';
    case 'manual': return 'Manual';
    default: return type;
  }
}

// Generate accessible description for hunt
export function getHuntDescription(hunt: {
  title: string;
  difficulty: string;
  challengeCount?: number;
  duration_minutes?: number;
}): string {
  let description = `${hunt.title}. ${hunt.difficulty} difficulty.`;
  if (hunt.challengeCount) {
    description += ` ${hunt.challengeCount} challenges.`;
  }
  if (hunt.duration_minutes) {
    description += ` Approximately ${hunt.duration_minutes} minutes.`;
  }
  return description;
}
