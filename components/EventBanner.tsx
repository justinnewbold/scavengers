import React from 'react';
import { useRouter } from 'expo-router';
import type { SeasonalEvent } from '@/types/events';
import { EventBannerMini } from './event/EventBannerMini';
import { EventBannerCompact } from './event/EventBannerCompact';
import { EventBannerFull } from './event/EventBannerFull';

interface EventBannerProps {
  event: SeasonalEvent;
  variant?: 'full' | 'compact' | 'mini';
  onPress?: () => void;
}

export function EventBanner({ event, variant = 'full', onPress }: EventBannerProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/events/${event.id}`);
    }
  };

  if (variant === 'mini') {
    return <EventBannerMini event={event} onPress={handlePress} />;
  }

  if (variant === 'compact') {
    return <EventBannerCompact event={event} onPress={handlePress} />;
  }

  return <EventBannerFull event={event} onPress={handlePress} />;
}

export default EventBanner;
