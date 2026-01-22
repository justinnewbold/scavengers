import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useDiscoveryStore } from '@/store/discoveryStore';
import type { DiscoverableHunt, NearbyCluster } from '@/types/discovery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Try to import react-native-maps, but provide fallback
let MapView: React.ComponentType<any> | null = null;
let Marker: React.ComponentType<any> | null = null;
let Callout: React.ComponentType<any> | null = null;
let Circle: React.ComponentType<any> | null = null;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
  Circle = Maps.Circle;
} catch (e) {
  // react-native-maps not available
}

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface DiscoveryMapProps {
  initialRegion?: Region;
  showUserLocation?: boolean;
  onHuntSelect?: (hunt: DiscoverableHunt) => void;
}

export function DiscoveryMap({
  initialRegion,
  showUserLocation = true,
  onHuntSelect,
}: DiscoveryMapProps) {
  const router = useRouter();
  const mapRef = useRef<any>(null);

  const [selectedHunt, setSelectedHunt] = useState<DiscoverableHunt | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const {
    nearbyHunts,
    clusters,
    userLocation,
    fetchNearbyHunts,
    fetchClusters,
    updateLocation,
  } = useDiscoveryStore();

  useEffect(() => {
    if (!userLocation) {
      updateLocation();
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyHunts(50);
    }
  }, [userLocation]);

  const handleRegionChange = useCallback((region: Region) => {
    fetchClusters({
      north: region.latitude + region.latitudeDelta / 2,
      south: region.latitude - region.latitudeDelta / 2,
      east: region.longitude + region.longitudeDelta / 2,
      west: region.longitude - region.longitudeDelta / 2,
    });
  }, [fetchClusters]);

  const handleMarkerPress = (hunt: DiscoverableHunt) => {
    setSelectedHunt(hunt);

    const location = hunt.startLocation || { latitude: hunt.latitude, longitude: hunt.longitude };
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 300);
    }
  };

  const handleHuntPress = (hunt: DiscoverableHunt) => {
    if (onHuntSelect) {
      onHuntSelect(hunt);
    } else {
      router.push(`/discover/${hunt.id}`);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 300);
    }
  };

  const getDefaultRegion = (): Region => {
    if (initialRegion) return initialRegion;
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return Colors.success;
      case 'medium': return Colors.warning;
      case 'hard': return Colors.error;
      default: return Colors.primary;
    }
  };

  const renderHuntCard = () => {
    if (!selectedHunt) return null;

    return (
      <Animated.View style={styles.cardContainer}>
        <Card style={styles.huntCard}>
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => handleHuntPress(selectedHunt)}
            activeOpacity={0.9}
          >
            {selectedHunt.coverImageUrl ? (
              <Image
                source={{ uri: selectedHunt.coverImageUrl }}
                style={styles.cardImage}
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="map" size={32} color={Colors.textTertiary} />
              </View>
            )}

            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selectedHunt.title}
              </Text>

              <View style={styles.cardMeta}>
                <View style={styles.cardMetaItem}>
                  <Ionicons name="star" size={14} color={Colors.warning} />
                  <Text style={styles.cardMetaText}>
                    {selectedHunt.averageRating.toFixed(1)} ({selectedHunt.reviewCount})
                  </Text>
                </View>

                {selectedHunt.distance !== undefined && (
                  <View style={styles.cardMetaItem}>
                    <Ionicons name="navigate" size={14} color={Colors.primary} />
                    <Text style={styles.cardMetaText}>
                      {selectedHunt.distance < 1
                        ? `${Math.round(selectedHunt.distance * 1000)}m`
                        : `${selectedHunt.distance.toFixed(1)}km`}
                    </Text>
                  </View>
                )}

                <View style={styles.cardMetaItem}>
                  <Ionicons name="time" size={14} color={Colors.textSecondary} />
                  <Text style={styles.cardMetaText}>
                    {selectedHunt.estimatedDuration}min
                  </Text>
                </View>
              </View>

              <View style={styles.cardTags}>
                <View style={[styles.cardTag, { backgroundColor: getDifficultyColor(selectedHunt.difficulty) + '20' }]}>
                  <Text style={[styles.cardTagText, { color: getDifficultyColor(selectedHunt.difficulty) }]}>
                    {selectedHunt.difficulty}
                  </Text>
                </View>
                {selectedHunt.tags.slice(0, 2).map(tag => (
                  <View key={tag} style={styles.cardTag}>
                    <Text style={styles.cardTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.cardClose}
              onPress={() => setSelectedHunt(null)}
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Card>
      </Animated.View>
    );
  };

  // Fallback when react-native-maps is not available
  if (!MapView) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Ionicons name="map-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.fallbackTitle}>Map View</Text>
          <Text style={styles.fallbackText}>
            Map feature requires react-native-maps.
            {'\n'}Install it to enable map-based discovery.
          </Text>

          {/* Show list of nearby hunts instead */}
          {nearbyHunts.length > 0 && (
            <View style={styles.fallbackList}>
              <Text style={styles.fallbackListTitle}>Nearby Hunts</Text>
              {nearbyHunts.slice(0, 5).map(hunt => (
                <TouchableOpacity
                  key={hunt.id}
                  style={styles.fallbackItem}
                  onPress={() => handleHuntPress(hunt)}
                >
                  <View style={styles.fallbackItemIcon}>
                    <Ionicons name="location" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.fallbackItemInfo}>
                    <Text style={styles.fallbackItemTitle}>{hunt.title}</Text>
                    <Text style={styles.fallbackItemMeta}>
                      {hunt.distance ? `${hunt.distance.toFixed(1)}km away` : hunt.city}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getDefaultRegion()}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={handleRegionChange}
      >
        {/* Render cluster markers */}
        {Marker && clusters.map((cluster: NearbyCluster) => (
          <Marker
            key={cluster.id}
            coordinate={cluster.center || { latitude: cluster.latitude, longitude: cluster.longitude }}
            onPress={() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: cluster.center?.latitude || cluster.latitude,
                  longitude: cluster.center?.longitude || cluster.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }, 300);
              }
            }}
          >
            <View style={styles.clusterMarker}>
              <Text style={styles.clusterCount}>{cluster.count || cluster.huntCount}</Text>
            </View>
          </Marker>
        ))}

        {/* Render individual hunt markers */}
        {Marker && nearbyHunts.map((hunt: DiscoverableHunt) => {
          const location = hunt.startLocation || { latitude: hunt.latitude, longitude: hunt.longitude };
          if (!location) return null;

          const isSelected = selectedHunt?.id === hunt.id;
          const difficultyColor = getDifficultyColor(hunt.difficulty);

          return (
            <Marker
              key={hunt.id}
              coordinate={location}
              onPress={() => handleMarkerPress(hunt)}
            >
              <View style={[styles.marker, isSelected && styles.markerSelected]}>
                <View style={[styles.markerInner, { backgroundColor: difficultyColor }]}>
                  <Ionicons name="location" size={16} color="#fff" />
                </View>
              </View>

              {Callout && (
                <Callout tooltip onPress={() => handleHuntPress(hunt)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {hunt.title}
                    </Text>
                    <View style={styles.calloutMeta}>
                      <View style={styles.calloutRating}>
                        <Ionicons name="star" size={12} color={Colors.warning} />
                        <Text style={styles.calloutRatingText}>
                          {hunt.averageRating.toFixed(1)}
                        </Text>
                      </View>
                      <Text style={styles.calloutDifficulty}>{hunt.difficulty}</Text>
                    </View>
                    <Text style={styles.calloutCta}>Tap to view →</Text>
                  </View>
                </Callout>
              )}
            </Marker>
          );
        })}

        {/* User location radius */}
        {Circle && userLocation && (
          <Circle
            center={userLocation}
            radius={500}
            strokeColor={Colors.primary + '40'}
            fillColor={Colors.primary + '10'}
          />
        )}
      </MapView>

      {/* Center on user button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={24} color={Colors.primary} />
      </TouchableOpacity>

      {/* Selected hunt card */}
      {renderHuntCard()}

      {/* Loading overlay */}
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <Ionicons name="map" size={48} color={Colors.textTertiary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  fallbackTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  fallbackText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  fallbackList: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  fallbackListTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  fallbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  fallbackItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  fallbackItemInfo: {
    flex: 1,
  },
  fallbackItemTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  fallbackItemMeta: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  marker: {
    padding: 4,
  },
  markerSelected: {
    transform: [{ scale: 1.2 }],
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  clusterCount: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: Spacing.sm,
    minWidth: 150,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  calloutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  calloutRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  calloutRatingText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  calloutDifficulty: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  calloutCta: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  centerButton: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
  },
  huntCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: Spacing.sm,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardMetaText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  cardTags: {
    flexDirection: 'row',
    gap: 4,
  },
  cardTag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTagText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  cardClose: {
    padding: Spacing.xs,
  },
});

export default DiscoveryMap;
