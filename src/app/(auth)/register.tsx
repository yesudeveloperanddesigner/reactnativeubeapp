import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import {
  Accent,
  BorderRadius,
  FontSize,
  Spacing,
  Surface,
  TextColor,
} from '@/constants/theme';

export default function RegisterScreen() {
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const onPressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const handleRegister = async () => {
    setError('');

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      shake();
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      shake();
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      shake();
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      shake();
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      shake();
      return;
    }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim().toLowerCase(), password);
    } catch (e: any) {
      setError(e.message || 'Registration failed. Please try again.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    icon: keyof typeof Ionicons.glyphMap,
    placeholder: string,
    value: string,
    onChangeText: (v: string) => void,
    options?: {
      secure?: boolean;
      keyboard?: 'email-address' | 'default';
      autoCapitalize?: 'none' | 'words';
    },
  ) => (
    <View style={styles.inputWrapper}>
      <Ionicons
        name={icon}
        size={20}
        color={TextColor.tertiary}
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={TextColor.tertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={options?.secure && !showPassword}
        keyboardType={options?.keyboard || 'default'}
        autoCapitalize={options?.autoCapitalize || 'none'}
        autoCorrect={false}
      />
      {options?.secure && (
        <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={TextColor.tertiary}
          />
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              {/* Hero */}
              <View style={styles.hero}>
                <LinearGradient
                  colors={['#8B5CF6', Accent.primary]}
                  style={styles.iconCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person-add" size={36} color="#fff" />
                </LinearGradient>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  Join us and get verified in minutes
                </Text>
              </View>

              {/* Error */}
              {error ? (
                <Animated.View
                  style={[
                    styles.errorBox,
                    { transform: [{ translateX: shakeAnim }] },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={TextColor.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name</Text>
                {renderInput('person-outline', 'John Doe', name, setName, {
                  autoCapitalize: 'words',
                })}
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                {renderInput('mail-outline', 'you@example.com', email, setEmail, {
                  keyboard: 'email-address',
                })}
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                {renderInput('lock-closed-outline', 'Min 6 characters', password, setPassword, {
                  secure: true,
                })}
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                {renderInput('lock-closed-outline', 'Re-enter password', confirmPassword, setConfirmPassword, {
                  secure: true,
                })}
              </View>

              {/* Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Pressable
                  onPress={handleRegister}
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  disabled={loading}
                  style={styles.buttonPressable}
                >
                  <LinearGradient
                    colors={['#8B5CF6', Accent.primary, Accent.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text style={styles.footerLink}>Sign In</Text>
                  </Pressable>
                </Link>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '700',
    color: TextColor.primary,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: TextColor.secondary,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  errorText: {
    color: TextColor.error,
    fontSize: FontSize.caption,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: TextColor.secondary,
    marginBottom: Spacing.two,
    marginLeft: Spacing.one,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.input,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Surface.cardBorder,
    paddingHorizontal: Spacing.three,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: Accent.primary,
    backgroundColor: Surface.inputFocused,
    shadowColor: Accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    color: TextColor.primary,
    height: '100%',
  },
  buttonPressable: {
    marginTop: Spacing.three,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  button: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  footerText: {
    color: TextColor.secondary,
    fontSize: FontSize.caption,
  },
  footerLink: {
    color: TextColor.link,
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});
