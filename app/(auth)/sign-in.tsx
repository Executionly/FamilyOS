import { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';
import { supabase } from '@/lib/_core/supabase';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();

  const { initialize, signIn, loading, error, setError } =
    useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    setValidationError(null);
    setError(null);

    if (!email.trim()) {
      setValidationError('Email is required.');
      return;
    }

    if (!password.trim()) {
      setValidationError('Password is required.');
      return;
    }

    try {
      await signIn(email.trim(), password);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !user.email_confirmed_at) {
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: email.trim() },
        });
      } else {
        initialize();
        router.replace('/(tabs)');
      }
    } catch {
      // Error is already handled by useAuthStore.
    }
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 30,
            paddingBottom: Math.max(insets.bottom, 28),
          }}
        >
          <View className="flex-1 justify-center">
            {/* Brand / introduction */}
            <View className="mb-8">
              <View
                style={{
                  backgroundColor: `${colors.primary}14`,
                  borderColor: `${colors.primary}28`,
                }}
                className="mb-5 h-14 w-14 items-center justify-center rounded-2xl border"
              >
                <Ionicons
                  name="people-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>

              <Text className="text-[10px] font-black uppercase tracking-[1.7px] text-muted">
                Welcome back
              </Text>

              <Text className="mt-1 text-3xl font-black tracking-tight text-foreground">
                Sign in to Fambound
              </Text>

              <Text className="mt-2 max-w-[320px] text-sm leading-5 text-muted">
                Continue managing your family space, plans, and connections.
              </Text>
            </View>

            {displayError && (
              <View
                style={{
                  backgroundColor: '#EF44440D',
                  borderColor: '#EF444440',
                }}
                className="mb-5 flex-row items-start rounded-2xl border px-4 py-3.5"
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#EF4444"
                />

                <Text className="ml-3 flex-1 text-sm leading-5 text-red-500">
                  {displayError}
                </Text>
              </View>
            )}

            {/* Sign-in form */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 7 },
                shadowOpacity: 0.07,
                shadowRadius: 16,
                elevation: 3,
              }}
              className="rounded-[26px] border px-5 py-5"
            >
              <View className="mb-5 flex-row items-center">
                <View
                  style={{ backgroundColor: `${colors.primary}14` }}
                  className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                >
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-black text-foreground">
                    Your account
                  </Text>

                  <Text className="mt-1 text-xs text-muted">
                    Enter your details to continue.
                  </Text>
                </View>
              </View>

              {/* Email */}
              <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Email address
              </Text>

              <View
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
                className="mb-4 flex-row items-center rounded-2xl border px-4"
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.muted}
                />

                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={{
                    flex: 1,
                    color: colors.foreground,
                    fontSize: 14,
                    paddingVertical: 15,
                    paddingHorizontal: 12,
                  }}
                />
              </View>

              {/* Password */}
              <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Password
              </Text>

              <View
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
                className="flex-row items-center rounded-2xl border px-4"
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.muted}
                />

                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    color: colors.foreground,
                    fontSize: 14,
                    paddingVertical: 15,
                    paddingHorizontal: 12,
                  }}
                />

                <Pressable
                  onPress={() =>
                    setShowPassword((previous) => !previous)
                  }
                  disabled={loading}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    opacity: loading ? 0.4 : pressed ? 0.55 : 1,
                  })}
                  className="h-9 w-9 items-center justify-center rounded-xl"
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-off-outline'
                        : 'eye-outline'
                    }
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              {/* Forgot password */}
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.55 : 1,
                  })}
                  className="mt-3 self-end"
                >
                  <Text
                    style={{ color: colors.primary }}
                    className="text-xs font-black"
                  >
                    Forgot password?
                  </Text>
                </Pressable>
              </Link>

              {/* Sign in */}
              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={({
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.6 : 1,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.22,
                  shadowRadius: 12,
                  elevation: 4,
                })}
                className="mt-5 flex-row items-center justify-center rounded-2xl py-4"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="log-in-outline"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text className="ml-2 text-sm font-black text-white">
                      Sign In
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </Pressable>
            </View>

            {/* Join family */}
            <View className="mt-6 flex-row items-center">
              <View
                style={{ backgroundColor: colors.border }}
                className="h-px flex-1"
              />

              <Text className="mx-3 text-[10px] font-black uppercase tracking-wider text-muted">
                New here?
              </Text>

              <View
                style={{ backgroundColor: colors.border }}
                className="h-px flex-1"
              />
            </View>

            <Pressable
              onPress={() => router.push('/(auth)/join-family')}
              style={({
                backgroundColor: colors.surface,
                borderColor: `${colors.primary}45`,
              })}
              className="mt-5 flex-row items-center justify-center rounded-2xl border py-3.5"
            >
              <Ionicons
                name="people-outline"
                size={18}
                color={colors.primary}
              />

              <Text
                style={{ color: colors.primary }}
                className="ml-2 text-sm font-black"
              >
                Join a Family
              </Text>
            </Pressable>

            {/* Sign-up link */}
            <View className="mt-7 flex-row items-center justify-center">
              <Text className="text-xs font-medium text-muted">
                Don&apos;t have an account?{' '}
              </Text>

              <Link href="/(auth)/sign-up" asChild>
                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <Text
                    style={{ color: colors.primary }}
                    className="text-xs font-black"
                  >
                    Sign up
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
