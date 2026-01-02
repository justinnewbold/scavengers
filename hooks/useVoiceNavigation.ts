import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateDistance,
  calculateBearing,
  bearingToRelativeDirection,
  formatDistance,
  type Coordinates,
} from '@/lib/geo';

interface Waypoint extends Coordinates {
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

  const stopNavigation = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

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
        const direction = bearingToRelativeDirection(bearing, location.coords.heading ?? undefined);

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

  useEffect(() => {
    loadPreference();
    return () => {
      stopNavigation();
    };
  }, [stopNavigation]);

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
  }, [state.isEnabled, destination, speak, startNavigation, stopNavigation]);

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
