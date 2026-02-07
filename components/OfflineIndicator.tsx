import React, { useState, useEffect, useCallback } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offlineStorage } from '@/lib/offlineStorage';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

interface OfflineIndicatorProps {
  /** Show even when online with pending submissions */
  showPending?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (result: { synced: number; failed: number }) => void;
}

export function OfflineIndicator({ showPending = true, onSyncComplete }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const slideAnim = useState(new Animated.Value(-60))[0];

  const refreshPendingCount = useCallback(async () => {
    const submissions = await offlineStorage.getPendingSubmissions();
    setPendingCount(submissions.length);
  }, []);

  const handleSync = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await offlineStorage.syncPendingSubmissions();
      setLastSyncResult(result);
      await refreshPendingCount();
      onSyncComplete?.(result);

      // Clear result message after 3 seconds
      setTimeout(() => setLastSyncResult(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, refreshPendingCount, onSyncComplete]);

  useEffect(() => {
    // Check initial state
    offlineStorage.checkConnection().then(setIsOnline);
    refreshPendingCount();

    // Subscribe to connectivity changes
    const unsubscribe = offlineStorage.onConnectivityChange(online => {
      setIsOnline(online);
      if (online) {
        // Auto-sync when coming back online
        handleSync();
      }
    });

    // Refresh pending count periodically
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshPendingCount, handleSync]);

  // Determine if we should show the indicator
  const shouldShow = !isOnline || (showPending && pendingCount > 0) || lastSyncResult !== null;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  if (!shouldShow) {
    return null;
  }

  // Determine status and styling
  const getStatus = () => {
    if (!isOnline) {
      return {
        icon: 'cloud-offline' as const,
        text: `Offline${pendingCount > 0 ? ` • ${pendingCount} queued` : ''}`,
        style: styles.offline,
      };
    }
    if (isSyncing) {
      return {
        icon: 'sync' as const,
        text: `Syncing ${pendingCount}...`,
        style: styles.syncing,
      };
    }
    if (lastSyncResult) {
      if (lastSyncResult.failed > 0) {
        return {
          icon: 'warning' as const,
          text: `Synced ${lastSyncResult.synced}, ${lastSyncResult.failed} failed`,
          style: styles.warning,
        };
      }
      return {
        icon: 'checkmark-circle' as const,
        text: `${lastSyncResult.synced} synced`,
        style: styles.success,
      };
    }
    if (pendingCount > 0) {
      return {
        icon: 'cloud-upload' as const,
        text: `${pendingCount} pending`,
        style: styles.pending,
        showSyncButton: true,
      };
    }
    return null;
  };

  const status = getStatus();
  if (!status) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
        status.style,
      ]}
      accessibilityRole="alert"
      accessibilityLabel={status.text}
      accessibilityLiveRegion="polite"
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name={status.icon} size={16} color="#fff" />
      )}
      <Text style={styles.text}>{status.text}</Text>
      {'showSyncButton' in status && status.showSyncButton && isOnline && (
        <TouchableOpacity
          onPress={handleSync}
          style={styles.syncButton}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel="Sync now"
          accessibilityHint="Syncs pending submissions to the server"
          accessibilityState={{ disabled: isSyncing }}
        >
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      )}
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
    backgroundColor: Colors.primary,
  },
  pending: {
    backgroundColor: Colors.warning,
  },
  warning: {
    backgroundColor: '#f59e0b',
  },
  success: {
    backgroundColor: Colors.success,
  },
  text: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  syncButton: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  syncButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#fff',
  },
});
