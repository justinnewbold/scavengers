import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, TouchTargets } from '@/constants/theme';
import { triggerHaptic, type HapticType } from '@/hooks/useHaptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: HapticType | false;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  haptic = 'light',
}: ButtonProps) {
  const handlePress = useCallback(() => {
    if (haptic !== false) {
      triggerHaptic(haptic);
    }
    onPress();
  }, [onPress, haptic]);
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];
  
  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.text} 
          size="small" 
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    minHeight: TouchTargets.minimum, // WCAG AA compliant touch target
  },
  
  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  
  // Sizes
  size_sm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  size_md: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  size_lg: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: Colors.text,
  },
  text_secondary: {
    color: Colors.textInverse,
  },
  text_outline: {
    color: Colors.primary,
  },
  text_ghost: {
    color: Colors.primary,
  },
  text_sm: {
    fontSize: FontSizes.sm,
  },
  text_md: {
    fontSize: FontSizes.md,
  },
  text_lg: {
    fontSize: FontSizes.lg,
  },
  textDisabled: {
    opacity: 0.7,
  },
});
