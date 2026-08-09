import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { checkSignupCode } from '@/lib/services/signup-code';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';

type FamilyPreview = { name: string; role: string; family_name: string };

export default function JoinFamilyScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signUp, loading, error, setError } = useAuthStore();

  const [code, setCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FamilyPreview | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCheckCode = async () => {
    setCodeError(null);
    if (!code.trim()) {
      setCodeError('Please enter your member code');
      return;
    }
    setCheckingCode(true);
    try {
      const result = await checkSignupCode(code.trim());
      if (!result) {
        setCodeError('Invalid or already used code. Check with your family admin.');
        setPreview(null);
      } else {
        setPreview(result);
      }
    } catch (err) {
      setCodeError('Something went wrong checking that code. Try again.');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleJoin = async () => {
    setValidationError(null);
    setError(null);

    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (!password.trim() || password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    try {
      await signUp(email, password, {
        fullName: preview!.name, // member's existing name — no need to ask again
        signupCode: code.trim(),
      });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email, source: 'join-family' },
      });
    } catch (err) {
      // error already set in store
    }
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} className="flex-1">
        <View className="flex-1 justify-center px-6 py-8">
          <View className="mb-8 items-center">
            <Text className="text-4xl font-bold text-foreground mb-2">Join Your Family</Text>
            <Text className="text-base text-muted text-center">
              Enter the code your family admin shared with you
            </Text>
          </View>

          {!preview ? (
            <>
              {codeError && (
                <View className="mb-4 p-4 bg-error/10 rounded-lg border border-error/20">
                  <Text className="text-sm text-error font-medium">{codeError}</Text>
                </View>
              )}

              <View className="mb-6">
                <Text className="text-sm font-semibold text-foreground mb-2">Member Code</Text>
                <TextInput
                  placeholder="A3F9K2"
                  placeholderTextColor={colors.muted}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                  editable={!checkingCode}
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base tracking-widest text-center"
                  style={{ color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }}
                />
              </View>

              <TouchableOpacity
                onPress={handleCheckCode}
                disabled={checkingCode}
                className="py-4 items-center bg-primary rounded-lg"
              >
                {checkingCode ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-foreground text-base font-semibold">Continue</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <Text className="text-base text-foreground">
                  Welcome, <Text className="font-bold">{preview.name}</Text>! You're joining{' '}
                  <Text className="font-bold">{preview.family_name}</Text> as a {preview.role}.
                </Text>
              </View>

              {displayError && (
                <View className="mb-4 p-4 bg-error/10 rounded-lg border border-error/20">
                  <Text className="text-sm text-error font-medium">{displayError}</Text>
                </View>
              )}

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
                  style={{ color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }}
                />
              </View>

              {/* Password Input */}
              <View className="mb-4">
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

                <Text className="mt-1 text-xs text-muted">
                  At least 8 characters
                </Text>
              </View>

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold text-foreground">
                  Confirm Password
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
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 py-4 text-base text-foreground"
                    style={{
                      color: colors.foreground,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={loading}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleJoin}
                disabled={loading}
                className="py-4 items-center bg-primary rounded-lg"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-foreground text-base font-semibold">Join Family</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center mt-8">
            <Text className="text-sm text-muted">Already have an account? </Text>
            <Pressable onPress={()=>router.back()}>
              <Text className="text-sm font-semibold text-primary">Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}