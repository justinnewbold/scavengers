import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offlineStorage } from '@/lib/offlineStorage';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const slideAnim = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    // Check initial state
    offlineStorage.checkConnection().then(setIsOnline);
    offlineStorage.getPendingSubmissions().then(s => setPendingCount(s.length));

    // Subscribe to connectivity changes
    const unsubscribe = offlineStorage.onConnectivityChange(online => {
      setIsOnline(online);
      if (online) {
        // Refresh pending count after sync attempt
        setTimeout(() => {
          offlineStorage.getPendingSubmissions().then(s => setPendingCount(s.length));
        }, 2000);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: !isOnline || pendingCount > 0 ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, pendingCount]);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
        !isOnline ? styles.offline : styles.syncing,
      ]}
    >
      <Ionicons
        name={!isOnline ? 'cloud-offline' : 'cloud-upload'}
        size={16}
        color="#fff"
      />
      <Text style={styles.text}>
        {!isOnline
          ? 'You are offline'
          : `Syncing ${pendingCount} submission${pendingCount > 1 ? 's' : ''}...`}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    zIndex: 1000,
  },
  offline: {
    backgroundColor: Colors.error,
  },
  syncing: {
    backgroundColor: Colors.warning,
  },
  text: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
});
