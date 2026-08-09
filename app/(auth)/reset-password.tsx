import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ScreenContainer } from '@/components/screen-container';
import { Ionicons } from '@expo/vector-icons';


export default function ResetPasswordScreen() {
    const colors = useColors();

    const {
        resetPassword,
        loading,
        error,
        setError,
    } = useAuthStore();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [validationError, setValidationError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
        const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleReset = async () => {
        setValidationError('');
        setError(null);

        if (!password) {
        return setValidationError('Enter a new password');
        }

        if (password.length < 8) {
        return setValidationError(
            'Password must be at least 8 characters'
        );
        }

        if (password !== confirmPassword) {
        return setValidationError(
            'Passwords do not match'
        );
        }

        try {
        await resetPassword(password);

        router.replace('/(auth)/sign-in');
        } catch {}
    };

    const displayError = validationError || error;

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 py-8">

          <View className="items-center mb-8">
            <Text className="text-4xl mb-4">
              🔒
            </Text>

            <Text className="text-3xl font-bold text-foreground mb-2">
              Create New Password
            </Text>

            <Text className="text-muted text-center">
              Your identity has been verified.
              {"\n"}
              Enter a new password below.
            </Text>
          </View>

          {displayError ? (
            <View className="mb-6 rounded-lg bg-error/10 p-4">
              <Text className="text-error font-medium">
                {displayError}
              </Text>
            </View>
          ) : null}

          <View className="mb-5">
            <Text className="mb-2 font-semibold text-foreground">
                New Password
            </Text>

            <View
                style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 8,
                paddingHorizontal: 16,
                }}
            >
                <TextInput
                style={{
                    flex: 1,
                    paddingVertical: 16,
                    color: colors.foreground,
                    fontSize: 16,
                }}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                placeholder="Enter new password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
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

        <View className="mb-8">
            <Text className="mb-2 font-semibold text-foreground">
                Confirm Password
            </Text>

            <View
                style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 8,
                paddingHorizontal: 16,
                }}
            >
                <TextInput
                style={{
                    flex: 1,
                    paddingVertical: 16,
                    color: colors.foreground,
                    fontSize: 16,
                }}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                placeholder="Confirm password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showConfirmPassword}
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
            disabled={loading}
            onPress={handleReset}
            className="items-center rounded-lg bg-primary py-4"
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text className="text-base font-semibold text-white">
                    Update Password
                </Text>
            )}
        </TouchableOpacity>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}