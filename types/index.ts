// Hunt Types
export type HuntStatus = 'draft' | 'active' | 'completed' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type VerificationType = 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';

export interface Hunt {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  is_public: boolean;
  status: HuntStatus;
  creator_id?: string;
  location?: string;
  duration_minutes?: number;
  max_participants?: number;
  challenges?: Challenge[];
  created_at?: string;
  updated_at?: string;
}

export interface Challenge {
  id?: string;
  hunt_id?: string;
  title: string;
  description: string;
  points: number;
  verification_type: VerificationType;
  verification_data?: VerificationData;
  hint?: string | null;
  order_index?: number;
  created_at?: string;
}

export interface VerificationData {
  // For text_answer
  correct_answer?: string;
  case_sensitive?: boolean;
  
  // For photo
  ai_prompt?: string;
  required_objects?: string[];
  
  // For GPS
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  
  // For QR code
  expected_code?: string;
}

// Participant Types
export type ParticipantStatus = 'joined' | 'playing' | 'completed' | 'left';

export interface Participant {
  id: string;
  hunt_id: string;
  user_id: string;
  team_id?: string;
  status: ParticipantStatus;
  score: number;
  started_at?: string;
  completed_at?: string;
  user?: User;
}

// Submission Types
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  participant_id: string;
  challenge_id: string;
  submission_type: VerificationType;
  submission_data?: any;
  status: SubmissionStatus;
  points_awarded?: number;
  verified_at?: string;
  created_at?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
}

// AI Generation Types
export interface AIGenerationRequest {
  theme: string;
  difficulty: Difficulty;
  challenge_count: number;
  location?: string;
  duration_minutes?: number;
  include_photo_challenges?: boolean;
  include_gps_challenges?: boolean;
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
  hint?: string | null;
  verification_data?: VerificationData;
}

// Team Types
export interface Team {
  id: string;
  hunt_id: string;
  name: string;
  color?: string;
  members?: Participant[];
  total_score?: number;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  participant_id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  score: number;
  challenges_completed: number;
  time_elapsed?: number;
}
