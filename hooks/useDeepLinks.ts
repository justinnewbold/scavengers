import { useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Share, Platform } from 'react-native';

const APP_SCHEME = 'scavengers';
const WEB_URL = 'https://scavengers-ten.vercel.app';

export interface DeepLinkData {
  type: 'hunt' | 'team' | 'challenge' | 'profile' | 'invite';
  id: string;
  action?: string;
  referrer?: string;
}

export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    // Handle initial URL (app was opened via deep link)
    const handleInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        handleDeepLink(initialURL);
      }
    };

    handleInitialURL();

    // Listen for incoming deep links while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const parseDeepLink = useCallback((url: string): DeepLinkData | null => {
    try {
      const parsed = Linking.parse(url);
      const { path, queryParams } = parsed;

      if (!path) return null;

      // Parse paths like /hunt/abc123, /team/xyz, /invite/code
      const segments = path.split('/').filter(Boolean);

      if (segments.length === 0) return null;

      const type = segments[0] as DeepLinkData['type'];
      const id = segments[1] || '';

      return {
        type,
        id,
        action: queryParams?.action as string,
        referrer: queryParams?.ref as string,
      };
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return null;
    }
  }, []);

  const handleDeepLink = useCallback((url: string) => {
    const data = parseDeepLink(url);
    if (!data) return;

    switch (data.type) {
      case 'hunt':
        if (data.action === 'join') {
          router.push(`/hunt/${data.id}/join`);
        } else {
          router.push(`/hunt/${data.id}`);
        }
        break;

      case 'team':
        if (data.action === 'join') {
          router.push(`/teams?join=${data.id}`);
        } else {
          router.push(`/teams/${data.id}`);
        }
        break;

      case 'challenge':
        router.push(`/challenge/${data.id}`);
        break;

      case 'profile':
        router.push(`/profile/${data.id}`);
        break;

      case 'invite':
        // Handle invite codes
        router.push(`/invite/${data.id}`);
        break;

      default:
        console.log('Unknown deep link type:', data.type);
    }
  }, [router, parseDeepLink]);

  const createDeepLink = useCallback((data: DeepLinkData): string => {
    const params = new URLSearchParams();
    if (data.action) params.set('action', data.action);
    if (data.referrer) params.set('ref', data.referrer);

    const queryString = params.toString();
    const path = `/${data.type}/${data.id}${queryString ? `?${queryString}` : ''}`;

    // Return web URL for sharing (works everywhere)
    return `${WEB_URL}${path}`;
  }, []);

  const createAppLink = useCallback((data: DeepLinkData): string => {
    const params = new URLSearchParams();
    if (data.action) params.set('action', data.action);
    if (data.referrer) params.set('ref', data.referrer);

    const queryString = params.toString();
    const path = `/${data.type}/${data.id}${queryString ? `?${queryString}` : ''}`;

    return `${APP_SCHEME}:/${path}`;
  }, []);

  const shareHunt = useCallback(async (
    huntId: string,
    huntName: string,
    description?: string
  ): Promise<boolean> => {
    const link = createDeepLink({
      type: 'hunt',
      id: huntId,
      action: 'join',
    });

    try {
      const result = await Share.share({
        title: `Join "${huntName}" on Scavengers!`,
        message: Platform.select({
          ios: `Join me on an adventure! "${huntName}" ${description ? `- ${description} ` : ''}${link}`,
          android: `Join me on an adventure! "${huntName}" ${description ? `- ${description} ` : ''}${link}`,
          default: `Join me on "${huntName}"! ${link}`,
        }),
        url: Platform.OS === 'ios' ? link : undefined,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Failed to share hunt:', error);
      return false;
    }
  }, [createDeepLink]);

  const shareTeamInvite = useCallback(async (
    teamId: string,
    teamName: string
  ): Promise<boolean> => {
    const link = createDeepLink({
      type: 'team',
      id: teamId,
      action: 'join',
    });

    try {
      const result = await Share.share({
        title: `Join team "${teamName}"`,
        message: `Join our team "${teamName}" on Scavengers! ${link}`,
        url: Platform.OS === 'ios' ? link : undefined,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Failed to share team invite:', error);
      return false;
    }
  }, [createDeepLink]);

  const shareAchievement = useCallback(async (
    achievementName: string,
    points: number
  ): Promise<boolean> => {
    const link = createDeepLink({
      type: 'profile',
      id: 'me',
    });

    try {
      const result = await Share.share({
        title: 'Achievement Unlocked!',
        message: `I just unlocked "${achievementName}" and earned ${points} points on Scavengers! Join me: ${link}`,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Failed to share achievement:', error);
      return false;
    }
  }, [createDeepLink]);

  const generateInviteCode = useCallback((): string => {
    // Generate a short, shareable code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }, []);

  const copyLinkToClipboard = useCallback(async (data: DeepLinkData): Promise<boolean> => {
    const link = createDeepLink(data);
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(link);
      return true;
    } catch (error) {
      console.error('Failed to copy link:', error);
      return false;
    }
  }, [createDeepLink]);

  return {
    parseDeepLink,
    handleDeepLink,
    createDeepLink,
    createAppLink,
    shareHunt,
    shareTeamInvite,
    shareAchievement,
    generateInviteCode,
    copyLinkToClipboard,
  };
}
