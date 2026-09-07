import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import * as api from '@/services/api';
import {
  Accent,
  BorderRadius,
  FontSize,
  Spacing,
  Status,
  Surface,
  TextColor,
} from '@/constants/theme';

// ─── KYC Status Config ──────────────────────────────────────────────────────

type KYCConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  label: string;
  description: string;
  actionLabel?: string;
};

const KYC_STATUS_MAP: Record<string, KYCConfig> = {
  none: {
    icon: 'shield-outline',
    color: Status.info,
    bg: Status.infoBg,
    label: 'Not Verified',
    description: 'Complete identity verification to unlock all features.',
    actionLabel: 'Start Verification',
  },
  pending: {
    icon: 'time-outline',
    color: Status.pending,
    bg: Status.pendingBg,
    label: 'Pending',
    description: 'Your verification session has been created. Complete it to proceed.',
    actionLabel: 'Sync Status',
  },
  in_progress: {
    icon: 'hourglass-outline',
    color: Status.pending,
    bg: Status.pendingBg,
    label: 'In Progress',
    description: 'Your documents are being processed.',
    actionLabel: 'Sync Status',
  },
  awaiting_user: {
    icon: 'person-outline',
    color: Status.warning,
    bg: Status.warningBg,
    label: 'Awaiting Your Action',
    description: 'The verification session is waiting for you to complete the steps.',
    actionLabel: 'Continue Verification',
  },
  in_review: {
    icon: 'search-outline',
    color: Status.pending,
    bg: Status.pendingBg,
    label: 'In Review',
    description: 'Your documents are being reviewed by our team.',
    actionLabel: 'Sync Status',
  },
  approved: {
    icon: 'checkmark-circle',
    color: Status.success,
    bg: Status.successBg,
    label: 'Verified',
    description: 'Your identity has been verified successfully.',
  },
  declined: {
    icon: 'close-circle',
    color: Status.error,
    bg: Status.errorBg,
    label: 'Declined',
    description: 'Your verification was not approved. Please try again.',
    actionLabel: 'Try Again',
  },
  resubmit: {
    icon: 'refresh-circle',
    color: Status.warning,
    bg: Status.warningBg,
    label: 'Resubmit Required',
    description: 'Some documents need to be re-submitted.',
    actionLabel: 'Resubmit',
  },
  abandoned: {
    icon: 'exit-outline',
    color: TextColor.tertiary,
    bg: 'rgba(100,116,139,0.1)',
    label: 'Abandoned',
    description: 'Your previous session was abandoned. Start a new verification.',
    actionLabel: 'Start Again',
  },
  expired: {
    icon: 'alarm-outline',
    color: Status.warning,
    bg: Status.warningBg,
    label: 'Expired',
    description: 'Your verification session has expired.',
    actionLabel: 'Start Again',
  },
  kyc_expired: {
    icon: 'calendar-outline',
    color: Status.error,
    bg: Status.errorBg,
    label: 'KYC Expired',
    description: 'Your KYC has expired. Please re-verify your identity.',
    actionLabel: 'Re-verify',
  },
};

const DEFAULT_KYC_CONFIG: KYCConfig = {
  icon: 'help-circle-outline',
  color: TextColor.tertiary,
  bg: 'rgba(100,116,139,0.1)',
  label: 'Unknown',
  description: 'Unable to determine your verification status.',
  actionLabel: 'Sync Status',
};

export default function HomeScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const { totalUnread } = useChat();

  const [kycStatus, setKycStatus] = useState(user?.kyc_status || 'none');
  const [kycVerifiedAt, setKycVerifiedAt] = useState(user?.kyc_verified_at);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [cardScale] = useState(() => new Animated.Value(0.95));

  const handleSyncKYC = async () => {
    setError('');
    setSyncing(true);
    try {
      const res = await api.syncKYCStatus();
      setKycStatus(res.kyc_status);
      setKycVerifiedAt(res.kyc_verified_at);
      if (user) {
        await updateUser({ ...user, kyc_status: res.kyc_status, kyc_verified_at: res.kyc_verified_at });
      }
    } catch (e: any) {
      // If no session exists, silently handle
      if (e.status !== 400) {
        setError(e.message || 'Failed to sync KYC status');
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, cardScale]);

  // Auto-sync KYC on mount for pending users
  useEffect(() => {
    if (
      kycStatus === 'pending' ||
      kycStatus === 'in_progress' ||
      kycStatus === 'in_review'
    ) {
      const timer = setTimeout(() => handleSyncKYC(), 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKYCAction = () => {
    const config = KYC_STATUS_MAP[kycStatus] || DEFAULT_KYC_CONFIG;

    if (kycStatus === 'approved') return;

    if (
      kycStatus === 'pending' ||
      kycStatus === 'in_progress' ||
      kycStatus === 'in_review'
    ) {
      handleSyncKYC();
      return;
    }

    // For none, declined, resubmit, abandoned, expired, kyc_expired → go to KYC screen
    router.push('/(main)/kyc');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.getKYCStatus();
      setKycStatus(res.kyc_status);
      setKycVerifiedAt(res.kyc_verified_at);
      if (user) {
        await updateUser({ ...user, kyc_status: res.kyc_status, kyc_verified_at: res.kyc_verified_at });
      }
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, [user, updateUser]);

  const kycConfig = KYC_STATUS_MAP[kycStatus] || DEFAULT_KYC_CONFIG;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={22} color={TextColor.secondary} />
          </Pressable>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Accent.primary}
            />
          }
        >
          {/* User Info Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ scale: cardScale }] },
            ]}
          >
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={[Accent.primary, Accent.secondary]}
                style={styles.avatarCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.cardHeaderInfo}>
                <Text style={styles.cardName}>{user?.name}</Text>
                <Text style={styles.cardEmail}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.id ? `${String(user.id).slice(0, 8)}...${String(user.id).slice(-4)}` : '—'}
              </Text>
            </View>
          </Animated.View>

          {/* KYC Status Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ scale: cardScale }] },
            ]}
          >
            <Text style={styles.sectionTitle}>Identity Verification</Text>

            <View style={[styles.kycStatusBadge, { backgroundColor: kycConfig.bg }]}>
              <Ionicons name={kycConfig.icon} size={28} color={kycConfig.color} />
              <View style={styles.kycStatusInfo}>
                <Text style={[styles.kycStatusLabel, { color: kycConfig.color }]}>
                  {kycConfig.label}
                </Text>
                <Text style={styles.kycStatusDesc}>{kycConfig.description}</Text>
              </View>
            </View>

            {kycVerifiedAt && kycStatus === 'approved' && (
              <View style={styles.verifiedRow}>
                <Ionicons name="calendar-outline" size={16} color={Status.success} />
                <Text style={styles.verifiedDate}>
                  Verified on {new Date(kycVerifiedAt).toLocaleDateString()}
                </Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={TextColor.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {kycConfig.actionLabel && (
              <Pressable
                onPress={handleKYCAction}
                disabled={syncing}
                style={({ pressed }) => [
                  styles.kycActionButton,
                  {
                    backgroundColor: kycConfig.color,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {syncing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        kycConfig.actionLabel === 'Sync Status'
                          ? 'sync-outline'
                          : 'arrow-forward'
                      }
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.kycActionText}>{kycConfig.actionLabel}</Text>
                  </>
                )}
              </Pressable>
            )}
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={onRefresh}
              >
                <View style={[styles.actionIcon, { backgroundColor: Status.infoBg }]}>
                  <Ionicons name="refresh-outline" size={22} color={Status.info} />
                </View>
                <Text style={styles.actionLabel}>Refresh</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={() => router.push('/(main)/chat')}
              >
                {totalUnread > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                )}
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(108, 99, 255, 0.15)' }]}>
                  <Ionicons name="chatbubbles-outline" size={22} color={Accent.primary} />
                </View>
                <Text style={styles.actionLabel}>Messages</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={() => router.push('/(main)/camera-test')}
              >
                <View style={[styles.actionIcon, { backgroundColor: Status.pendingBg }]}>
                  <Ionicons name="camera-outline" size={22} color={Status.pending} />
                </View>
                <Text style={styles.actionLabel}>Camera Test</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={logout}
              >
                <View style={[styles.actionIcon, { backgroundColor: Status.errorBg }]}>
                  <Ionicons name="log-out-outline" size={22} color={Status.error} />
                </View>
                <Text style={styles.actionLabel}>Logout</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  greeting: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
  },
  userName: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: TextColor.primary,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  card: {
    backgroundColor: Surface.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: '#fff',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: FontSize.subtitle,
    fontWeight: '600',
    color: TextColor.primary,
  },
  cardEmail: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Surface.cardBorder,
    marginVertical: Spacing.three,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSize.caption,
    color: TextColor.tertiary,
  },
  infoValue: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: TextColor.primary,
    marginBottom: Spacing.three,
  },
  kycStatusBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    gap: Spacing.three,
  },
  kycStatusInfo: {
    flex: 1,
  },
  kycStatusLabel: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  kycStatusDesc: {
    fontSize: FontSize.small,
    color: TextColor.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  verifiedDate: {
    fontSize: FontSize.small,
    color: Status.success,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    padding: Spacing.two,
    backgroundColor: Status.errorBg,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    color: TextColor.error,
    fontSize: FontSize.small,
    flex: 1,
  },
  kycActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  kycActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.caption,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  actionItem: {
    flexGrow: 1,
    flexBasis: '42%',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: Surface.input,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
    gap: Spacing.two,
  },
  actionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Status.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  actionItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: FontSize.small,
    fontWeight: '600',
    color: TextColor.secondary,
  },
});
