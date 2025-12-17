import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'medium':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'hard':
      return 'text-red-400 bg-red-400/10 border-red-400/30';
  }
}

export function generateId(): string {
  // Use crypto.randomUUID() for better randomness
  // Falls back to Math.random() for environments without crypto API
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
