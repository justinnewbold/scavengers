import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { calculateDistance, calculateBearing } from '@/lib/geo';
import { triggerHaptic } from '@/hooks/useHaptics';

interface ARObject {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  points: number;
  collected: boolean;
}

interface ARChallengeProps {
  objects: ARObject[];
  onCollect: (objectId: string) => void;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');
const COLLECTION_RADIUS = 20; // meters

export function ARChallenge({ objects, onCollect, onClose }: ARChallengeProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyObjects, setNearbyObjects] = useState<(ARObject & { distance: number; angle: number })[]>([]);
  const [collecting, setCollecting] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && locationStatus === 'granted');

      if (locationStatus === 'granted') {
        const subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 1 },
          (location) => {
            setUserLocation({
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            });
          }
        );

        return () => subscription.remove();
      }
    })();
  }, []);

  useEffect(() => {
    // Pulse animation for nearby objects
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!userLocation) return;

    const nearby = objects
      .filter(obj => !obj.collected)
      .map(obj => {
        const distance = calculateDistance(userLocation, { lat: obj.lat, lng: obj.lng });
        const angle = calculateBearing(userLocation, { lat: obj.lat, lng: obj.lng });
        return { ...obj, distance, angle };
      })
      .filter(obj => obj.distance < 100) // Only show objects within 100m
      .sort((a, b) => a.distance - b.distance);

    setNearbyObjects(nearby);
  }, [userLocation, objects]);

  const handleCollect = async (obj: ARObject & { distance: number }) => {
    if (obj.distance > COLLECTION_RADIUS) {
      triggerHaptic('warning');
      return; // Too far to collect
    }

    triggerHaptic('success');
    setCollecting(obj.id);

    // Animate collection
    setTimeout(() => {
      onCollect(obj.id);
      setCollecting(null);
    }, 1000);
  };

  const getObjectPosition = (angle: number, distance: number) => {
    // Map angle to screen position (simplified - real AR would use device orientation)
    const normalizedAngle = (angle + 360) % 360;
    const x = (normalizedAngle / 360) * width;
    const y = height * 0.3 + (distance / 100) * (height * 0.4);

    return { x: Math.max(50, Math.min(width - 50, x)), y };
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera and location access required for AR mode</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back">
        {/* AR Overlay */}
        <View style={styles.overlay}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Ionicons name="close-circle" size={40} color={Colors.text} />
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Point your camera around to find virtual objects!
            </Text>
            <Text style={styles.instructionSubtext}>
              Get within {COLLECTION_RADIUS}m and tap to collect
            </Text>
          </View>

          {/* AR Objects */}
          {nearbyObjects.map(obj => {
            const pos = getObjectPosition(obj.angle, obj.distance);
            const canCollect = obj.distance <= COLLECTION_RADIUS;
            const isCollecting = collecting === obj.id;

            return (
              <Animated.View
                key={obj.id}
                style={[
                  styles.arObject,
                  {
                    left: pos.x - 40,
                    top: pos.y - 40,
                    transform: [{ scale: canCollect ? pulseAnim : 1 }],
                    opacity: isCollecting ? 0.5 : 1,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.arObjectInner,
                    canCollect && styles.arObjectCollectable,
                    isCollecting && styles.arObjectCollecting,
                  ]}
                  onPress={() => handleCollect(obj)}
                  disabled={!canCollect || isCollecting}
                >
                  <Text style={styles.arIcon}>{obj.icon}</Text>
                  <Text style={styles.arName}>{obj.name}</Text>
                  <Text style={styles.arDistance}>
                    {obj.distance < 10 ? `${Math.round(obj.distance)}m` : `${Math.round(obj.distance)}m`}
                  </Text>
                  {canCollect && !isCollecting && (
                    <Text style={styles.tapToCollect}>TAP!</Text>
                  )}
                  {isCollecting && (
                    <Text style={styles.collecting}>Collecting...</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* No objects nearby message */}
          {nearbyObjects.length === 0 && (
            <View style={styles.noObjects}>
              <Ionicons name="search" size={40} color={Colors.textSecondary} />
              <Text style={styles.noObjectsText}>No objects nearby</Text>
              <Text style={styles.noObjectsSubtext}>Keep exploring the area!</Text>
            </View>
          )}

          {/* Stats bar */}
          <View style={styles.statsBar}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Nearby</Text>
              <Text style={styles.statValue}>{nearbyObjects.length}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Collected</Text>
              <Text style={styles.statValue}>{objects.filter(o => o.collected).length}/{objects.length}</Text>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  closeIcon: {
    position: 'absolute',
    top: 50,
    right: Spacing.md,
    zIndex: 100,
  },
  instructions: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Spacing.md,
    borderRadius: 12,
  },
  instructionText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionSubtext: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  arObject: {
    position: 'absolute',
    width: 80,
    height: 80,
  },
  arObjectInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.textSecondary,
  },
  arObjectCollectable: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  arObjectCollecting: {
    borderColor: Colors.warning,
    backgroundColor: 'rgba(234, 179, 8, 0.3)',
  },
  arIcon: {
    fontSize: 24,
  },
  arName: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  arDistance: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  tapToCollect: {
    color: Colors.success,
    fontSize: FontSizes.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  collecting: {
    color: Colors.warning,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  noObjects: {
    position: 'absolute',
    top: '50%',
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Spacing.xl,
    borderRadius: 16,
    transform: [{ translateY: -50 }],
  },
  noObjectsText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  noObjectsSubtext: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  statsBar: {
    position: 'absolute',
    bottom: 50,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: Spacing.md,
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  statValue: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  message: {
    color: Colors.text,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: 100,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.lg,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
});

export default ARChallenge;
