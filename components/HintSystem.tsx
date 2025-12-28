import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useAuthStore } from '@/store';

interface HintSystemProps {
  huntId: string;
  challengeIndex: number;
  userLocation?: { lat: number; lng: number };
  onHintReceived?: (hint: string, cost: number) => void;
}

const HINT_LEVELS = [
  { level: 1, label: 'Subtle', cost: 5, icon: 'bulb-outline', description: 'A gentle nudge in the right direction' },
  { level: 2, label: 'Moderate', cost: 15, icon: 'bulb', description: 'More specific guidance' },
  { level: 3, label: 'Direct', cost: 30, icon: 'flash', description: 'Nearly reveals the answer' },
];

export function HintSystem({ huntId, challengeIndex, userLocation, onHintReceived }: HintSystemProps) {
  const { session } = useAuthStore();
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [usedLevels, setUsedLevels] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    Animated.spring(animation, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
    setExpanded(!expanded);
  };

  const requestHint = async (level: 1 | 2 | 3) => {
    if (!session?.access_token) {
      Alert.alert('Sign In Required', 'Please sign in to use hints.');
      return;
    }

    if (usedLevels.includes(level)) {
      Alert.alert('Hint Used', 'You have already used this hint level for this challenge.');
      return;
    }

    const hintInfo = HINT_LEVELS.find(h => h.level === level)!;

    Alert.alert(
      `Use ${hintInfo.label} Hint?`,
      `This will cost you ${hintInfo.cost} points from your final score.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Use Hint (-${hintInfo.cost} pts)`,
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/hints`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  hunt_id: huntId,
                  challenge_index: challengeIndex,
                  hint_level: level,
                  user_location: userLocation,
                }),
              });

              if (response.ok) {
                const data = await response.json();
                setCurrentHint(data.hint);
                setUsedLevels([...usedLevels, level]);
                onHintReceived?.(data.hint, data.point_cost);
              } else {
                Alert.alert('Error', 'Failed to get hint. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please check your connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const containerHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 280],
  });

  return (
    <Animated.View style={[styles.container, { height: containerHeight }]}>
      <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <Ionicons name="help-circle" size={22} color={Colors.warning} />
          <Text style={styles.headerText}>Need a hint?</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Choose a hint level. More detailed hints cost more points.
          </Text>

          <View style={styles.hintButtons}>
            {HINT_LEVELS.map((hint) => {
              const isUsed = usedLevels.includes(hint.level);
              const isDisabled = isUsed || loading;

              return (
                <TouchableOpacity
                  key={hint.level}
                  style={[
                    styles.hintButton,
                    isUsed && styles.hintButtonUsed,
                    isDisabled && styles.hintButtonDisabled,
                  ]}
                  onPress={() => requestHint(hint.level as 1 | 2 | 3)}
                  disabled={isDisabled}
                >
                  <Ionicons
                    name={hint.icon as any}
                    size={24}
                    color={isUsed ? Colors.textTertiary : Colors.warning}
                  />
                  <Text style={[styles.hintLabel, isUsed && styles.hintLabelUsed]}>
                    {hint.label}
                  </Text>
                  <Text style={[styles.hintCost, isUsed && styles.hintCostUsed]}>
                    {isUsed ? 'Used' : `-${hint.cost} pts`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {currentHint && (
            <View style={styles.hintDisplay}>
              <View style={styles.hintHeader}>
                <Ionicons name="bulb" size={18} color={Colors.warning} />
                <Text style={styles.hintTitle}>Your Hint</Text>
              </View>
              <Text style={styles.hintText}>{currentHint}</Text>
            </View>
          )}

          {usedLevels.length > 0 && (
            <Text style={styles.totalCost}>
              Total hint cost: -{usedLevels.reduce((sum, l) => sum + (HINT_LEVELS.find(h => h.level === l)?.cost || 0), 0)} pts
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    height: 48,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  hintButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  hintButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  hintButtonUsed: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
  },
  hintButtonDisabled: {
    opacity: 0.6,
  },
  hintLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  hintLabelUsed: {
    color: Colors.textTertiary,
  },
  hintCost: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    marginTop: 2,
  },
  hintCostUsed: {
    color: Colors.textTertiary,
  },
  hintDisplay: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  hintTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.warning,
  },
  hintText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  totalCost: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: '500',
  },
});

export default HintSystem;
