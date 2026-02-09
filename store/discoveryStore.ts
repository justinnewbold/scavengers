import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type {
  DiscoverableHunt,
  DiscoveryFilters,
  DiscoverySection,
  HuntReview,
  SearchResult,
  PersonalizedRecommendation,
  NearbyCluster,
} from '@/types/discovery';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface DiscoveryStore {
  // State
  sections: DiscoverySection[];
  nearbyHunts: DiscoverableHunt[];
  searchResults: DiscoverableHunt[];
  recommendations: PersonalizedRecommendation[];
  clusters: NearbyCluster[];
  featuredHunt: DiscoverableHunt | null;
  currentHunt: DiscoverableHunt | null;
  reviews: HuntReview[];
  filters: DiscoveryFilters;
  userLocation: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  searchCursor: string | null;
  hasMoreResults: boolean;

  // Actions
  fetchDiscovery: () => Promise<void>;
  fetchNearbyHunts: (radius?: number) => Promise<void>;
  fetchHuntDetails: (huntId: string) => Promise<DiscoverableHunt | null>;
  fetchReviews: (huntId: string, page?: number) => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  searchHunts: (query: string, append?: boolean) => Promise<void>;

  // Filters
  setFilters: (filters: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => Promise<void>;

  // Reviews
  submitReview: (huntId: string, rating: number, content: string, title?: string) => Promise<void>;
  markReviewHelpful: (reviewId: string) => Promise<void>;

  // Location
  updateLocation: () => Promise<void>;
  setLocation: (latitude: number, longitude: number) => void;

  // Map
  fetchClusters: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => Promise<void>;

  // Utility
  clearSearch: () => void;
  clearError: () => void;
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  sort: 'distance',
  maxDistance: 50, // km
};

export const useDiscoveryStore = create<DiscoveryStore>((set, get) => ({
  sections: [],
  nearbyHunts: [],
  searchResults: [],
  recommendations: [],
  clusters: [],
  featuredHunt: null,
  currentHunt: null,
  reviews: [],
  filters: DEFAULT_FILTERS,
  userLocation: null,
  isLoading: false,
  isSearching: false,
  error: null,
  searchCursor: null,
  hasMoreResults: false,

  fetchDiscovery: async () => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { userLocation, filters } = get();

      // Update location if not set
      if (!userLocation) {
        await get().updateLocation();
      }

      const location = get().userLocation;
      const params = new URLSearchParams();

      if (location) {
        params.append('latitude', location.latitude.toString());
        params.append('longitude', location.longitude.toString());
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/discovery?${params.toString()}`, {
        headers,
      });

      if (!response.ok) throw new Error('Failed to fetch discovery');

      const data = await response.json();

      set({
        sections: data.sections || [],
        featuredHunt: data.featuredHunt || null,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchNearbyHunts: async (radius = 50) => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { userLocation, filters } = get();

      if (!userLocation) {
        await get().updateLocation();
      }

      const location = get().userLocation;
      if (!location) {
        throw new Error('Location required for nearby hunts');
      }

      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        radius: radius.toString(),
        sort: filters.sort,
      });

      if (filters.difficulty?.length) {
        params.append('difficulty', filters.difficulty.join(','));
      }
      if (filters.environment?.length) {
        params.append('environment', filters.environment.join(','));
      }
      if (filters.minRating) {
        params.append('minRating', filters.minRating.toString());
      }
      if (filters.maxDuration) {
        params.append('maxDuration', filters.maxDuration.toString());
      }
      if (filters.tags?.length) {
        params.append('tags', filters.tags.join(','));
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/discovery/nearby?${params.toString()}`, {
        headers,
      });

      if (!response.ok) throw new Error('Failed to fetch nearby hunts');

      const data = await response.json();
      set({ nearbyHunts: data.hunts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchHuntDetails: async (huntId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { userLocation } = get();

      const params = new URLSearchParams();
      if (userLocation) {
        params.append('latitude', userLocation.latitude.toString());
        params.append('longitude', userLocation.longitude.toString());
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE}/discovery/hunts/${huntId}?${params.toString()}`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to fetch hunt details');

      const data = await response.json();
      set({ currentHunt: data.hunt });
      return data.hunt;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  fetchReviews: async (huntId, page = 1) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE}/discovery/hunts/${huntId}/reviews?page=${page}`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to fetch reviews');

      const data = await response.json();

      if (page === 1) {
        set({ reviews: data.reviews });
      } else {
        set((state) => ({ reviews: [...state.reviews, ...data.reviews] }));
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchRecommendations: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const { userLocation } = get();
      const params = new URLSearchParams();

      if (userLocation) {
        params.append('latitude', userLocation.latitude.toString());
        params.append('longitude', userLocation.longitude.toString());
      }

      const response = await fetch(
        `${API_BASE}/discovery/recommendations?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      set({ recommendations: data.recommendations });
    } catch (error) {
      // Silent fail for recommendations
    }
  },

  searchHunts: async (query, append = false) => {
    if (!append) {
      set({ isSearching: true, searchResults: [], searchCursor: null });
    }

    try {
      const { userLocation, filters, searchCursor } = get();

      const params = new URLSearchParams({
        q: query,
        sort: filters.sort,
      });

      if (userLocation) {
        params.append('latitude', userLocation.latitude.toString());
        params.append('longitude', userLocation.longitude.toString());
      }

      if (append && searchCursor) {
        params.append('cursor', searchCursor);
      }

      if (filters.difficulty?.length) {
        params.append('difficulty', filters.difficulty.join(','));
      }
      if (filters.maxDistance) {
        params.append('maxDistance', filters.maxDistance.toString());
      }

      const token = await AsyncStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/discovery/search?${params.toString()}`, {
        headers,
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      const result = data as SearchResult;

      set((state) => ({
        searchResults: append
          ? [...state.searchResults, ...result.hunts]
          : result.hunts,
        hasMoreResults: result.hasMore,
        searchCursor: result.nextCursor || null,
        isSearching: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isSearching: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  applyFilters: async () => {
    await get().fetchNearbyHunts();
  },

  submitReview: async (huntId, rating, content, title) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/discovery/hunts/${huntId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, content, title }),
      });

      if (!response.ok) throw new Error('Failed to submit review');

      // Refresh reviews
      await get().fetchReviews(huntId);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  markReviewHelpful: async (reviewId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`${API_BASE}/discovery/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      set((state) => ({
        reviews: state.reviews.map((r) =>
          r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
        ),
      }));
    } catch (error) {
      // Silent fail
    }
  },

  updateLocation: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission required');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      set({
        userLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setLocation: (latitude, longitude) => {
    set({ userLocation: { latitude, longitude } });
  },

  fetchClusters: async (bounds) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
      });

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/discovery/clusters?${params.toString()}`, {
        headers,
      });

      if (!response.ok) throw new Error('Failed to fetch clusters');

      const data = await response.json();
      set({ clusters: data.clusters });
    } catch (error) {
      // Silent fail for map clusters
    }
  },

  clearSearch: () => {
    set({
      searchResults: [],
      searchCursor: null,
      hasMoreResults: false,
      isSearching: false,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useDiscoveryStore;
