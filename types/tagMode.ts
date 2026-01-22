// Tag Mode Types - Inspired by the movie "Tag"
// A competitive, location-based chase game within scavenger hunts

export type TagGameMode = 'classic' | 'hunter_hunted' | 'free_for_all' | 'team_tag';

export type PlayerRole = 'hunter' | 'hunted' | 'neutral';

export type TagStatus = 'active' | 'tagged' | 'immune' | 'safe_zone' | 'stealth';

export interface TagGameSettings {
  mode: TagGameMode;
  tagRadiusMeters: number; // Distance required to tag someone (default: 50m)
  immunityDurationSeconds: number; // Immunity after being tagged or completing challenge
  stealthCostPerMinute: number; // Points cost to hide location
  hunterRotationMinutes: number; // How often hunter role rotates (0 = no rotation)
  allowSabotage: boolean;
  allowAlliances: boolean;
  allowBounties: boolean;
  safeZones: SafeZone[];
  maxAllianceSize: number;
}

export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  activeHours?: {
    start: number; // Hour 0-23
    end: number;
  };
}

export interface TagPlayer {
  id: string;
  oduserId: string;
  userId: string;
  odisplayName: string;
  displayName: string;
  avatarUrl?: string;
  role: PlayerRole;
  status: TagStatus;
  isTraitor?: boolean;

  // Location (fuzzy for privacy)
  lastKnownZone?: PlayerZone;
  exactLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: number;
  };

  // Stats
  tagsCompleted: number;
  timesTagged: number;
  challengesCompleted: number;
  sabotagesDeployed: number;
  bountiesClaimed: number;

  // Current state
  immuneUntil?: string | null;
  stealthUntil?: string | null;
  allianceId?: string;
  activeBounties: string[]; // Bounty IDs targeting this player

  // Points
  score: number;
  bonusPoints: number;
}

export interface PlayerZone {
  // Fuzzy location zone (not exact coordinates)
  zoneId: string;
  zoneName: string; // e.g., "North Park", "Downtown East"
  distanceCategory: 'nearby' | 'medium' | 'far'; // Relative to viewer
  lastUpdated: number;
}

export interface TagEvent {
  id: string;
  huntId: string;
  type: TagEventType;
  actorId: string;
  targetId?: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type TagEventType =
  | 'tag_attempt'
  | 'tag_success'
  | 'tag_failed'
  | 'role_change'
  | 'entered_safe_zone'
  | 'left_safe_zone'
  | 'immunity_started'
  | 'immunity_ended'
  | 'stealth_activated'
  | 'stealth_ended'
  | 'sabotage_deployed'
  | 'sabotage_triggered'
  | 'bounty_placed'
  | 'bounty_claimed'
  | 'alliance_formed'
  | 'alliance_betrayed'
  | 'alliance_dissolved';

// Sabotage System
export type SabotageType =
  | 'decoy_challenge' // Fake challenge that wastes time
  | 'location_scramble' // Temporarily shows wrong location to others
  | 'point_drain' // Slowly drains nearby players' points
  | 'challenge_intercept' // Steal partial credit for nearby completions
  | 'speed_trap'; // Alerts you when someone enters an area

export interface Sabotage {
  id: string;
  type: SabotageType;
  deployedBy: string;
  location: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  expiresAt: string; // ISO date string
  triggered: boolean;
  triggeredBy?: string;
  data: Record<string, unknown>;
}

// Bounty System
export interface Bounty {
  id: string;
  huntId: string;
  targetId: string;
  placedBy: string;
  reward: number;
  expiresAt: number | string; // timestamp or ISO date string
  claimed: boolean;
  claimedBy?: string;
  claimedAt?: number;
  reason?: string; // "Leading by 500 points", "3-streak active", etc.
}

// Alliance System
export interface Alliance {
  id: string;
  huntId: string;
  name: string;
  members: string[]; // User IDs
  leaderId: string;
  formedAt: number;
  sharedProgress: boolean; // Share challenge progress
  betrayedAt?: number;
  betrayedBy?: string;
}

// Proximity Alert
export interface ProximityAlert {
  playerId: string;
  playerName: string;
  distance: number; // meters
  distanceCategory: 'danger_close' | 'nearby' | 'approaching';
  direction?: string; // "north", "southeast", etc.
  isHunter: boolean;
  timestamp: number;
}

// Tag Game State
export interface TagGameState {
  huntId: string;
  settings: TagGameSettings;
  players: TagPlayer[];
  events: TagEvent[];
  sabotages: Sabotage[];
  bounties: Bounty[];
  alliances: Alliance[];

  // Current hunter (for hunter_hunted mode)
  currentHunterId?: string;
  hunterRotatesAt?: number;

  // Game stats
  totalTags: number;
  mostTagsPlayer?: string;
  longestSurvivor?: string;
}

// Default settings
export const DEFAULT_TAG_SETTINGS: TagGameSettings = {
  mode: 'hunter_hunted',
  tagRadiusMeters: 50,
  immunityDurationSeconds: 60,
  stealthCostPerMinute: 10,
  hunterRotationMinutes: 10,
  allowSabotage: true,
  allowAlliances: true,
  allowBounties: true,
  safeZones: [],
  maxAllianceSize: 2,
};
