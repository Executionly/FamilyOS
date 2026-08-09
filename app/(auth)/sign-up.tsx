import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';
import { CountryPickerModal } from '@/components/modals/country-picker';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signUp, loading, error, setError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState('');
  const [userRole, setUserRole] = useState<'father' | 'mother' | string>('father');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    setValidationError(null);
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setValidationError('Full name is required');
      return;
    }
    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (!password.trim()) {
      setValidationError('Password is required');
      return;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (!country) {
      setValidationError('Please select your country');
      return;
    }

    try {
      await signUp(email, password, {
        fullName: fullName.trim(),
        country,
        ethnicity: ethnicity.trim() || undefined,
        role: userRole
      });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email },
      });
    } catch (error) {
      // Error is already set in store
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
            <Text className="text-4xl font-bold text-foreground mb-2">Create Account</Text>
            <Text className="text-base text-muted text-center">
              Join Fambound and build your family's shared identity
            </Text>
          </View>

          {/* Error Message */}
          {displayError && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{displayError}</Text>
            </View>
          )}

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-2">Full Name</Text>
            <TextInput
              placeholder="John Doe"
              placeholderTextColor={colors.muted}
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
              autoCapitalize="words"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
              style={{ color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }}
            />
          </View>
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

          <View className="mb-8">
            <Text className="text-sm font-semibold text-foreground mb-3">Role</Text>
            <View className="flex-row gap-2">
              {["father", "mother"].map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setUserRole(role)}
                  className={`flex-1 py-2 px-3 rounded-lg border capitalize ${
                    userRole === role ? 'border-primary' : 'border-border'
                  }`}
                  style={{
                    backgroundColor: userRole === role ? colors.primary : colors.surface,
                  }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      userRole === role ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {role}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Country Select */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-2">Country</Text>
            <TouchableOpacity
              onPress={() => setCountryModalVisible(true)}
              disabled={loading}
              className="bg-surface border border-border rounded-lg px-4 py-3"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <Text className={country ? 'text-foreground text-base' : 'text-muted text-base'}>
                {country || 'Select your country'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ethnicity (optional) */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Ethnicity <Text className="text-muted font-normal">(optional)</Text>
            </Text>
            <TextInput
              placeholder=""
              placeholderTextColor={colors.muted}
              value={ethnicity}
              onChangeText={setEthnicity}
              editable={!loading}
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

          {/* Sign Up Button */}
          <TouchableOpacity
          onPress={handleSignUp}
            disabled={loading}
          className='py-4 items-center bg-primary rounded-lg mb-3'>
              {loading ? (
                <ActivityIndicator color={"#fff"} />
              ) : (
                <Text className='text-foreground text-base font-semibold'>
                  Create Account
                </Text>
              )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-2">
            <View className="flex-1 h-px bg-border" />
            <Text className="mx-3 text-sm text-muted">Or</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/join-family')}
            className="py-3 items-center border border-primary rounded-lg mb-4"
          >
            <Text className="text-foreground text-base font-semibold">Join a Family</Text>
          </TouchableOpacity>

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
              <Text className="text-base font-semibold text-foreground">🍎 Sign up with Apple</Text>
            </Pressable>

            <Pressable
              disabled={loading}
              style={({ pressed }) => [
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
              className="flex-row items-center justify-center border rounded-lg py-3"
            >
              <Text className="text-base font-semibold text-foreground">🔵 Sign up with Google</Text>
            </Pressable>
          </View> */}

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-sm text-muted">Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text className="text-sm font-semibold text-primary">Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
      <CountryPickerModal
        visible={countryModalVisible}
        selected={country}
        onSelect={setCountry}
        onClose={() => setCountryModalVisible(false)}
      />
    </ScreenContainer>
  );
}
