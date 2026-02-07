import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_KEY = 'onboarding_complete';

interface OnboardingPage {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor: string;
}

const pages: OnboardingPage[] = [
  {
    icon: 'sparkles',
    title: 'AI-Powered Hunts',
    description:
      'Generate complete scavenger hunts in seconds with AI. Just pick a theme and go.',
    accentColor: Colors.primary,
  },
  {
    icon: 'camera',
    title: 'Verify with Your Phone',
    description:
      'Snap photos, scan QR codes, or walk to GPS locations. Your phone does the checking.',
    accentColor: Colors.secondary,
  },
  {
    icon: 'cloud-offline',
    title: 'Play Anywhere, Anytime',
    description:
      'Works offline. Play solo or with up to 15 friends. No internet needed.',
    accentColor: Colors.success,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Animated values for each page icon
  const iconScales = useRef(pages.map(() => new Animated.Value(0))).current;
  const iconOpacities = useRef(pages.map(() => new Animated.Value(0))).current;

  // Fade in + spring bounce for the active page icon
  const animateIcon = useCallback(
    (pageIndex: number) => {
      // Reset all icons
      iconScales.forEach((scale, i) => {
        if (i !== pageIndex) {
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }).start();
          Animated.timing(iconOpacities[i], {
            toValue: 0.3,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      });

      // Animate active icon with spring
      Animated.sequence([
        Animated.timing(iconScales[pageIndex], {
          toValue: 0.6,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(iconScales[pageIndex], {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(iconOpacities[pageIndex], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    },
    [iconScales, iconOpacities]
  );

  // Animate the first page on mount
  useEffect(() => {
    animateIcon(0);
  }, [animateIcon]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / SCREEN_WIDTH);
      if (page !== currentPage && page >= 0 && page < pages.length) {
        setCurrentPage(page);
        animateIcon(page);
      }
    },
    [currentPage, animateIcon]
  );

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Silently handle storage errors - user can still proceed
    }
    router.replace('/(tabs)');
  }, [router]);

  const isLastPage = currentPage === pages.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button - visible on pages 1 and 2 */}
      {!isLastPage && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + Spacing.sm }]}
          onPress={completeOnboarding}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Scrollable pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
        style={styles.scrollView}
      >
        {pages.map((page, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.pageContent}>
              {/* Animated icon container */}
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: `${page.accentColor}15`,
                    borderColor: `${page.accentColor}30`,
                    transform: [{ scale: iconScales[index] }],
                    opacity: iconOpacities[index],
                  },
                ]}
              >
                <Ionicons
                  name={page.icon}
                  size={60}
                  color={page.accentColor}
                />
              </Animated.View>

              {/* Title */}
              <Text style={styles.title}>{page.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{page.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section: dots + button */}
      <View style={styles.bottomSection}>
        {/* Page dots */}
        <View style={styles.dotsContainer}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentPage === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Get Started / Next area */}
        {isLastPage ? (
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={completeOnboarding}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.nextHintContainer}>
            <Text style={styles.nextHintText}>Swipe to continue</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textTertiary}
              style={styles.nextHintIcon}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 10,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: Spacing.xl + Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Spacing.xl : Spacing.lg,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: Colors.surface,
  },
  getStartedButton: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  nextHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  nextHintText: {
    color: Colors.textTertiary,
    fontSize: FontSizes.sm,
  },
  nextHintIcon: {
    marginLeft: Spacing.xs,
  },
});
