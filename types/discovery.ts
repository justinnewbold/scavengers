// Hunt Discovery Types

export type DiscoverySort = 'distance' | 'rating' | 'popularity' | 'newest' | 'duration';
export type HuntEnvironment = 'indoor' | 'outdoor' | 'both' | 'urban' | 'nature' | 'beach' | 'historical';
export type HuntDifficulty = 'easy' | 'medium' | 'hard';

export interface DiscoveryFilters {
  maxDistance?: number; // kilometers
  difficulty?: HuntDifficulty[];
  environment?: HuntEnvironment[];
  minRating?: number;
  maxDuration?: number; // minutes
  minDuration?: number;
  tags?: string[];
  hasPhotoChallenges?: boolean;
  freeOnly?: boolean;
  sort: DiscoverySort;
}

export interface DiscoverableHunt {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl?: string;

  // Location
  latitude: number;
  longitude: number;
  startLocation?: { latitude: number; longitude: number };
  city?: string;
  address?: string;
  distance?: number; // From user, in meters

  // Hunt details
  challengeCount: number;
  estimatedDuration: number; // minutes
  difficulty: HuntDifficulty;
  environment: HuntEnvironment;
  tags: string[];

  // Stats
  playCount: number;
  completionRate: number;
  averageRating: number;
  rating: number; // Alias for averageRating
  reviewCount: number;

  // Media
  coverImageUrl?: string;
  coverImage?: string; // Alias for coverImageUrl
  previewImages?: string[];

  // Pricing (for future paid hunts)
  isFree: boolean;
  price?: number;

  // Flags
  isFeatured: boolean;
  isTrending: boolean;
  isVerified: boolean; // Creator verified

  createdAt: string;
  updatedAt: string;
}

export interface HuntReview {
  id: string;
  huntId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  helpfulCount: number;
  markedHelpful?: boolean; // Current user marked as helpful
  verified: boolean; // User actually completed the hunt

  // Media
  photos?: string[];

  // Response from creator
  creatorResponse?: {
    content: string;
    respondedAt: string;
  };

  createdAt: string;
  updatedAt: string;
}

export interface DiscoverySection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'horizontal' | 'grid' | 'featured';
  hunts: DiscoverableHunt[];
  viewAllLink?: string;
}

export interface NearbyCluster {
  id: string;
  latitude: number;
  longitude: number;
  center: { latitude: number; longitude: number };
  count: number;
  huntCount: number;
  topHunt: DiscoverableHunt;
  averageRating: number;
}

export interface DiscoveryResponse {
  sections: DiscoverySection[];
  nearbyCount: number;
  featuredHunt?: DiscoverableHunt;
}

export interface SearchResult {
  hunts: DiscoverableHunt[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Recommendation types
export interface PersonalizedRecommendation {
  huntId: string;
  hunt: DiscoverableHunt;
  reason: RecommendationReason;
  score: number; // Internal ranking score
}

export type RecommendationReason =
  | 'similar_to_completed' // Similar to hunts you've completed
  | 'popular_nearby' // Trending in your area
  | 'friends_played' // Your friends have played this
  | 'matches_interests' // Matches your tags/preferences
  | 'creator_followed' // From a creator you follow
  | 'completing_collection' // Part of a series you've started
  | 'new_in_area'; // Recently added near you

export const RECOMMENDATION_LABELS: Record<RecommendationReason, string> = {
  similar_to_completed: 'Because you played similar hunts',
  popular_nearby: 'Trending near you',
  friends_played: 'Your friends played this',
  matches_interests: 'Matches your interests',
  creator_followed: 'From creators you follow',
  completing_collection: 'Complete the series',
  new_in_area: 'New in your area',
};

// Popular tags for discovery
export const POPULAR_TAGS = [
  'outdoor',
  'indoor',
  'family-friendly',
  'adventure',
  'history',
  'food',
  'art',
  'nature',
  'urban',
  'photography',
  'fitness',
  'culture',
  'nightlife',
  'romantic',
  'educational',
  'team-building',
];
