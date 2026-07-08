import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const { resetPassword, loading, error, setError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleResetPassword = async () => {
    setValidationError(null);
    setError(null);

    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (error) {
      // Error is already set in store
    }
  };

  const displayError = validationError || error;

  if (submitted) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 justify-center px-6 py-8">
          <View className="items-center mb-8">
            <Text className="text-4xl mb-4">✓</Text>
            <Text className="text-2xl font-bold text-foreground mb-2">Check Your Email</Text>
            <Text className="text-base text-muted text-center">
              We've sent a password reset link to {email}
            </Text>
          </View>

          <View className="bg-surface rounded-lg p-4 mb-8">
            <Text className="text-sm text-muted">
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </Text>
          </View>

          <Link href="/(auth)/sign-in" asChild>
            <Pressable
              style={{ backgroundColor: colors.primary }}
              className="rounded-lg py-4 items-center"
            >
              <Text className="text-base font-semibold text-background">Back to Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScreenContainer>
    );
  }

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
            <Text className="text-4xl font-bold text-foreground mb-2">Reset Password</Text>
            <Text className="text-base text-muted text-center">
              Enter your email and we'll send you a link to reset your password
            </Text>
          </View>

          {/* Error Message */}
          {displayError && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{displayError}</Text>
            </View>
          )}

          {/* Email Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Email</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            />
          </View>

          {/* Reset Button */}
           <TouchableOpacity
           onPress={handleResetPassword}
            disabled={loading}
          className='py-4 items-center bg-primary rounded-lg mb-8'>
              {loading ? (
                <ActivityIndicator color={"#fff"} />
              ) : (
                <Text className='text-foreground text-base font-semibold'>
                  Send Reset Link
                </Text>
              )}
          </TouchableOpacity>

          {/* Back to Sign In Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-sm text-muted">Remember your password? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text className="text-sm font-semibold text-primary">Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
