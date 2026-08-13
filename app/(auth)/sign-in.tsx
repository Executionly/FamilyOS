import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/_core/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { initialize, signIn, loading, error, setError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    setValidationError(null);
    setError(null);

    // Validation
    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (!password.trim()) {
      setValidationError('Password is required');
      return;
    }

    try {
      await signIn(email, password);
      // Check if user needs email verification
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email },
        });
      } else {
        initialize()
        router.replace('/(tabs)');
      }
    } catch (error) {
      // Error is already set in store
    }
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer containerClassName="bg-background" 
    safeAreaClassName="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          <View className="flex-1 justify-center px-6 py-8">
            {/* Header */}
            <View className="mb-8 items-center">
              <Text className="text-4xl font-bold text-foreground mb-2">Welcome Back</Text>
              <Text className="text-base text-muted text-center">
                Sign in to your Fambound account
              </Text>
            </View>

            {/* Error Message */}
            {displayError && (
              <View className="mb-6 p-4 bg-error/10">
                <Text className="text-sm text-error font-medium">{displayError}</Text>
              </View>
            )}

            {/* Email Input */}
            <View className="mb-4">
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

            {/* Password Input */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-semibold text-foreground">
                Password
              </Text>

              <View
                className="flex-row items-center rounded-lg border border-border bg-surface px-4"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  secureTextEntry={!showPassword}
                  className="flex-1 py-4 text-base text-foreground"
                  style={{
                    color: colors.foreground,
                  }}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable className="mb-6">
                <Text className="text-sm font-semibold text-primary">Forgot password?</Text>
              </Pressable>
            </Link>

            {/* Sign In Button */}
            <TouchableOpacity
            onPress={handleSignIn}
                disabled={loading}
            className='py-4 items-center bg-primary rounded-lg mb-8'>
              {loading ? (
                  <ActivityIndicator color={"#fff"} />
                ) : (
                  <Text className='text-foreground text-base font-semibold'>
                    Sign In
                  </Text>
                )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-border" />
              <Text className="mx-3 text-sm text-muted">Or</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            <Pressable
              onPress={() => router.push('/(auth)/join-family')}
              className="py-3 items-center border border-primary rounded-lg mb-3"
            >
              <Text className="text-primary text-sm font-semibold">Join a Family</Text>
            </Pressable>

            {/* OAuth Buttons */}
            {/* <View className="gap-3 mb-6">
              <Pressable
                disabled={loading}
                style={({ pressed }) => [
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                className="flex-row items-center justify-center border rounded-lg py-3"
              >
                <Text className="text-base font-semibold text-foreground">🍎 Sign in with Apple</Text>
              </Pressable>

              <Pressable
                disabled={loading}
                style={({ pressed }) => [
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                className="flex-row items-center justify-center border rounded-lg py-3"
              >
                <Text className="text-base font-semibold text-foreground">🔵 Sign in with Google</Text>
              </Pressable>
            </View> */}

            {/* Sign Up Link */}
            <View className="flex-row justify-center items-center">
              <Text className="text-sm text-muted">Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable>
                  <Text className="text-sm font-semibold text-primary">Sign up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
