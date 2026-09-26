import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { checkSignupCode } from '@/lib/services/signup-code';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';

type FamilyPreview = {
  name: string;
  role: string;
  family_name: string;
};

function PasswordField({
  label,
  value,
  placeholder,
  visible,
  onChangeText,
  onToggleVisibility,
  disabled,
  colors,
}: {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  disabled: boolean;
  colors: any;
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
    </View>
  );
}

function ErrorNotice({
  message,
  colors,
}: {
  message: string;
  colors: any;
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
  const [validationError, setValidationError] = useState<string | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleCheckCode = async () => {
    setCodeError(null);

    if (!code.trim()) {
      setCodeError('Please enter your member code.');
      return;
    }

    setCheckingCode(true);

    try {
      const result = await checkSignupCode(code.trim());

      if (!result) {
        setCodeError(
          'Invalid or already used code. Check with your family admin.',
        );
        setPreview(null);
      } else {
        setPreview(result);
      }
    } catch {
      setCodeError(
        'Something went wrong checking that code. Try again.',
      );
    } finally {
      setCheckingCode(false);
    }
  };

  const handleJoin = async () => {
    setValidationError(null);
    setError(null);

    if (!email.trim()) {
      setValidationError('Email is required.');
      return;
    }

    if (!password.trim() || password.length < 8) {
      setValidationError(
        'Password must be at least 8 characters.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (!preview) return;

    try {
      await signUp(email.trim(), password, {
        fullName: preview.name,
        signupCode: code.trim(),
      });

      router.replace({
        pathname: '/(auth)/verify-email',
        params: {
          email: email.trim(),
          source: 'join-family',
        },
      });
    } catch {
      // Error is already stored by useAuthStore.
    }
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: 32,
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
                size={27}
                color={colors.primary}
              />
            </View>

            <Text className="text-[10px] font-black uppercase tracking-[1.7px] text-muted">
              Family invitation
            </Text>

            <Text className="mt-1 text-3xl font-black tracking-tight text-foreground">
              Join your family
            </Text>

            <Text className="mt-2 max-w-[320px] text-sm leading-5 text-muted">
              Enter the member code shared by your family admin to connect to
              your family space.
            </Text>
          </View>

          {!preview ? (
            <>
              {codeError && (
                <ErrorNotice message={codeError} colors={colors} />
              )}

              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 14,
                  elevation: 2,
                }}
                className="rounded-[26px] border px-5 py-5"
              >
                <View className="mb-5 flex-row items-center">
                  <View
                    style={{ backgroundColor: `${colors.primary}14` }}
                    className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                  >
                    <Ionicons
                      name="key-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-black text-foreground">
                      Enter your member code
                    </Text>

                    <Text className="mt-1 text-xs text-muted">
                      Your code is usually six characters long.
                    </Text>
                  </View>
                </View>

                <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                  Member code
                </Text>

                <TextInput
                  placeholder="A3F9K2"
                  placeholderTextColor={colors.muted}
                  value={code}
                  onChangeText={(value) =>
                    setCode(value.toUpperCase())
                  }
                  autoCapitalize="characters"
                  maxLength={6}
                  editable={!checkingCode}
                  autoCorrect={false}
                  style={{
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }}
                  className="mb-4 rounded-2xl border px-4 py-4 text-center text-lg font-black tracking-[5px]"
                />

                <Pressable
                  onPress={handleCheckCode}
                  disabled={checkingCode}
                  style={({
                    backgroundColor: colors.primary,
                    opacity: checkingCode ? 0.6 : 1,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    elevation: 3,
                  })}
                  className="flex-row items-center justify-center rounded-2xl py-4"
                >
                  {checkingCode ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text className="text-sm font-black text-white">
                        Verify Code
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
            </>
          ) : (
            <>
              {/* Family preview */}
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: `${colors.primary}35`,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 14,
                  elevation: 2,
                }}
                className="mb-5 overflow-hidden rounded-[26px] border"
              >
                <View
                  style={{
                    backgroundColor: `${colors.primary}0C`,
                    borderBottomColor: `${colors.primary}18`,
                  }}
                  className="flex-row items-center border-b px-5 py-4"
                >
                  <View
                    style={{ backgroundColor: colors.primary }}
                    className="h-10 w-10 items-center justify-center rounded-xl"
                  >
                    <Ionicons
                      name="checkmark"
                      size={21}
                      color="#FFFFFF"
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-[1.4px] text-muted">
                      Invitation verified
                    </Text>

                    <Text className="mt-1 text-base font-black text-foreground">
                      You&apos;re invited
                    </Text>
                  </View>
                </View>

                <View className="px-5 py-5">
                  <Text className="text-sm leading-5 text-foreground">
                    Welcome,{' '}
                    <Text className="font-black">
                      {preview?.name}
                    </Text>
                    ! You&apos;re joining{' '}
                    <Text className="font-black">
                      {preview?.family_name}
                    </Text>{' '}
                    as a{' '}
                    <Text className="font-black">
                      {preview?.role}
                    </Text>
                    .
                  </Text>

                  <View className="mt-4 flex-row items-center">
                    <View
                      style={{ backgroundColor: `${colors.primary}12` }}
                      className="rounded-full px-3 py-1.5"
                    >
                      <Text
                        style={{ color: colors.primary }}
                        className="text-[10px] font-black uppercase tracking-wider"
                      >
                        {preview?.family_name}
                      </Text>
                    </View>

                    {/* <Pressable
                      onPress={() => {
                        setPreview(null);
                        setValidationError(null);
                        setError(null);
                      }}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.55 : 1,
                      })}
                      className="ml-auto"
                    >
                      <Text
                        style={{ color: colors.primary }}
                        className="text-xs font-black"
                      >
                        Change code
                      </Text>
                    </Pressable> */}
                  </View>
                </View>
              </View>

              {displayError && (
                <ErrorNotice
                  message={displayError}
                  colors={colors}
                />
              )}

              {/* Account form */}
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 14,
                  elevation: 2,
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
                      Create your account
                    </Text>

                    <Text className="mt-1 text-xs text-muted">
                      Use your email to finish joining.
                    </Text>
                  </View>
                </View>

                <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                  Email address
                </Text>

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
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }}
                  className="mb-4 rounded-2xl border px-4 py-4 text-sm"
                />

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
                  colors={colors}
                />

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
                    Use at least 8 characters. Your email will need to be
                    verified before you can sign in.
                  </Text>
                </View>

                <Pressable
                  onPress={handleJoin}
                  disabled={loading}
                  style={({
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.6 : 1,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    elevation: 3,
                  })}
                  className="flex-row items-center justify-center rounded-2xl py-4"
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="people-outline"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text className="ml-2 text-sm font-black text-white">
                        Join Family
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
            </>
          )}

          {/* Sign-in link */}
          <View className="mt-7 flex-row items-center justify-center">
            <Text className="text-xs font-medium text-muted">
              Already have an account?{' '}
            </Text>

            <Pressable
              onPress={() => router.back()}
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
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
