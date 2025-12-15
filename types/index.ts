// Hunt Types
export interface Hunt {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  is_public: boolean;
  max_participants: number;
  time_limit_minutes: number | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  challenges: Challenge[];
  settings: HuntSettings;
}

export interface HuntSettings {
  allow_hints: boolean;
  points_for_hints: number;
  require_photo_verification: boolean;
  allow_team_play: boolean;
  shuffle_challenges: boolean;
}

export interface Challenge {
  id: string;
  hunt_id: string;
  title: string;
  description: string;
  points: number;
  order_index: number;
  verification_type: VerificationType;
  verification_data: VerificationData;
  hint: string | null;
  time_limit_seconds: number | null;
  created_at: string;
}

export type VerificationType = 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';

export interface VerificationData {
  // For GPS verification
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  
  // For QR code verification
  qr_code_value?: string;
  
  // For text answer verification
  correct_answer?: string;
  case_sensitive?: boolean;
  
  // For photo verification
  ai_prompt?: string;
  required_objects?: string[];
}

// Participant Types
export interface Participant {
  id: string;
  hunt_id: string;
  user_id: string;
  team_id: string | null;
  status: 'joined' | 'playing' | 'completed' | 'withdrawn';
  score: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  challenge_id: string;
  participant_id: string;
  submission_type: VerificationType;
  submission_data: SubmissionData;
  status: 'pending' | 'approved' | 'rejected';
  points_awarded: number;
  verified_at: string | null;
  created_at: string;
}

export interface SubmissionData {
  photo_url?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  qr_code_scanned?: string;
  text_answer?: string;
  ai_verification_result?: {
    approved: boolean;
    confidence: number;
    reason: string;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

// AI Generation Types
export interface AIGenerationRequest {
  theme: string;
  location?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challenge_count: number;
  duration_minutes?: number;
  include_photo_challenges: boolean;
  include_gps_challenges: boolean;
  custom_instructions?: string;
}

export interface AIGeneratedHunt {
  title: string;
  description: string;
  challenges: AIGeneratedChallenge[];
}

export interface AIGeneratedChallenge {
  title: string;
  description: string;
  points: number;
  verification_type: VerificationType;
  hint: string;
  verification_data: VerificationData;
}

// Store Types
export interface AppState {
  user: User | null;
  currentHunt: Hunt | null;
  hunts: Hunt[];
  isLoading: boolean;
  error: string | null;
}

// Navigation Types
export type RootStackParamList = {
  '(tabs)': undefined;
  'hunt/[id]': { id: string };
  'hunt/create': undefined;
  'hunt/ai-create': undefined;
  'challenge/[id]': { id: string };
  'auth/login': undefined;
  'auth/register': undefined;
};
