import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';

type PasswordFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  colors: any;
};

function PasswordField({
  label,
  value,
  placeholder,
  visible,
  onChangeText,
  onToggleVisibility,
  colors,
}: PasswordFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
        {label}
      </Text>

      <View
        style={{
          backgroundColor: colors.surface,
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
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
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
          hitSlop={10}
          style={({ pressed }) => ({
            opacity: pressed ? 0.55 : 1,
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

export default function ChangePasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { loading, error, setError, changePassword } =
    useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async () => {
    setValidationError('');
    setError(null);

    if (!currentPassword) {
      setValidationError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setValidationError(
        'New password must be at least 8 characters.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setValidationError(
        'New password must be different from current password.',
      );
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);

      alert('Password changed successfully.');
      router.back();
    } catch {
      // Store error is already handled by useAuthStore.
    }
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Change Password" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        {/* Page introduction */}
        <View className="mb-5 flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
              Account security
            </Text>

            <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Change password
            </Text>

            <Text className="mt-1 text-xs font-medium leading-5 text-muted">
              Use a strong password to keep your family space secure.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: `${colors.primary}14`,
              borderColor: `${colors.primary}28`,
            }}
            className="ml-4 h-12 w-12 items-center justify-center rounded-2xl border"
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={23}
              color={colors.primary}
            />
          </View>
        </View>

        {displayError ? (
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
        ) : null}

        {/* Form card */}
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
                Password details
              </Text>

              <Text className="mt-1 text-xs text-muted">
                Confirm your current password, then choose a new one.
              </Text>
            </View>
          </View>

          <PasswordField
            label="Current password"
            value={currentPassword}
            placeholder="Enter current password"
            visible={showCurrentPassword}
            onChangeText={setCurrentPassword}
            onToggleVisibility={() =>
              setShowCurrentPassword((previous) => !previous)
            }
            colors={colors}
          />

          <PasswordField
            label="New password"
            value={newPassword}
            placeholder="Minimum 8 characters"
            visible={showNewPassword}
            onChangeText={setNewPassword}
            onToggleVisibility={() =>
              setShowNewPassword((previous) => !previous)
            }
            colors={colors}
          />

          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            placeholder="Re-enter new password"
            visible={showConfirmPassword}
            onChangeText={setConfirmPassword}
            onToggleVisibility={() =>
              setShowConfirmPassword((previous) => !previous)
            }
            colors={colors}
          />

          {/* Password requirements */}
          <View
            style={{
              backgroundColor: `${colors.primary}08`,
              borderColor: `${colors.primary}20`,
            }}
            className="mt-1 rounded-2xl border px-4 py-3.5"
          >
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.primary}
              />

              <Text className="ml-2 flex-1 text-xs leading-5 text-muted">
                Your new password must be at least 8 characters and different
                from your current password.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save action */}
      <View
        className="px-4 pt-2"
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({
            backgroundColor: colors.primary,
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
                name="shield-checkmark-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text className="ml-2 text-sm font-black text-white">
                Change Password
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
