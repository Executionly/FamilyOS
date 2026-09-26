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
import { CountryPickerModal } from '@/components/modals/country-picker';

function PasswordField({
  label,
  value,
  placeholder,
  visible,
  onChangeText,
  onToggleVisibility,
  disabled,
  colors,
  hint,
}: {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  disabled: boolean;
  colors: any;
  hint?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
        {label}
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
          size={17}
          color={colors.muted}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          editable={!disabled}
          secureTextEntry={!visible}
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
          onPress={onToggleVisibility}
          disabled={disabled}
          hitSlop={10}
          style={({ pressed }) => ({
            opacity: disabled ? 0.4 : pressed ? 0.55 : 1,
          })}
          className="h-9 w-9 items-center justify-center rounded-xl"
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.muted}
          />
        </Pressable>
      </View>

      {hint && (
        <Text className="mt-1.5 text-[11px] font-medium text-muted">
          {hint}
        </Text>
      )}
    </View>
  );
}

function ErrorNotice({
  message,
}: {
  message: string;
}) {
  return (
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
        {message}
      </Text>
    </View>
  );
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();

  const { signUp, loading, error, setError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState('');
  const [userRole, setUserRole] = useState<'father' | 'mother' | string>(
    'father',
  );
  const [countryModalVisible, setCountryModalVisible] =
    useState(false);
  const [validationError, setValidationError] = useState<string | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleSignUp = async () => {
    setValidationError(null);
    setError(null);

    if (!fullName.trim()) {
      setValidationError('Full name is required.');
      return;
    }

    if (!email.trim()) {
      setValidationError('Email is required.');
      return;
    }

    if (!password.trim()) {
      setValidationError('Password is required.');
      return;
    }

    if (password.length < 8) {
      setValidationError(
        'Password must be at least 8 characters.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (!country) {
      setValidationError('Please select your country.');
      return;
    }

    try {
      await signUp(email.trim(), password, {
        fullName: fullName.trim(),
        country,
        ethnicity: ethnicity.trim() || undefined,
        role: userRole,
      });

      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: email.trim() },
      });
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
            paddingTop: 28,
            paddingBottom: Math.max(insets.bottom, 28),
          }}
        >
          <View className="flex-1 justify-center">
            {/* Page introduction */}
            <View className="mb-7">
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
                Start your family space
              </Text>

              <Text className="mt-1 text-3xl font-black tracking-tight text-foreground">
                Create your account
              </Text>

              <Text className="mt-2 max-w-[330px] text-sm leading-5 text-muted">
                Join Fambound and build your family&apos;s shared identity.
              </Text>
            </View>

            {displayError && (
              <ErrorNotice message={displayError} />
            )}

            {/* Account details */}
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
                    name="person-add-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-black text-foreground">
                    Your details
                  </Text>

                  <Text className="mt-1 text-xs text-muted">
                    Tell us a little about yourself.
                  </Text>
                </View>
              </View>

              {/* Full name */}
              <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Full name
              </Text>

              <View
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
                className="mb-4 flex-row items-center rounded-2xl border px-4"
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.muted}
                />

                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor={colors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    color: colors.foreground,
                    fontSize: 14,
                    paddingVertical: 15,
                    paddingHorizontal: 12,
                  }}
                />
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

              {/* Role */}
              <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Your family role
              </Text>

              <View className="mb-5 flex-row gap-2.5">
                {['father', 'mother'].map((role) => {
                  const selected = userRole === role;

                  return (
                    <Pressable
                      key={role}
                      onPress={() => setUserRole(role)}
                      disabled={loading}
                      style={({
                        backgroundColor: selected
                          ? colors.primary
                          : colors.background,
                        borderColor: selected
                          ? colors.primary
                          : colors.border,
                      })}
                      className="flex-1 flex-row items-center justify-center rounded-2xl border py-3.5"
                    >
                      <Ionicons
                        name={
                          role === 'father'
                            ? 'man-outline'
                            : 'woman-outline'
                        }
                        size={17}
                        color={selected ? '#FFFFFF' : colors.primary}
                      />

                      <Text
                        style={{
                          color: selected
                            ? '#FFFFFF'
                            : colors.foreground,
                        }}
                        className="ml-2 text-sm font-black capitalize"
                      >
                        {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Country */}
              <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Country
              </Text>

              <Pressable
                onPress={() => setCountryModalVisible(true)}
                disabled={loading}
                style={({ pressed }) => ({
                  backgroundColor: colors.background,
                  // borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                })}
                className="mb-4 flex-row items-center justify-between rounded-2xl border border-gray-300 px-4 py-3.5"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={colors.muted}
                  />

                  <Text
                    className={`ml-3 text-sm ${
                      country
                        ? 'text-foreground'
                        : 'text-muted'
                    }`}
                  >
                    {country || 'Select your country'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={17}
                  color={colors.muted}
                />
              </Pressable>

              {/* Ethnicity */}
              <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Ethnicity{' '}
                <Text className="font-medium text-muted">
                  (optional)
                </Text>
              </Text>

              <View className="mb-5">
                <TextInput
                  placeholder="e.g. Yoruba, Igbo, Fulani"
                  placeholderTextColor={colors.muted}
                  value={ethnicity}
                  onChangeText={setEthnicity}
                  editable={!loading}
                  autoCorrect={false}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  }}
                  className="rounded-2xl border px-4 py-3.5 text-sm"
                />
              </View>

              {/* Password */}
              <PasswordField
                label="Password"
                value={password}
                placeholder="Minimum 8 characters"
                visible={showPassword}
                onChangeText={setPassword}
                onToggleVisibility={() =>
                  setShowPassword((previous) => !previous)
                }
                disabled={loading}
                hint="Use at least 8 characters."
                colors={colors}
              />

              {/* Confirm password */}
              <PasswordField
                label="Confirm password"
                value={confirmPassword}
                placeholder="Re-enter your password"
                visible={showConfirmPassword}
                onChangeText={setConfirmPassword}
                onToggleVisibility={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                disabled={loading}
                colors={colors}
              />

              <View
                style={{
                  backgroundColor: `${colors.primary}08`,
                  borderColor: `${colors.primary}20`,
                }}
                className="mb-5 flex-row items-start rounded-2xl border px-3.5 py-3"
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={colors.primary}
                />

                <Text className="ml-2 flex-1 text-[11px] leading-4 text-muted">
                  Your email will need to be verified before you can sign in.
                </Text>
              </View>

              {/* Create account */}
              <Pressable
                onPress={handleSignUp}
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
                className="flex-row items-center justify-center rounded-2xl py-4"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text className="ml-2 text-sm font-black text-white">
                      Create Account
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

            {/* Join existing family */}
            <View className="mt-6 flex-row items-center">
              <View
                style={{ backgroundColor: colors.border }}
                className="h-px flex-1"
              />

              <Text className="mx-3 text-[10px] font-black uppercase tracking-wider text-muted">
                Already part of a family?
              </Text>

              <View
                style={{ backgroundColor: colors.border }}
                className="h-px flex-1"
              />
            </View>

            <Pressable
              onPress={() => router.push('/(auth)/join-family')}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderColor: `${colors.primary}45`,
                opacity: pressed ? 0.72 : 1,
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

            {/* Sign-in link */}
            <View className="mt-7 flex-row items-center justify-center">
              <Text className="text-xs font-medium text-muted">
                Already have an account?{' '}
              </Text>

              <Link href="/(auth)/sign-in" asChild>
                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <Text
                    style={{ color: colors.primary }}
                    className="text-xs font-black"
                  >
                    Sign in
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPickerModal
        visible={countryModalVisible}
        selected={country}
        onSelect={setCountry}
        onClose={() => setCountryModalVisible(false)}
      />
    </ScreenContainer>
  );
}
