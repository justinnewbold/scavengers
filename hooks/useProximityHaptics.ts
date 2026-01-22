import { useEffect, useRef, useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { triggerHaptic } from './useHaptics';

interface ProximityTarget {
  latitude: number;
  longitude: number;
  revealRadius?: number; // Distance at which mystery is revealed (default: 50m)
}

interface ProximityState {
  distance: number | null;
  isNearby: boolean;
  isRevealed: boolean; // For mystery challenges
  intensity: 'far' | 'medium' | 'close' | 'arrived';
}

interface UseProximityHapticsOptions {
  enabled?: boolean;
  hapticInterval?: number; // Minimum ms between haptic pulses
  target?: ProximityTarget | null;
  onReveal?: () => void; // Called when mystery challenge is revealed
  onArrival?: () => void; // Called when user arrives at location
}

// Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get intensity level based on distance
function getIntensity(distance: number, revealRadius: number): ProximityState['intensity'] {
  if (distance <= revealRadius) return 'arrived';
  if (distance <= revealRadius * 2) return 'close';
  if (distance <= revealRadius * 4) return 'medium';
  return 'far';
}

// Get haptic interval based on intensity (faster when closer)
function getHapticInterval(intensity: ProximityState['intensity']): number {
  switch (intensity) {
    case 'arrived': return 500;    // 0.5s - rapid pulse
    case 'close': return 1000;     // 1s
    case 'medium': return 2000;    // 2s
    case 'far': return 4000;       // 4s - slow pulse
  }
}

export function useProximityHaptics(options: UseProximityHapticsOptions = {}) {
  const {
    enabled = true,
    target,
    onReveal,
    onArrival,
  } = options;

  const [proximityState, setProximityState] = useState<ProximityState>({
    distance: null,
    isNearby: false,
    isRevealed: false,
    intensity: 'far',
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastHapticTime = useRef<number>(0);
  const hasTriggeredReveal = useRef(false);
  const hasTriggeredArrival = useRef(false);

  // Request location permission
  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return false;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  // Trigger haptic based on intensity
  const triggerProximityHaptic = useCallback((intensity: ProximityState['intensity']) => {
    const now = Date.now();
    const interval = getHapticInterval(intensity);

    if (now - lastHapticTime.current < interval) return;

    lastHapticTime.current = now;

    switch (intensity) {
      case 'arrived':
        triggerHaptic('success');
        break;
      case 'close':
        triggerHaptic('heavy');
        break;
      case 'medium':
        triggerHaptic('medium');
        break;
      case 'far':
        triggerHaptic('light');
        break;
    }
  }, []);

  // Start tracking location
  useEffect(() => {
    if (!enabled || !target || Platform.OS === 'web') return;

    let isMounted = true;
    const revealRadius = target.revealRadius || 50;

    const startTracking = async () => {
      const granted = await requestPermission();
      if (!granted || !isMounted) return;

      try {
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 3, // Update every 3 meters
          },
          (location) => {
            if (!isMounted) return;

            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              target.latitude,
              target.longitude
            );

            const intensity = getIntensity(distance, revealRadius);
            const isNearby = distance <= revealRadius * 4;
            const isRevealed = distance <= revealRadius * 2;
            const hasArrived = distance <= revealRadius;

            setProximityState({
              distance,
              isNearby,
              isRevealed,
              intensity,
            });

            // Trigger haptic feedback when nearby
            if (isNearby) {
              triggerProximityHaptic(intensity);
            }

            // Trigger reveal callback once
            if (isRevealed && !hasTriggeredReveal.current) {
              hasTriggeredReveal.current = true;
              onReveal?.();
              triggerHaptic('warning'); // Alert user that mystery is revealed
            }

            // Trigger arrival callback once
            if (hasArrived && !hasTriggeredArrival.current) {
              hasTriggeredArrival.current = true;
              onArrival?.();
              triggerHaptic('success');
            }
          }
        );
      } catch (error) {
        console.error('Failed to start location tracking:', error);
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [enabled, target, requestPermission, triggerProximityHaptic, onReveal, onArrival]);

  // Reset triggers when target changes
  useEffect(() => {
    hasTriggeredReveal.current = false;
    hasTriggeredArrival.current = false;
  }, [target?.latitude, target?.longitude]);

  // Manual location check
  const checkProximity = useCallback(async (): Promise<ProximityState | null> => {
    if (!target || Platform.OS === 'web') return null;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        target.latitude,
        target.longitude
      );

      const revealRadius = target.revealRadius || 50;
      const intensity = getIntensity(distance, revealRadius);

      const state: ProximityState = {
        distance,
        isNearby: distance <= revealRadius * 4,
        isRevealed: distance <= revealRadius * 2,
        intensity,
      };

      setProximityState(state);
      return state;
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  }, [target]);

  return {
    ...proximityState,
    hasPermission,
    requestPermission,
    checkProximity,
    // Formatted distance string
    distanceText: proximityState.distance !== null
      ? proximityState.distance < 1000
        ? `${Math.round(proximityState.distance)}m`
        : `${(proximityState.distance / 1000).toFixed(1)}km`
      : null,
  };
}
