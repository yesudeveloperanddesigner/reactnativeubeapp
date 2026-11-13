import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  startVerification as diditStartVerification,
  VerificationStatus,
} from '@didit-protocol/sdk-react-native';
import * as Device from 'expo-device';

import { useAuth } from '@/context/AuthContext';
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

type Step = 'intro' | 'submitted';

export default function KYCScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    status: string;
  } | null>(null);

  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const startVerification = async () => {
    setError('');
    setLoading(true);
    try {
      if (!Device.isDevice) {
        throw new Error('Identity verification requires a physical device with a camera. Please test on a real device.');
      }
      const res = await api.createKYCSession();
      if (!res.session_token) {
        throw new Error('Verification session could not be created');
      }
      setSessionInfo({ sessionId: res.session_id, status: res.kyc_status });

      const result = await diditStartVerification(res.session_token);

      switch (result.type) {
        case 'completed': {
          const statusMap: Record<string, string> = {
            [VerificationStatus.Approved]: 'approved',
            [VerificationStatus.Declined]: 'declined',
            [VerificationStatus.Pending]: 'in_review',
          };
          const mappedStatus =
            statusMap[result.session.status] || result.session.status;
          setSessionInfo({
            sessionId: result.session.sessionId,
            status: mappedStatus,
          });
          await completeVerification(mappedStatus, result.session.sessionId);
          break;
        }
        case 'cancelled':
          setError('Verification was cancelled. You can try again when ready.');
          setStep('intro');
          break;
        case 'failed':
          setError(result.error.message || 'Verification failed. Please try again.');
          setStep('intro');
          break;
      }
    } catch (e: any) {
      setError(e.message || 'Failed to start verification');
    } finally {
      setLoading(false);
    }
  };

  const completeVerification = async (status?: string, sessionId?: string) => {
    if (syncing) return;
    setSyncing(true);
    setError('');
    try {
      const res = await api.syncKYCStatus();
      const finalStatus = status || res.kyc_status;
      const finalSessionId = sessionId || res.kyc_session_id || sessionInfo?.sessionId || '';
      setSessionInfo({ sessionId: finalSessionId, status: finalStatus });
      if (user) {
        await updateUser({
          ...user,
          kyc_status: res.kyc_status,
          kyc_session_id: res.kyc_session_id,
          kyc_verified_at: res.kyc_verified_at,
        });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to sync verification status');
    } finally {
      setSyncing(false);
      setStep('submitted');
    }
  };

  const goHome = () => {
    router.replace('/(main)/home');
  };

  const finalStatus = sessionInfo?.status || '';
  const isApproved = finalStatus === 'approved';
  const isDeclined = finalStatus === 'declined' || finalStatus === 'resubmit';
  const isPending = !isApproved && !isDeclined;

  const requirements = [
    { icon: 'camera-outline', text: 'A clear, well-lit selfie' },
    {
      icon: 'card-outline',
      text: 'Your government-issued ID (passport, license, or national ID)',
    },
    {
      icon: 'shield-checkmark-outline',
      text: 'Your documents are handled securely by our partner',
    },
  ] as const;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Pressable
            onPress={() => {
              if (step === 'submitted') goHome();
              else router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={TextColor.primary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <View style={styles.backButton} />
        </Animated.View>

        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Step: Intro */}
            {step === 'intro' && (
              <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
                <View style={styles.stepHeader}>
                  <LinearGradient
                    colors={[Accent.primary, Accent.secondary]}
                    style={styles.shieldCircle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="shield-checkmark" size={40} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.stepTitle}>Verify Your Identity</Text>
                  <Text style={styles.stepDescription}>
                    You&apos;ll be securely redirected to our verification partner to confirm your
                    identity. The process takes about 2 minutes.
                  </Text>
                </View>

                <View style={styles.requirementsCard}>
                  {requirements.map((r) => (
                    <View key={r.text} style={styles.requirementRow}>
                      <View style={styles.requirementIcon}>
                        <Ionicons name={r.icon} size={18} color={Accent.primary} />
                      </View>
                      <Text style={styles.requirementText}>{r.text}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.consentNote}>
                  <Ionicons name="lock-closed-outline" size={16} color={TextColor.secondary} />
                  <Text style={styles.consentText}>
                    By continuing, you consent to our verification partner Didit processing your ID
                    document, selfie and biometric data to confirm your identity, in line with our
                    Privacy Policy.
                  </Text>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={TextColor.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={startVerification}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <LinearGradient
                    colors={[Accent.primary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.nextButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#fff" />
                        <Text style={styles.nextButtonText}>Start Verification</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Step: Submitted */}
            {step === 'submitted' && (
              <Animated.View
                style={[styles.stepContent, styles.submittedContent, { opacity: fadeAnim }]}
              >
                <LinearGradient
                  colors={
                    isApproved
                      ? [Status.success, '#059669']
                      : isDeclined
                        ? [Status.error, '#dc2626']
                        : [Accent.primary, Accent.secondary]
                  }
                  style={styles.successCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={isApproved ? 'checkmark' : isDeclined ? 'close' : 'time'}
                    size={48}
                    color="#fff"
                  />
                </LinearGradient>

                <Text style={styles.submittedTitle}>
                  {isApproved
                    ? 'Identity Verified!'
                    : isDeclined
                      ? 'Verification Declined'
                      : 'Verification in Progress'}
                </Text>
                <Text style={styles.submittedDesc}>
                  {isApproved
                    ? 'Your identity has been verified successfully. Welcome aboard!'
                    : isDeclined
                      ? "We couldn't verify your identity with the information provided. Please contact support for assistance."
                      : "Your verification is being reviewed by our team. You'll be notified once it's complete."}
                </Text>

                {sessionInfo ? (
                  <View style={styles.sessionCard}>
                    {sessionInfo.sessionId ? (
                      <View style={styles.sessionRow}>
                        <Text style={styles.sessionLabel}>Session ID</Text>
                        <Text style={styles.sessionValue} numberOfLines={1}>
                          {sessionInfo.sessionId.slice(0, 12)}...
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.sessionRow}>
                      <Text style={styles.sessionLabel}>Status</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{finalStatus || 'unknown'}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={TextColor.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={goHome}
                  style={({ pressed }) => [
                    styles.nextButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <LinearGradient
                    colors={[Accent.primary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.nextButtonGradient}
                  >
                    <Ionicons name="home" size={18} color="#fff" />
                    <Text style={styles.nextButtonText}>Back to Dashboard</Text>
                  </LinearGradient>
                </Pressable>

                {isDeclined && (
                  <Pressable onPress={() => setStep('intro')} style={styles.tryAgainButton}>
                    <Text style={styles.tryAgainText}>Try Again</Text>
                  </Pressable>
                )}
              </Animated.View>
            )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Surface.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  headerTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: TextColor.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  stepContent: {
    gap: Spacing.four,
  },
  stepHeader: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  stepTitle: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: TextColor.primary,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  shieldCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Accent.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  requirementsCard: {
    backgroundColor: Surface.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  requirementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementText: {
    flex: 1,
    fontSize: FontSize.small,
    color: TextColor.secondary,
    lineHeight: 18,
  },
  consentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  consentText: {
    flex: 1,
    fontSize: FontSize.small - 1,
    color: TextColor.secondary,
    lineHeight: 17,
  },
  nextButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    gap: Spacing.two,
  },
  nextButtonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#fff',
  },
  submitButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: Status.errorBg,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    color: TextColor.error,
    fontSize: FontSize.small,
    flex: 1,
  },
  submittedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.six,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Status.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  submittedTitle: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: TextColor.primary,
    textAlign: 'center',
  },
  submittedDesc: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  sessionCard: {
    width: '100%',
    backgroundColor: Surface.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLabel: {
    fontSize: FontSize.small,
    color: TextColor.tertiary,
  },
  sessionValue: {
    fontSize: FontSize.small,
    color: TextColor.secondary,
    fontFamily: 'monospace',
    maxWidth: '60%',
  },
  statusPill: {
    backgroundColor: Status.pendingBg,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.full,
  },
  statusPillText: {
    fontSize: FontSize.small,
    color: Status.pending,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tryAgainButton: {
    paddingVertical: Spacing.three,
  },
  tryAgainText: {
    color: Accent.primary,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: FontSize.body,
  },
});
