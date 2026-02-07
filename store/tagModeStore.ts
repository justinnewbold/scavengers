import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type {
  TagGameState,
  TagGameSettings,
  TagPlayer,
  TagEvent,
  Sabotage,
  Bounty,
  Alliance,
  ProximityAlert,
  PlayerRole,
  TagStatus,
  SabotageType,
} from '@/types/tagMode';
import { DEFAULT_TAG_SETTINGS } from '@/types/tagMode';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface TagModeStore {
  // Game state
  gameState: TagGameState | null;
  currentPlayer: TagPlayer | null;
  isLoading: boolean;
  error: string | null;

  // Real-time updates
  proximityAlerts: ProximityAlert[];
  lastLocationUpdate: number;

  // Actions
  initializeTagGame: (huntId: string, settings?: Partial<TagGameSettings>) => Promise<void>;
  joinTagGame: (huntId: string) => Promise<void>;
  leaveTagGame: () => Promise<void>;

  // Location
  updateLocation: (latitude: number, longitude: number) => Promise<void>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;

  // Tag mechanics
  attemptTag: (targetId: string, photoProof?: string) => Promise<boolean>;
  activateStealth: () => Promise<void>;
  deactivateStealth: () => void;

  // Sabotage
  deploySabotage: (type: SabotageType, latitude: number, longitude: number) => Promise<void>;
  getNearbySabotages: () => Sabotage[];

  // Bounties
  placeBounty: (targetId: string, reward: number, reason?: string) => Promise<void>;
  claimBounty: (bountyId: string, proofPhotoUrl?: string) => Promise<void>;
  getActiveBounties: () => Bounty[];

  // Alliances
  formAlliance: (partnerId: string, name: string) => Promise<void>;
  leaveAlliance: () => Promise<void>;
  betrayAlliance: () => Promise<void>;

  // Safe zones
  checkSafeZone: (latitude: number, longitude: number) => boolean;
  getNearestSafeZone: (latitude: number, longitude: number) => { zone: any; distance: number } | null;

  // Utility
  getPlayerById: (playerId: string) => TagPlayer | undefined;
  getPlayerDistance: (playerId: string) => number | null;
  calculateZone: (latitude: number, longitude: number) => string;
  refreshGameState: () => Promise<void>;
  clearError: () => void;
}

// Haversine formula for distance calculation
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate compass direction
function getDirection(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
  const dLon = toLon - fromLon;
  const y = Math.sin(dLon) * Math.cos(toLat * Math.PI / 180);
  const x = Math.cos(fromLat * Math.PI / 180) * Math.sin(toLat * Math.PI / 180) -
    Math.sin(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

let locationSubscription: Location.LocationSubscription | null = null;

export const useTagModeStore = create<TagModeStore>((set, get) => ({
  gameState: null,
  currentPlayer: null,
  isLoading: false,
  error: null,
  proximityAlerts: [],
  lastLocationUpdate: 0,

  initializeTagGame: async (huntId, settings = {}) => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          huntId,
          settings: { ...DEFAULT_TAG_SETTINGS, ...settings },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize tag game');
      }

      const gameState = await response.json();
      set({ gameState, isLoading: false });

      // Start location tracking
      get().startLocationTracking();
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  joinTagGame: async (huntId) => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${huntId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join tag game');
      }

      const { gameState, player } = await response.json();
      set({ gameState, currentPlayer: player, isLoading: false });

      // Start location tracking
      get().startLocationTracking();
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  leaveTagGame: async () => {
    get().stopLocationTracking();

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { gameState } = get();

      if (token && gameState) {
        await fetch(`${API_BASE}/tag/games/${gameState.huntId}/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Failed to leave tag game:', error);
    }

    set({ gameState: null, currentPlayer: null, proximityAlerts: [] });
  },

  updateLocation: async (latitude, longitude) => {
    const { gameState, currentPlayer } = get();
    if (!gameState || !currentPlayer) return;

    const now = Date.now();
    const zone = get().calculateZone(latitude, longitude);

    // Update local state
    set({
      currentPlayer: {
        ...currentPlayer,
        exactLocation: { latitude, longitude, updatedAt: now },
        lastKnownZone: {
          zoneId: zone,
          zoneName: zone,
          distanceCategory: 'nearby',
          lastUpdated: now,
        },
      },
      lastLocationUpdate: now,
    });

    // Check for proximity alerts
    const alerts: ProximityAlert[] = [];
    for (const player of gameState.players) {
      if (player.id === currentPlayer.id) continue;
      if (!player.exactLocation) continue;

      const distance = getDistanceMeters(
        latitude, longitude,
        player.exactLocation.latitude, player.exactLocation.longitude
      );

      if (distance < 100) { // Within 100 meters
        const direction = getDirection(
          latitude, longitude,
          player.exactLocation.latitude, player.exactLocation.longitude
        );

        let distanceCategory: 'danger_close' | 'nearby' | 'approaching' = 'approaching';
        if (distance < 30) distanceCategory = 'danger_close';
        else if (distance < 60) distanceCategory = 'nearby';

        alerts.push({
          playerId: player.id,
          playerName: player.displayName,
          distance,
          distanceCategory,
          direction,
          isHunter: player.role === 'hunter',
          timestamp: now,
        });
      }
    }

    set({ proximityAlerts: alerts });

    // Check safe zones
    const inSafeZone = get().checkSafeZone(latitude, longitude);
    if (inSafeZone && currentPlayer.status !== 'safe_zone') {
      set({
        currentPlayer: { ...currentPlayer, status: 'safe_zone' },
      });
    } else if (!inSafeZone && currentPlayer.status === 'safe_zone') {
      set({
        currentPlayer: { ...currentPlayer, status: 'active' },
      });
    }

    // Sync to server (throttled)
    if (now - get().lastLocationUpdate > 5000) { // Every 5 seconds
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          fetch(`${API_BASE}/tag/games/${gameState.huntId}/location`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude, zone }),
          }).catch(() => {}); // Fire and forget
        }
      } catch {}
    }
  },

  startLocationTracking: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      set({ error: 'Location permission required for Tag Mode' });
      return;
    }

    // Clean up any existing subscription before creating a new one
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5, // Update every 5 meters
        timeInterval: 3000, // Or every 3 seconds
      },
      (location) => {
        get().updateLocation(location.coords.latitude, location.coords.longitude);
      }
    );
  },

  stopLocationTracking: () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
  },

  attemptTag: async (targetId, photoProof) => {
    const { gameState, currentPlayer } = get();
    if (!gameState || !currentPlayer) return false;

    // Check if player can tag
    if (currentPlayer.status === 'tagged' || currentPlayer.status === 'safe_zone') {
      set({ error: 'Cannot tag while tagged or in safe zone' });
      return false;
    }

    // Find target
    const target = gameState.players.find(p => p.id === targetId);
    if (!target) {
      set({ error: 'Target not found' });
      return false;
    }

    // Check if target is immune or in safe zone
    if (target.status === 'immune' || target.status === 'safe_zone') {
      set({ error: 'Target is immune or in safe zone' });
      return false;
    }

    // Check distance
    if (!currentPlayer.exactLocation || !target.exactLocation) {
      set({ error: 'Location not available' });
      return false;
    }

    const distance = getDistanceMeters(
      currentPlayer.exactLocation.latitude,
      currentPlayer.exactLocation.longitude,
      target.exactLocation.latitude,
      target.exactLocation.longitude
    );

    if (distance > gameState.settings.tagRadiusMeters) {
      set({ error: `Target is ${Math.round(distance)}m away (need ${gameState.settings.tagRadiusMeters}m)` });
      return false;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}/tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetId, photoProof }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Tag failed');
      }

      const result = await response.json();

      // Update game state
      set({ gameState: result.gameState });

      return true;
    } catch (error) {
      set({ error: (error as Error).message });
      return false;
    }
  },

  activateStealth: async () => {
    const { gameState, currentPlayer } = get();
    if (!gameState || !currentPlayer) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}/stealth`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to activate stealth');
      }

      const { stealthUntil } = await response.json();
      set({
        currentPlayer: {
          ...currentPlayer,
          status: 'stealth',
          stealthUntil,
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deactivateStealth: () => {
    const { currentPlayer } = get();
    if (!currentPlayer) return;

    set({
      currentPlayer: {
        ...currentPlayer,
        status: 'active',
        stealthUntil: undefined,
      },
    });
  },

  deploySabotage: async (type, latitude, longitude) => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}/sabotage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, latitude, longitude }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to deploy sabotage');
      }

      await get().refreshGameState();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getNearbySabotages: () => {
    const { gameState, currentPlayer } = get();
    if (!gameState || !currentPlayer?.exactLocation) return [];

    return gameState.sabotages.filter(s => {
      if (s.triggered) return false;
      const distance = getDistanceMeters(
        currentPlayer.exactLocation!.latitude,
        currentPlayer.exactLocation!.longitude,
        s.location.latitude,
        s.location.longitude
      );
      return distance < 200; // Show sabotages within 200m
    });
  },

  placeBounty: async (targetId, reward, reason) => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}/bounty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetId, reward, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to place bounty');
      }

      await get().refreshGameState();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  claimBounty: async (bountyId, proofPhotoUrl) => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}/bounty/${bountyId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ proofPhotoUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to claim bounty');
      }

      await get().refreshGameState();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getActiveBounties: () => {
    const { gameState } = get();
    if (!gameState) return [];

    const now = Date.now();
    return gameState.bounties.filter(b => {
      const expiresAt = typeof b.expiresAt === 'string'
        ? new Date(b.expiresAt).getTime()
        : b.expiresAt;
      return !b.claimed && expiresAt > now;
    });
  },

  formAlliance: async (partnerId, name) => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}/alliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerId, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to form alliance');
      }

      await get().refreshGameState();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  leaveAlliance: async () => {
    const { gameState, currentPlayer } = get();
    if (!gameState || !currentPlayer?.allianceId) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      await fetch(`${API_BASE}/tag/games/${gameState.huntId}/alliance/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      await get().refreshGameState();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  betrayAlliance: async () => {
    const { gameState, currentPlayer } = get();
    if (!gameState || !currentPlayer?.allianceId) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}/alliance/betray`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to betray alliance');
      }

      await get().refreshGameState();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  checkSafeZone: (latitude, longitude) => {
    const { gameState } = get();
    if (!gameState) return false;

    const now = new Date();
    const currentHour = now.getHours();

    for (const zone of gameState.settings.safeZones) {
      // Check if zone is active (time-based)
      if (zone.activeHours) {
        const { start, end } = zone.activeHours;
        if (start < end) {
          if (currentHour < start || currentHour >= end) continue;
        } else {
          if (currentHour < start && currentHour >= end) continue;
        }
      }

      const distance = getDistanceMeters(latitude, longitude, zone.latitude, zone.longitude);
      if (distance <= zone.radiusMeters) {
        return true;
      }
    }

    return false;
  },

  getNearestSafeZone: (latitude, longitude) => {
    const { gameState } = get();
    if (!gameState || gameState.settings.safeZones.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const zone of gameState.settings.safeZones) {
      const distance = getDistanceMeters(latitude, longitude, zone.latitude, zone.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = zone;
      }
    }

    return nearest ? { zone: nearest, distance: minDistance } : null;
  },

  getPlayerById: (playerId) => {
    const { gameState } = get();
    return gameState?.players.find(p => p.id === playerId);
  },

  getPlayerDistance: (playerId) => {
    const { currentPlayer } = get();
    const target = get().getPlayerById(playerId);

    if (!currentPlayer?.exactLocation || !target?.exactLocation) return null;

    return getDistanceMeters(
      currentPlayer.exactLocation.latitude,
      currentPlayer.exactLocation.longitude,
      target.exactLocation.latitude,
      target.exactLocation.longitude
    );
  },

  calculateZone: (latitude, longitude) => {
    // Simple zone calculation based on lat/lon grid
    // In production, you'd use actual neighborhood/area names
    const latZone = Math.floor(latitude * 100) / 100;
    const lonZone = Math.floor(longitude * 100) / 100;

    const directions = ['North', 'South'];
    const latDir = latitude >= 0 ? directions[0] : directions[1];

    return `Zone ${latDir} ${Math.abs(latZone).toFixed(2)}`;
  },

  refreshGameState: async () => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/tag/games/${gameState.huntId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const newState = await response.json();
        set({ gameState: newState });
      }
    } catch (error) {
      console.error('Failed to refresh game state:', error);
    }
  },

  clearError: () => set({ error: null }),
}));

export default useTagModeStore;
