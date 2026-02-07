import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

interface CountdownTimerProps {
  endDate: string;
}

export function CountdownTimer({ endDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <View style={styles.timeUnit}>
      <Text style={styles.timeValue}>{value.toString().padStart(2, '0')}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.countdown}>
      <TimeUnit value={timeLeft.days} label="DAYS" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.hours} label="HRS" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.minutes} label="MIN" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.seconds} label="SEC" />
    </View>
  );
}

const styles = StyleSheet.create({
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    marginVertical: Spacing.xs,
  },
  timeUnit: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginHorizontal: 2,
  },
});
