import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { LeaderboardEntry } from '@/types/events';

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[] | undefined;
  compact: boolean;
}

export function LeaderboardPodium({ entries, compact }: LeaderboardPodiumProps) {
  if (!entries || entries.length < 3 || compact) return null;

  const top3 = entries.slice(0, 3);
  const [first, second, third] = top3;

  return (
    <View style={styles.podium}>
      {/* Second place */}
      <View style={styles.podiumSpot}>
        <View style={[styles.podiumAvatarContainer, styles.silverBorder]}>
          {second?.avatarUrl ? (
            <Image source={{ uri: second.avatarUrl }} style={styles.podiumAvatar} />
          ) : (
            <View style={[styles.podiumAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color={Colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={[styles.podiumPillar, styles.silverPillar]}>
          <Text style={styles.podiumRank}>2</Text>
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>{second?.displayName}</Text>
        <Text style={styles.podiumScore}>{second?.value.toLocaleString()}</Text>
      </View>

      {/* First place */}
      <View style={styles.podiumSpot}>
        <Ionicons name="trophy" size={24} color="#FFD700" style={styles.crownIcon} />
        <View style={[styles.podiumAvatarContainer, styles.goldBorder]}>
          {first?.avatarUrl ? (
            <Image source={{ uri: first.avatarUrl }} style={styles.podiumAvatarLarge} />
          ) : (
            <View style={[styles.podiumAvatarLarge, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={32} color={Colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={[styles.podiumPillar, styles.goldPillar]}>
          <Text style={styles.podiumRank}>1</Text>
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>{first?.displayName}</Text>
        <Text style={styles.podiumScore}>{first?.value.toLocaleString()}</Text>
      </View>

      {/* Third place */}
      <View style={styles.podiumSpot}>
        <View style={[styles.podiumAvatarContainer, styles.bronzeBorder]}>
          {third?.avatarUrl ? (
            <Image source={{ uri: third.avatarUrl }} style={styles.podiumAvatar} />
          ) : (
            <View style={[styles.podiumAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color={Colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={[styles.podiumPillar, styles.bronzePillar]}>
          <Text style={styles.podiumRank}>3</Text>
        </View>
        <Text style={styles.podiumName} numberOfLines={1}>{third?.displayName}</Text>
        <Text style={styles.podiumScore}>{third?.value.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  podiumSpot: {
    alignItems: 'center',
    width: 100,
  },
  crownIcon: {
    marginBottom: 4,
  },
  podiumAvatarContainer: {
    borderRadius: 30,
    borderWidth: 3,
    marginBottom: 8,
  },
  goldBorder: {
    borderColor: '#FFD700',
  },
  silverBorder: {
    borderColor: '#C0C0C0',
  },
  bronzeBorder: {
    borderColor: '#CD7F32',
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  podiumAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumPillar: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 4,
  },
  goldPillar: {
    height: 80,
    backgroundColor: '#FFD700',
  },
  silverPillar: {
    height: 60,
    backgroundColor: '#C0C0C0',
  },
  bronzePillar: {
    height: 40,
    backgroundColor: '#CD7F32',
  },
  podiumRank: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#fff',
  },
  podiumName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: 90,
  },
  podiumScore: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
