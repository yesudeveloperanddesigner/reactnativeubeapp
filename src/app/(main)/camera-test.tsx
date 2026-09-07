import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { CameraCapturedPicture } from 'expo-camera';

import { SimulatorCamera } from '@/components/simulator-camera';
import { BorderRadius, FontSize, Spacing, Surface, TextColor } from '@/constants/theme';

export default function CameraTestScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={TextColor.primary} />
          </Pressable>
          <Text style={styles.title}>Camera Test</Text>
          {photo ? (
            <Pressable onPress={() => setPhoto(null)} style={styles.clearButton}>
              <Ionicons name="close" size={18} color={TextColor.secondary} />
            </Pressable>
          ) : (
            <View style={styles.clearButton} />
          )}
        </View>

        {photo ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" />
            <Text style={styles.previewMeta} numberOfLines={1}>
              {photo.uri}
            </Text>
          </View>
        ) : (
          <SimulatorCamera style={styles.camera} onCapture={setPhoto} />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  title: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: TextColor.primary,
  },
  camera: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  previewWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  preview: {
    width: '100%',
    flex: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#000000',
  },
  previewMeta: {
    color: TextColor.secondary,
    fontSize: FontSize.small,
  },
});
