import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CameraView, useCameraPermissions, type CameraCapturedPicture, type CameraType, type CameraMountError } from 'expo-camera';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';

import { Accent, BorderRadius, Spacing, TextColor } from '@/constants/theme';

const isSimulator = !Device.isDevice;

export type SimulatorCameraProps = {
  style?: StyleProp<ViewStyle>;
  facing?: CameraType;
  mirror?: boolean;
  onCapture?: (photo: CameraCapturedPicture) => void;
};

export function SimulatorCamera({ style, facing = 'front', mirror = true, onCapture }: SimulatorCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [mountError, setMountError] = useState('');

  const capture = async () => {
    if (!cameraRef.current || !ready || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo) return;
      if (photo) onCapture?.(photo);
    } catch (error) {
      setMountError(error instanceof Error ? error.message : 'Failed to capture photo');
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.center, style]}>
        <ActivityIndicator color={Accent.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, style]}>
        <Ionicons name="camera-outline" size={40} color={TextColor.secondary} />
        <Text style={styles.permissionText}>Camera access is needed for this screen.</Text>
        {permission.canAskAgain ? (
          <Pressable onPress={requestPermission} style={({ pressed }) => [styles.allowButton, pressed && styles.pressed]}>
            <Text style={styles.allowButtonText}>Allow Camera Access</Text>
          </Pressable>
        ) : (
          <Text style={styles.permissionHint}>Enable camera access in Settings to continue.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mirror={isSimulator ? true : mirror}
        onCameraReady={() => setReady(true)}
        onMountError={(event: CameraMountError) => setMountError(event.message)}
      />
      {isSimulator ? (
        <View style={styles.simulatorBadge}>
          <Ionicons name="laptop-outline" size={14} color="#FFFFFF" />
          <Text style={styles.simulatorBadgeText}>Mac Camera</Text>
        </View>
      ) : null}
      {mountError ? (
        <View style={styles.errorOverlay}>
          <Ionicons name="alert-circle" size={18} color={TextColor.error} />
          <Text style={styles.errorText}>{mountError}</Text>
        </View>
      ) : null}
      <View style={styles.controls}>
        <Pressable
          onPress={capture}
          disabled={!ready || capturing}
          style={({ pressed }) => [styles.shutter, (pressed || !ready || capturing) && styles.shutterInactive]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    backgroundColor: '#0A0E21',
    padding: Spacing.four,
  },
  permissionText: {
    color: TextColor.primary,
    fontSize: 16,
    textAlign: 'center',
  },
  permissionHint: {
    color: TextColor.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  allowButton: {
    backgroundColor: Accent.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  simulatorBadge: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
  },
  simulatorBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  errorOverlay: {
    position: 'absolute',
    top: Spacing.five,
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: Spacing.five,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#0A0E21',
  },
  shutterInactive: {
    opacity: 0.4,
  },
});
