import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function LocationScreen() {
  const { challengeId: _challengeId, targetLat, targetLng, radius } = useLocalSearchParams<{
    challengeId: string;
    targetLat: string;
    targetLng: string;
    radius: string;
  }>();
  const router = useRouter();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);

  // Validate and parse coordinates with NaN protection
  const targetLatNum = parseFloat(targetLat || '0');
  const targetLngNum = parseFloat(targetLng || '0');
  const radiusNum = parseFloat(radius || '50');

  // Validate coordinates are valid numbers
  const hasValidTarget = !isNaN(targetLatNum) && !isNaN(targetLngNum) &&
    targetLatNum >= -90 && targetLatNum <= 90 &&
    targetLngNum >= -180 && targetLngNum <= 180;

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    let subscriptionCleanup: (() => void) | undefined;
    let isMounted = true;

    if (hasPermission) {
      startLocationTracking().then(cleanup => {
        if (isMounted && cleanup) {
          subscriptionCleanup = cleanup;
        } else if (cleanup) {
          // Component unmounted before we got the cleanup function, call it now
          cleanup();
        }
      });
    }

    return () => {
      isMounted = false;
      if (subscriptionCleanup) {
        subscriptionCleanup();
      }
    };
  }, [hasPermission]);

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const startLocationTracking = async () => {
    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          setCurrentLocation(location);
          const dist = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            targetLatNum,
            targetLngNum
          );
          setDistance(dist);
        }
      );

      return () => subscription.remove();
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg: number): number => deg * (Math.PI / 180);

  const checkLocation = async () => {
    setChecking(true);
    
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const dist = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        targetLatNum,
        targetLngNum
      );
      
      setDistance(dist);
      
      if (dist <= radiusNum) {
        setVerified(true);
        Alert.alert(
          '✅ Location Verified!',
          `You're at the right spot! (${Math.round(dist)}m from target)`,
          [{ text: 'Continue', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Not Quite There',
          `You're ${Math.round(dist)}m away. Get within ${radiusNum}m of the target location.`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const openInMaps = () => {
    const url = Platform.select({
      ios: `maps:?daddr=${targetLatNum},${targetLngNum}`,
      android: `google.navigation:q=${targetLatNum},${targetLngNum}`,
    });
    
    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${targetLatNum},${targetLngNum}`);
      });
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="location-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Location Permission</Text>
        <Text style={styles.permissionText}>
          We need location access to verify GPS challenges
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  if (!hasValidTarget) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="warning-outline" size={64} color={Colors.error} />
        <Text style={styles.permissionTitle}>Invalid Location</Text>
        <Text style={styles.permissionText}>
          This challenge has invalid GPS coordinates
        </Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const isClose = distance !== null && distance <= radiusNum;
  const progressPercentage = distance !== null 
    ? Math.max(0, Math.min(100, ((radiusNum * 3 - distance) / (radiusNum * 3)) * 100))
    : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'GPS Challenge' }} />

      <View style={styles.container}>
        <Card style={styles.infoCard}>
          <View style={styles.header}>
            <Ionicons 
              name={isClose ? 'location' : 'location-outline'} 
              size={48} 
              color={isClose ? Colors.success : Colors.primary} 
            />
            <Text style={styles.title}>
              {verified ? 'Location Verified! ✓' : 'Find the Location'}
            </Text>
          </View>

          {/* Distance Display */}
          <View style={styles.distanceContainer}>
            {distance !== null ? (
              <>
                <Text style={[
                  styles.distanceText,
                  isClose && styles.distanceClose
                ]}>
                  {distance < 1000 
                    ? `${Math.round(distance)}m` 
                    : `${(distance / 1000).toFixed(1)}km`}
                </Text>
                <Text style={styles.distanceLabel}>
                  {isClose ? 'You\'re here!' : `away (need ${radiusNum}m)`}
                </Text>
              </>
            ) : (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progressPercentage}%` },
                  isClose && styles.progressFillSuccess
                ]} 
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Far</Text>
              <Text style={styles.progressLabel}>Target</Text>
            </View>
          </View>

          {/* Coordinates */}
          <View style={styles.coordsContainer}>
            <Text style={styles.coordsLabel}>Target Location:</Text>
            <Text style={styles.coordsText}>
              {targetLatNum.toFixed(6)}, {targetLngNum.toFixed(6)}
            </Text>
            {currentLocation && (
              <>
                <Text style={[styles.coordsLabel, { marginTop: Spacing.sm }]}>
                  Your Location:
                </Text>
                <Text style={styles.coordsText}>
                  {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
                </Text>
              </>
            )}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Open in Maps"
            variant="outline"
            onPress={openInMaps}
            icon={<Ionicons name="navigate-outline" size={20} color={Colors.primary} />}
            style={styles.actionButton}
          />
          <Button
            title={checking ? 'Checking...' : 'Verify Location'}
            onPress={checkLocation}
            loading={checking}
            disabled={checking || verified}
            icon={<Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
            style={styles.actionButton}
          />
        </View>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <Text style={styles.tipText}>• Make sure GPS is enabled on your device</Text>
          <Text style={styles.tipText}>• Stand still for more accurate readings</Text>
          <Text style={styles.tipText}>• Being outdoors improves GPS accuracy</Text>
        </Card>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  distanceContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  distanceText: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
  },
  distanceClose: {
    color: Colors.success,
  },
  distanceLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressFillSuccess: {
    backgroundColor: Colors.success,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  progressLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  coordsContainer: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: 12,
  },
  coordsLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  coordsText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  tipsCard: {
    backgroundColor: Colors.surface,
  },
  tipsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
});
