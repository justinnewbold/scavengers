import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function SoloLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerBackTitleVisible: false,
      }}
    />
  );
}
