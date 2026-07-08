import { useState, useEffect } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { email: paramEmail } = useLocalSearchParams<{ email: string }>();
  const { verifyOTP, loading, error, setError } = useAuthStore();

  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerifyCode = async () => {
    setValidationError(null);
    setError(null);

    if (!code.trim()) {
      setValidationError('Verification code is required');
      return;
    }

    if (code.length !== 6) {
      setValidationError('Code must be 6 digits');
      return;
    }

    try {
      await verifyOTP(paramEmail || '', code);
      router.replace('/(onboarding)/welcome');
    } catch (err) {
      // Error is already set in store
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError(null);
    try {
      // Resend is handled by calling signUp again
      // In a real app, you'd have a separate resendOTP function
      setResendCountdown(60);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend code';
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Header */}
          <View className="mb-8 items-center">
            <Text className="text-4xl mb-4">✉️</Text>
            <Text className="text-3xl font-bold text-foreground mb-2">Verify Email</Text>
            <Text className="text-base text-muted text-center">
              We sent a 6-digit code to {'\n'}{paramEmail}
            </Text>
          </View>

          {/* Error Message */}
          {displayError && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{displayError}</Text>
            </View>
          )}

          {/* Code Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Verification Code</Text>
            <TextInput
              placeholder="000000"
              placeholderTextColor={colors.muted}
              value={code}
              onChangeText={(text) => {
                // Only allow numbers, max 6 digits
                const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(numericText);
              }}
              editable={!loading}
              keyboardType="number-pad"
              maxLength={6}
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 16,
                fontSize: 32,
                textAlign: 'center',
                letterSpacing: 8,
                fontWeight: '600',
              }}
            />
            <Text className="text-xs text-muted mt-2 text-center">
              Enter the 6-digit code sent to your email
            </Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
          onPress={handleVerifyCode}
            disabled={loading || code.length !== 6}
          className='py-4 items-center bg-primary rounded-lg mb-8'>
              {loading ? (
                <ActivityIndicator color={"#fff"} />
              ) : (
                <Text className='text-foreground text-base font-semibold'>
                  Verify Code
                </Text>
              )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 12 }}>
              Didn't receive the code?
            </Text>
            <Pressable
              onPress={handleResendCode}
              disabled={resendLoading || resendCountdown > 0}
              style={({ pressed }) => [
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  color: resendCountdown > 0 ? colors.muted : colors.primary,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
