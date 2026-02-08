import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useDiscoveryStore } from '../discoveryStore';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.7128, longitude: -74.006 },
  }),
  Accuracy: {
    Balanced: 3,
  },
}));

const API_BASE = 'https://scavengers.newbold.cloud/api';

const mockHunt = {
  id: 'hunt-1',
  title: 'Central Park Adventure',
  description: 'Explore Central Park',
  creatorId: 'user-1',
  creatorName: 'Test Creator',
  latitude: 40.7829,
  longitude: -73.9654,
  challengeCount: 5,
  estimatedDuration: 60,
  difficulty: 'medium' as const,
  environment: 'outdoor' as const,
  tags: ['nature', 'outdoor'],
  playCount: 150,
  completionRate: 0.78,
  averageRating: 4.5,
  rating: 4.5,
  reviewCount: 32,
  isFree: true,
  isFeatured: false,
  isTrending: true,
  isVerified: true,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-03-01T15:00:00Z',
};

const mockHunt2 = {
  ...mockHunt,
  id: 'hunt-2',
  title: 'Brooklyn Bridge Walk',
  description: 'Walk across the Brooklyn Bridge',
  latitude: 40.7061,
  longitude: -73.9969,
  difficulty: 'easy' as const,
  tags: ['urban', 'photography'],
};

const mockReview = {
  id: 'review-1',
  huntId: 'hunt-1',
  userId: 'user-2',
  userName: 'Reviewer Jane',
  rating: 5,
  title: 'Amazing hunt!',
  content: 'Really enjoyed this scavenger hunt.',
  helpfulCount: 12,
  verified: true,
  createdAt: '2025-02-10T08:00:00Z',
  updatedAt: '2025-02-10T08:00:00Z',
};

const mockReview2 = {
  id: 'review-2',
  huntId: 'hunt-1',
  userId: 'user-3',
  userName: 'Reviewer Bob',
  rating: 4,
  content: 'Good fun, a few challenges were tricky.',
  helpfulCount: 3,
  verified: true,
  createdAt: '2025-02-12T14:00:00Z',
  updatedAt: '2025-02-12T14:00:00Z',
};

const mockSection = {
  id: 'section-1',
  title: 'Trending Near You',
  subtitle: 'Popular hunts in your area',
  type: 'horizontal' as const,
  hunts: [mockHunt, mockHunt2],
};

const mockRecommendation = {
  huntId: 'hunt-1',
  hunt: mockHunt,
  reason: 'popular_nearby' as const,
  score: 0.95,
};

const mockCluster = {
  id: 'cluster-1',
  latitude: 40.75,
  longitude: -73.98,
  center: { latitude: 40.75, longitude: -73.98 },
  count: 8,
  huntCount: 8,
  topHunt: mockHunt,
  averageRating: 4.2,
};

beforeEach(() => {
  useDiscoveryStore.setState({
    sections: [],
    nearbyHunts: [],
    searchResults: [],
    recommendations: [],
    clusters: [],
    featuredHunt: null,
    currentHunt: null,
    reviews: [],
    filters: {
      sort: 'distance',
      maxDistance: 50,
    },
    userLocation: null,
    isLoading: false,
    isSearching: false,
    error: null,
    searchCursor: null,
    hasMoreResults: false,
  });
  (global.fetch as jest.Mock).mockReset();
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockClear();
  (Location.getCurrentPositionAsync as jest.Mock).mockClear();
});

describe('useDiscoveryStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useDiscoveryStore.getState();

      expect(state.sections).toEqual([]);
      expect(state.nearbyHunts).toEqual([]);
      expect(state.searchResults).toEqual([]);
      expect(state.recommendations).toEqual([]);
      expect(state.clusters).toEqual([]);
      expect(state.featuredHunt).toBeNull();
      expect(state.currentHunt).toBeNull();
      expect(state.reviews).toEqual([]);
      expect(state.filters).toEqual({ sort: 'distance', maxDistance: 50 });
      expect(state.userLocation).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isSearching).toBe(false);
      expect(state.error).toBeNull();
      expect(state.searchCursor).toBeNull();
      expect(state.hasMoreResults).toBe(false);
    });
  });

  describe('fetchDiscovery', () => {
    it('should fetch discovery sections and featured hunt', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sections: [mockSection],
          featuredHunt: mockHunt,
        }),
      });

      await useDiscoveryStore.getState().fetchDiscovery();

      const state = useDiscoveryStore.getState();
      expect(state.sections).toHaveLength(1);
      expect(state.sections[0].title).toBe('Trending Near You');
      expect(state.featuredHunt).toEqual(mockHunt);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoading while fetching discovery', async () => {
      let loadingDuringFetch = false;

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useDiscoveryStore.getState().isLoading;
        return {
          ok: true,
          json: async () => ({ sections: [], featuredHunt: null }),
        };
      });

      await useDiscoveryStore.getState().fetchDiscovery();

      expect(loadingDuringFetch).toBe(true);
      expect(useDiscoveryStore.getState().isLoading).toBe(false);
    });

    it('should update location if not already set', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sections: [], featuredHunt: null }),
      });

      await useDiscoveryStore.getState().fetchDiscovery();

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      expect(useDiscoveryStore.getState().userLocation).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('should include location params and auth header when available', async () => {
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('my-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sections: [], featuredHunt: null }),
      });

      await useDiscoveryStore.getState().fetchDiscovery();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('latitude=40.7128');
      expect(fetchCall[0]).toContain('longitude=-74.006');
      expect(fetchCall[1].headers.Authorization).toBe('Bearer my-token');
    });

    it('should handle fetch discovery failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await useDiscoveryStore.getState().fetchDiscovery();

      const state = useDiscoveryStore.getState();
      expect(state.error).toBe('Failed to fetch discovery');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchNearbyHunts', () => {
    it('should fetch nearby hunts with location and default radius', async () => {
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: [mockHunt, mockHunt2] }),
      });

      await useDiscoveryStore.getState().fetchNearbyHunts();

      const state = useDiscoveryStore.getState();
      expect(state.nearbyHunts).toHaveLength(2);
      expect(state.nearbyHunts[0].title).toBe('Central Park Adventure');
      expect(state.isLoading).toBe(false);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('radius=50');
      expect(fetchUrl).toContain('latitude=40.7128');
      expect(fetchUrl).toContain('longitude=-74.006');
      expect(fetchUrl).toContain('sort=distance');
    });

    it('should fetch nearby hunts with a custom radius', async () => {
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: [mockHunt] }),
      });

      await useDiscoveryStore.getState().fetchNearbyHunts(10);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('radius=10');
    });

    it('should include filter params when filters are set', async () => {
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
        filters: {
          sort: 'rating',
          difficulty: ['easy', 'medium'],
          environment: ['outdoor'],
          minRating: 4,
          maxDuration: 90,
          tags: ['nature', 'family-friendly'],
          maxDistance: 25,
        },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: [] }),
      });

      await useDiscoveryStore.getState().fetchNearbyHunts();

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('sort=rating');
      expect(fetchUrl).toContain('difficulty=easy%2Cmedium');
      expect(fetchUrl).toContain('environment=outdoor');
      expect(fetchUrl).toContain('minRating=4');
      expect(fetchUrl).toContain('maxDuration=90');
      expect(fetchUrl).toContain('tags=nature%2Cfamily-friendly');
    });

    it('should throw error when location is not available and cannot be retrieved', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      await useDiscoveryStore.getState().fetchNearbyHunts();

      const state = useDiscoveryStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch nearby hunts network error', async () => {
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useDiscoveryStore.getState().fetchNearbyHunts();

      expect(useDiscoveryStore.getState().error).toBe('Network error');
      expect(useDiscoveryStore.getState().isLoading).toBe(false);
    });
  });

  describe('fetchHuntDetails', () => {
    it('should fetch and return hunt details', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunt: mockHunt }),
      });

      const result = await useDiscoveryStore.getState().fetchHuntDetails('hunt-1');

      expect(result).toEqual(mockHunt);
      expect(useDiscoveryStore.getState().currentHunt).toEqual(mockHunt);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('/discovery/hunts/hunt-1');
      expect(fetchCall[0]).toContain('latitude=40.7128');
      expect(fetchCall[1].headers.Authorization).toBe('Bearer mock-token');
    });

    it('should return null on failure and set error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await useDiscoveryStore.getState().fetchHuntDetails('hunt-999');

      expect(result).toBeNull();
      expect(useDiscoveryStore.getState().error).toBe('Failed to fetch hunt details');
    });
  });

  describe('searchHunts', () => {
    it('should search hunts and store results', async () => {
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hunts: [mockHunt],
          totalCount: 1,
          hasMore: false,
          nextCursor: null,
        }),
      });

      await useDiscoveryStore.getState().searchHunts('park');

      const state = useDiscoveryStore.getState();
      expect(state.searchResults).toHaveLength(1);
      expect(state.searchResults[0].title).toBe('Central Park Adventure');
      expect(state.hasMoreResults).toBe(false);
      expect(state.searchCursor).toBeNull();
      expect(state.isSearching).toBe(false);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('q=park');
    });

    it('should set isSearching during search', async () => {
      let searchingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        searchingDuringFetch = useDiscoveryStore.getState().isSearching;
        return {
          ok: true,
          json: async () => ({ hunts: [], totalCount: 0, hasMore: false }),
        };
      });

      await useDiscoveryStore.getState().searchHunts('test');

      expect(searchingDuringFetch).toBe(true);
      expect(useDiscoveryStore.getState().isSearching).toBe(false);
    });

    it('should append results when append is true and cursor is available', async () => {
      useDiscoveryStore.setState({
        searchResults: [mockHunt],
        searchCursor: 'cursor-abc',
        hasMoreResults: true,
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hunts: [mockHunt2],
          totalCount: 2,
          hasMore: false,
          nextCursor: null,
        }),
      });

      await useDiscoveryStore.getState().searchHunts('park', true);

      const state = useDiscoveryStore.getState();
      expect(state.searchResults).toHaveLength(2);
      expect(state.searchResults[0].id).toBe('hunt-1');
      expect(state.searchResults[1].id).toBe('hunt-2');
      expect(state.hasMoreResults).toBe(false);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('cursor=cursor-abc');
    });

    it('should include filter params in search', async () => {
      useDiscoveryStore.setState({
        filters: {
          sort: 'popularity',
          difficulty: ['hard'],
          maxDistance: 10,
        },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: [], totalCount: 0, hasMore: false }),
      });

      await useDiscoveryStore.getState().searchHunts('challenge');

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('sort=popularity');
      expect(fetchUrl).toContain('difficulty=hard');
      expect(fetchUrl).toContain('maxDistance=10');
    });

    it('should handle search failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useDiscoveryStore.getState().searchHunts('test');

      expect(useDiscoveryStore.getState().error).toBe('Search failed');
      expect(useDiscoveryStore.getState().isSearching).toBe(false);
    });
  });

  describe('setFilters', () => {
    it('should merge new filters with existing ones', () => {
      useDiscoveryStore.getState().setFilters({ difficulty: ['hard'], minRating: 4 });

      const state = useDiscoveryStore.getState();
      expect(state.filters.difficulty).toEqual(['hard']);
      expect(state.filters.minRating).toBe(4);
      // Original defaults should still be present
      expect(state.filters.sort).toBe('distance');
      expect(state.filters.maxDistance).toBe(50);
    });

    it('should override specific filter values', () => {
      useDiscoveryStore.getState().setFilters({ sort: 'rating' });
      useDiscoveryStore.getState().setFilters({ sort: 'newest' });

      expect(useDiscoveryStore.getState().filters.sort).toBe('newest');
    });
  });

  describe('resetFilters', () => {
    it('should reset filters to default values', () => {
      // Set non-default filters
      useDiscoveryStore.setState({
        filters: {
          sort: 'popularity',
          maxDistance: 10,
          difficulty: ['hard'],
          environment: ['indoor'],
          minRating: 4.5,
          maxDuration: 30,
          tags: ['art'],
        },
      });

      useDiscoveryStore.getState().resetFilters();

      const state = useDiscoveryStore.getState();
      expect(state.filters).toEqual({
        sort: 'distance',
        maxDistance: 50,
      });
    });
  });

  describe('fetchReviews', () => {
    it('should fetch reviews for page 1 and replace existing reviews', async () => {
      useDiscoveryStore.setState({ reviews: [mockReview] });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviews: [mockReview, mockReview2] }),
      });

      await useDiscoveryStore.getState().fetchReviews('hunt-1');

      const state = useDiscoveryStore.getState();
      expect(state.reviews).toHaveLength(2);
      expect(state.reviews[0].id).toBe('review-1');
      expect(state.reviews[1].id).toBe('review-2');

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('/discovery/hunts/hunt-1/reviews?page=1');
    });

    it('should append reviews for subsequent pages', async () => {
      useDiscoveryStore.setState({ reviews: [mockReview] });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviews: [mockReview2] }),
      });

      await useDiscoveryStore.getState().fetchReviews('hunt-1', 2);

      const state = useDiscoveryStore.getState();
      expect(state.reviews).toHaveLength(2);
      expect(state.reviews[0].id).toBe('review-1');
      expect(state.reviews[1].id).toBe('review-2');

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('page=2');
    });

    it('should handle fetch reviews failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await useDiscoveryStore.getState().fetchReviews('hunt-1');

      expect(useDiscoveryStore.getState().error).toBe('Failed to fetch reviews');
    });
  });

  describe('submitReview', () => {
    it('should submit a review and refresh reviews', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      // First call: POST review
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ review: { id: 'new-review' } }),
      });
      // Second call: GET reviews (refresh after submit)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviews: [mockReview] }),
      });

      await useDiscoveryStore.getState().submitReview('hunt-1', 5, 'Great hunt!', 'Loved it');

      // Verify POST was called with correct body and auth
      const postCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(postCall[0]).toContain('/discovery/hunts/hunt-1/reviews');
      expect(postCall[1].method).toBe('POST');
      expect(postCall[1].headers.Authorization).toBe('Bearer mock-token');
      expect(postCall[1].headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(postCall[1].body);
      expect(body.rating).toBe(5);
      expect(body.content).toBe('Great hunt!');
      expect(body.title).toBe('Loved it');

      // Reviews were refreshed
      expect(useDiscoveryStore.getState().reviews).toHaveLength(1);
    });

    it('should throw error when not authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useDiscoveryStore.getState().submitReview('hunt-1', 5, 'Great!')
      ).rejects.toThrow('Not authenticated');

      expect(useDiscoveryStore.getState().error).toBe('Not authenticated');
    });

    it('should throw error on API failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      await expect(
        useDiscoveryStore.getState().submitReview('hunt-1', 3, 'Okay')
      ).rejects.toThrow('Failed to submit review');

      expect(useDiscoveryStore.getState().error).toBe('Failed to submit review');
    });
  });

  describe('fetchRecommendations', () => {
    it('should fetch recommendations when authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recommendations: [mockRecommendation] }),
      });

      await useDiscoveryStore.getState().fetchRecommendations();

      const state = useDiscoveryStore.getState();
      expect(state.recommendations).toHaveLength(1);
      expect(state.recommendations[0].reason).toBe('popular_nearby');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('/discovery/recommendations');
      expect(fetchCall[0]).toContain('latitude=40.7128');
      expect(fetchCall[1].headers.Authorization).toBe('Bearer mock-token');
    });

    it('should not fetch recommendations when not authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useDiscoveryStore.getState().fetchRecommendations();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(useDiscoveryStore.getState().recommendations).toEqual([]);
    });

    it('should silently fail on recommendation fetch error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

      await useDiscoveryStore.getState().fetchRecommendations();

      // Should not set error state for silent failure
      expect(useDiscoveryStore.getState().error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should clear error with clearError', () => {
      useDiscoveryStore.setState({ error: 'Some error occurred' });

      useDiscoveryStore.getState().clearError();

      expect(useDiscoveryStore.getState().error).toBeNull();
    });

    it('should clear search state with clearSearch', () => {
      useDiscoveryStore.setState({
        searchResults: [mockHunt],
        searchCursor: 'cursor-xyz',
        hasMoreResults: true,
        isSearching: true,
      });

      useDiscoveryStore.getState().clearSearch();

      const state = useDiscoveryStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(state.searchCursor).toBeNull();
      expect(state.hasMoreResults).toBe(false);
      expect(state.isSearching).toBe(false);
    });

    it('should handle network error on fetchDiscovery gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
      });
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to connect'));

      await useDiscoveryStore.getState().fetchDiscovery();

      expect(useDiscoveryStore.getState().error).toBe('Failed to connect');
      expect(useDiscoveryStore.getState().isLoading).toBe(false);
    });
  });

  describe('location', () => {
    it('should update location via updateLocation', async () => {
      await useDiscoveryStore.getState().updateLocation();

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      expect(useDiscoveryStore.getState().userLocation).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('should set error when location permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      await useDiscoveryStore.getState().updateLocation();

      expect(useDiscoveryStore.getState().error).toBe('Location permission required');
      expect(useDiscoveryStore.getState().userLocation).toBeNull();
    });

    it('should set location manually via setLocation', () => {
      useDiscoveryStore.getState().setLocation(51.5074, -0.1278);

      expect(useDiscoveryStore.getState().userLocation).toEqual({
        latitude: 51.5074,
        longitude: -0.1278,
      });
    });
  });

  describe('markReviewHelpful', () => {
    it('should increment helpfulCount for the specified review', async () => {
      useDiscoveryStore.setState({
        reviews: [mockReview, mockReview2],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useDiscoveryStore.getState().markReviewHelpful('review-1');

      const state = useDiscoveryStore.getState();
      expect(state.reviews[0].helpfulCount).toBe(13); // 12 + 1
      expect(state.reviews[1].helpfulCount).toBe(3); // unchanged
    });

    it('should not call API when not authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useDiscoveryStore.getState().markReviewHelpful('review-1');

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('fetchClusters', () => {
    it('should fetch map clusters for given bounds', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clusters: [mockCluster] }),
      });

      const bounds = { north: 41.0, south: 40.5, east: -73.5, west: -74.5 };
      await useDiscoveryStore.getState().fetchClusters(bounds);

      const state = useDiscoveryStore.getState();
      expect(state.clusters).toHaveLength(1);
      expect(state.clusters[0].huntCount).toBe(8);

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('north=41');
      expect(fetchUrl).toContain('south=40.5');
      expect(fetchUrl).toContain('east=-73.5');
      expect(fetchUrl).toContain('west=-74.5');
    });

    it('should silently fail on cluster fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const bounds = { north: 41.0, south: 40.5, east: -73.5, west: -74.5 };
      await useDiscoveryStore.getState().fetchClusters(bounds);

      // Should not set error for silent failure
      expect(useDiscoveryStore.getState().error).toBeNull();
      expect(useDiscoveryStore.getState().clusters).toEqual([]);
    });
  });

  describe('applyFilters', () => {
    it('should delegate to fetchNearbyHunts', async () => {
      useDiscoveryStore.setState({
        userLocation: { latitude: 40.7128, longitude: -74.006 },
        filters: { sort: 'rating', maxDistance: 25 },
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: [mockHunt] }),
      });

      await useDiscoveryStore.getState().applyFilters();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('/discovery/nearby');
      expect(fetchUrl).toContain('sort=rating');
      expect(useDiscoveryStore.getState().nearbyHunts).toHaveLength(1);
    });
  });
});
