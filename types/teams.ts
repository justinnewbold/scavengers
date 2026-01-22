// Team Management Types

export type TeamRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'left';
export type TeamHuntRole = 'captain' | 'navigator' | 'photographer' | 'scout' | 'none';

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  inviteCode: string;
  isPublic: boolean;
  maxMembers: number;

  // Stats
  huntsCompleted: number;
  totalPoints: number;
  winCount: number;
  memberCount: number;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  odteamId: string;
  oduserId: string;
  teamId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: TeamRole;
  status: MemberStatus;
  huntRole: TeamHuntRole;

  // Stats within team
  huntsParticipated: number;
  pointsContributed: number;
  challengesCompleted: number;

  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  invitedByName: string;
  inviteCode: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
}

export interface TeamHunt {
  id: string;
  teamId: string;
  huntId: string;
  huntTitle: string;
  status: 'scheduled' | 'active' | 'completed';
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  totalScore: number;
  rank?: number;
  participantIds: string[];
}

export interface TeamStats {
  teamId: string;
  totalHunts: number;
  completedHunts: number;
  averageScore: number;
  bestScore: number;
  totalChallenges: number;
  averageCompletionTime: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

// Team Chat Types
export interface ChatMessage {
  id: string;
  odteamId: string;
  teamId: string;
  huntId?: string; // If in a hunt-specific chat
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  messageType: 'text' | 'location' | 'photo' | 'system';
  metadata?: Record<string, unknown>;
  createdAt: string;
  readBy: string[]; // User IDs who have read
}

export interface ChatRoom {
  id: string;
  teamId: string;
  huntId?: string;
  name: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  participants: string[];
}

// Team Leaderboard
export interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  avatarUrl?: string;
  rank: number;
  score: number;
  huntsCompleted: number;
  memberCount: number;
  winRate: number;
}

// Hunt Role Descriptions
export const HUNT_ROLES: Record<TeamHuntRole, { name: string; description: string; icon: string }> = {
  captain: {
    name: 'Captain',
    description: 'Leads the team and makes final decisions',
    icon: 'shield',
  },
  navigator: {
    name: 'Navigator',
    description: 'Handles directions and route planning',
    icon: 'compass',
  },
  photographer: {
    name: 'Photographer',
    description: 'Takes photos for verification challenges',
    icon: 'camera',
  },
  scout: {
    name: 'Scout',
    description: 'Explores ahead to find challenge locations',
    icon: 'eye',
  },
  none: {
    name: 'Member',
    description: 'Regular team member',
    icon: 'person',
  },
};
