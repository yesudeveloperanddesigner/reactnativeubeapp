import { Stack } from 'expo-router';
import { Surface, TextColor } from '@/constants/theme';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Surface.base },
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: Surface.card },
        headerTintColor: TextColor.primary,
      }}
    />
  );
}
