import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Themed';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const fullPhone = useMemo(() => `+91${phone}`, [phone]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const focusOtp = (index: number) => {
    otpRefs.current[index]?.focus();
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      focusOtp(index + 1);
    }
  };

  const sendOtp = async () => {
    setError(null);
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: {
        shouldCreateUser: false,
      },
    });
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setStep('otp');
    setTimer(60);
    setOtpDigits(Array(6).fill(''));
    setTimeout(() => focusOtp(0), 50);
  };

  const verifyOtp = async () => {
    setError(null);
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setIsSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'sms',
    });
    setIsSubmitting(false);

    if (verifyError) {
      setError(verifyError.message || 'Invalid OTP. Please try again.');
      return;
    }

    router.replace('/');
  };

  return (
    <Screen
      maxWidth={520}
      safeAreaStyle={styles.safeArea}
      contentContainerStyle={styles.screenContent}
      padded={false}
    >
      <View pointerEvents="none" style={styles.background}>
        <LinearGradient
          colors={['#050b10', '#0b1c21', '#050b10']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glow, styles.glowOne]} />
        <View style={[styles.glow, styles.glowTwo]} />
      </View>
      <View style={styles.card}>
        <LinearGradient
          colors={['#14b8a6', '#134e4a']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.cardAccent}
        />
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/images/Sample_Logo.png')} style={styles.logo} />
        </View>
        <Text style={styles.title}>Login with Phone</Text>
        <Text style={styles.subtitle}>
          {step === 'phone' ? 'We’ll send a one-time password' : `Enter the OTP sent to +91 ${phone}`}
        </Text>

        {step === 'phone' ? (
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Phone number"
              keyboardType="number-pad"
              style={[styles.input, styles.phoneInput]}
              placeholderTextColor="#94a3b8"
              maxLength={10}
            />
          </View>
        ) : (
          <View style={styles.otpRow}>
            {otpDigits.map((digit, index) => (
              <TextInput
                key={`otp-${index}`}
                ref={(ref) => {
                  otpRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(value) => updateOtpDigit(index, value)}
                keyboardType="number-pad"
                maxLength={1}
                style={styles.otpInput}
                textAlign="center"
              />
            ))}
          </View>
        )}

        {step === 'phone' ? (
          <Pressable onPress={() => setRememberDevice((prev) => !prev)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, rememberDevice && styles.checkboxChecked]}>
              {rememberDevice ? (
                <MaterialCommunityIcons name="check" size={14} color="#ffffff" />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>Save this account on this device</Text>
          </Pressable>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={step === 'phone' ? sendOtp : verifyOtp} disabled={isSubmitting}>
          <LinearGradient
            colors={['#14b8a6', '#0f766e']}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>{step === 'phone' ? 'Request OTP' : 'Verify & Continue'}</Text>
            )}
          </LinearGradient>
        </Pressable>

        {step === 'otp' ? (
          <View style={styles.otpFooterRow}>
            <Pressable onPress={() => setStep('phone')}>
              <Text style={styles.footerLink}>Change number</Text>
            </Pressable>
            <Pressable onPress={sendOtp} disabled={timer > 0 || isSubmitting}>
              <Text style={[styles.footerLink, timer > 0 && styles.footerLinkDisabled]}>
                {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.footerDivider} />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Create Account</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050b10',
  },
  screenContent: {
    justifyContent: 'center',
    paddingVertical: 32,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
  },
  glowOne: {
    top: -80,
    right: -120,
  },
  glowTwo: {
    bottom: -120,
    left: -80,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#0b1c21',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    marginHorizontal: 20,
  },
  cardAccent: {
    height: 6,
    width: '100%',
    borderRadius: 999,
    marginBottom: 10,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
    marginBottom: 6,
    overflow: 'visible',
  },
  logo: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    color: '#14b8a6',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCode: {
    minWidth: 70,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    color: '#334155',
    fontWeight: '700',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  phoneInput: {
    flex: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    minHeight: 52,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#0f172a',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  checkboxLabel: {
    color: '#4b5563',
    fontSize: 13,
  },
  button: {
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f766e',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#e11d48',
    fontSize: 13,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#6b7280',
  },
  footerLink: {
    color: '#14b8a6',
    fontWeight: '700',
  },
  otpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLinkDisabled: {
    opacity: 0.6,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 12,
  },
});
