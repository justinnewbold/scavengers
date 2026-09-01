import { Linking, Alert } from 'react-native';

/**
 * Opens a URL in the device browser, telling the user when it can't be opened
 * instead of failing silently.
 *
 * `Linking.openURL` rejects when no handler exists, so an unguarded call leaves
 * an unhandled rejection and a link that appears to do nothing - which is the
 * behaviour this replaces.
 */
export async function openExternalLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open link:', url, error);
    Alert.alert(
      'Could Not Open Link',
      `Please visit ${url} in your browser.`
    );
  }
}

export default openExternalLink;
