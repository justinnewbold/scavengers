import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  description?: string;
}

interface VoiceNavState {
  isEnabled: boolean;
  isSpeaking: boolean;
  currentDistance: number;
  currentDirection: string;
  lastSpokenDistance: number;
}

const VOICE_NAV_KEY = 'voice_nav_enabled';
const DISTANCE_THRESHOLDS = [500, 200, 100, 50, 20, 10]; // meters

export function useVoiceNavigation(destination: Waypoint | null) {
  const [state, setState] = useState<VoiceNavState>({
    isEnabled: false,
    isSpeaking: false,
    currentDistance: 0,
    currentDirection: '',
    lastSpokenDistance: Infinity,
  });

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastAnnouncementRef = useRef<number>(0);

  useEffect(() => {
    loadPreference();
    return () => {
      stopNavigation();
    };
  }, []);

  const loadPreference = async () => {
    try {
      const stored = await AsyncStorage.getItem(VOICE_NAV_KEY);
      if (stored === 'true') {
        setState(prev => ({ ...prev, isEnabled: true }));
      }
    } catch {}
  };

  const toggleVoiceNav = useCallback(async () => {
    const newState = !state.isEnabled;
    setState(prev => ({ ...prev, isEnabled: newState }));
    await AsyncStorage.setItem(VOICE_NAV_KEY, String(newState));

    if (newState && destination) {
      speak('Voice navigation enabled. I will guide you to your destination.');
      startNavigation();
    } else {
      Speech.stop();
      stopNavigation();
    }
  }, [state.isEnabled, destination]);

  const speak = useCallback((text: string, options?: { rate?: number }) => {
    setState(prev => ({ ...prev, isSpeaking: true }));

    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: options?.rate || 0.9,
      onDone: () => setState(prev => ({ ...prev, isSpeaking: false })),
      onError: () => setState(prev => ({ ...prev, isSpeaking: false })),
    });
  }, []);

  const calculateDistance = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
    const R = 6371e3;
    const φ1 = (from.lat * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
    const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const calculateBearing = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
    const φ1 = (from.lat * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360;
  };

  const bearingToDirection = (bearing: number, heading?: number): string => {
    // If we have device heading, give relative directions
    if (heading !== undefined) {
      const relativeBearing = (bearing - heading + 360) % 360;

      if (relativeBearing < 30 || relativeBearing > 330) return 'straight ahead';
      if (relativeBearing >= 30 && relativeBearing < 60) return 'slightly right';
      if (relativeBearing >= 60 && relativeBearing < 120) return 'turn right';
      if (relativeBearing >= 120 && relativeBearing < 150) return 'turn sharply right';
      if (relativeBearing >= 150 && relativeBearing < 210) return 'behind you';
      if (relativeBearing >= 210 && relativeBearing < 240) return 'turn sharply left';
      if (relativeBearing >= 240 && relativeBearing < 300) return 'turn left';
      return 'slightly left';
    }

    // Compass directions as fallback
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  const formatDistance = (meters: number): string => {
    if (meters < 10) return 'less than 10 meters';
    if (meters < 50) return `about ${Math.round(meters / 5) * 5} meters`;
    if (meters < 100) return `about ${Math.round(meters / 10) * 10} meters`;
    if (meters < 1000) return `about ${Math.round(meters / 50) * 50} meters`;
    return `about ${(meters / 1000).toFixed(1)} kilometers`;
  };

  const shouldAnnounce = (distance: number, lastSpoken: number): boolean => {
    // Announce when crossing thresholds
    for (const threshold of DISTANCE_THRESHOLDS) {
      if (distance <= threshold && lastSpoken > threshold) {
        return true;
      }
    }

    // Also announce every 100m for longer distances
    if (distance > 500) {
      const currentHundred = Math.floor(distance / 100);
      const lastHundred = Math.floor(lastSpoken / 100);
      return currentHundred !== lastHundred;
    }

    return false;
  };

  const generateAnnouncement = (distance: number, direction: string, destinationName: string): string => {
    if (distance <= 10) {
      return `You have arrived at ${destinationName}. Look around to complete this challenge.`;
    }

    if (distance <= 20) {
      return `Almost there! ${destinationName} is just ${formatDistance(distance)} away.`;
    }

    if (distance <= 50) {
      return `Getting close! Continue ${direction} for ${formatDistance(distance)}.`;
    }

    return `Head ${direction}. ${destinationName} is ${formatDistance(distance)} away.`;
  };

  const startNavigation = useCallback(async () => {
    if (!destination) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      speak('Location permission is required for voice navigation.');
      return;
    }

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (location) => {
        const userPos = { lat: location.coords.latitude, lng: location.coords.longitude };
        const distance = calculateDistance(userPos, destination);
        const bearing = calculateBearing(userPos, destination);
        const direction = bearingToDirection(bearing, location.coords.heading ?? undefined);

        setState(prev => {
          const shouldSpeak = state.isEnabled && shouldAnnounce(distance, prev.lastSpokenDistance);

          if (shouldSpeak) {
            const now = Date.now();
            // Don't speak more than once every 5 seconds
            if (now - lastAnnouncementRef.current > 5000) {
              lastAnnouncementRef.current = now;
              const announcement = generateAnnouncement(distance, direction, destination.name);
              speak(announcement);
            }
          }

          return {
            ...prev,
            currentDistance: distance,
            currentDirection: direction,
            lastSpokenDistance: shouldSpeak ? distance : prev.lastSpokenDistance,
          };
        });
      }
    );
  }, [destination, state.isEnabled, speak]);

  const stopNavigation = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

  const announceCurrentPosition = useCallback(() => {
    if (!destination || state.currentDistance === 0) {
      speak('Calculating your position...');
      return;
    }

    const announcement = generateAnnouncement(
      state.currentDistance,
      state.currentDirection,
      destination.name
    );
    speak(announcement);
  }, [destination, state.currentDistance, state.currentDirection, speak]);

  return {
    isEnabled: state.isEnabled,
    isSpeaking: state.isSpeaking,
    currentDistance: state.currentDistance,
    currentDirection: state.currentDirection,
    toggleVoiceNav,
    announceCurrentPosition,
    speak,
  };
}
