export interface Hunt {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  challengeCount: number;
  participantCount?: number;
  imageUrl?: string;
  location?: string;
  isPublic: boolean;
  createdAt: string;
  createdBy: string;
  tags: string[];
}

export type VerificationType = 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';

export interface Challenge {
  id: string;
  huntId: string;
  title: string;
  description: string;
  points: number;
  type?: 'photo' | 'gps' | 'qr' | 'text' | 'video'; // Legacy - use verification_type
  verification_type?: VerificationType; // Preferred field name
  hint?: string;
  order: number;
  verificationData?: {
    location?: { lat: number; lng: number; radius: number };
    qrCode?: string;
    keywords?: string[];
    correct_answer?: string;
    case_sensitive?: boolean;
  };
}

export interface Participant {
  id: string;
  name: string;
  avatarUrl?: string;
  score: number;
  completedChallenges: number;
  rank: number;
}

export interface HuntSession {
  id: string;
  huntId: string;
  participantId: string;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  score: number;
  completedChallenges: string[];
}

export interface AIGenerateRequest {
  theme: string;
  location?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challengeCount: number;
  duration: number; // in minutes
}

export interface AIGenerateResponse {
  hunt: Omit<Hunt, 'id' | 'createdAt' | 'createdBy' | 'participantCount'>;
  challenges: Omit<Challenge, 'id' | 'huntId'>[];
}
