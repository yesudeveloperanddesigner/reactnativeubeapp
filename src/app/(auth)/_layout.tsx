import { Stack } from 'expo-router';
import { Surface } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Surface.base },
        animation: 'fade',
      }}
    />
  );
}
