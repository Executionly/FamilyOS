import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ScreenContainer } from "@/components/screen-container";
import { AppHeader } from "@/components/app-header";
import { Ionicons } from "@expo/vector-icons";


export default function ChangePasswordScreen() {
  const colors = useColors();

  const { loading, error, setError, changePassword } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [validationError, setValidationError] = useState("");

  const handleSubmit = async () => {
    setValidationError("");
    setError(null);

    if (!currentPassword) {
      return setValidationError("Current password is required.");
    }

    if (newPassword.length < 8) {
      return setValidationError(
        "New password must be at least 8 characters."
      );
    }

    if (newPassword !== confirmPassword) {
      return setValidationError("Passwords do not match.");
    }

    if (currentPassword === newPassword) {
      return setValidationError(
        "New password must be different from current password."
      );
    }

    try {
      await changePassword(currentPassword, newPassword);

      alert("Password changed successfully.");

      router.back();
    } catch {}
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
        <AppHeader title="Change Password" showBack />
        <ScrollView
        className="flex-1"
            contentContainerStyle={{
                padding: 24,
            }}
        >

            {displayError ? (
            <View className="mb-5 rounded-lg border border-error/20 bg-error/10 p-4">
                <Text className="text-error">{displayError}</Text>
            </View>
            ) : null}

            <Text className="mb-2 font-semibold text-foreground">
                Current Password
            </Text>

            <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 10,
                marginBottom: 20,
                paddingHorizontal: 16,
            }}
            >
                <TextInput
                    style={{
                    flex: 1,
                    color: colors.foreground,
                    paddingVertical: 16,
                    }}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showCurrentPassword}
                />

                <TouchableOpacity
                    onPress={() => setShowCurrentPassword((prev) => !prev)}
                >
                    <Ionicons
                    name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.muted}
                    />
                </TouchableOpacity>
            </View>

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
                borderRadius: 10,
                marginBottom: 20,
                paddingHorizontal: 16,
            }}
            >
                <TextInput
                    style={{
                    flex: 1,
                    color: colors.foreground,
                    paddingVertical: 16,
                    }}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showNewPassword}
                />

                <TouchableOpacity
                    onPress={() => setShowNewPassword((prev) => !prev)}
                >
                    <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.muted}
                    />
                </TouchableOpacity>
            </View>

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
                borderRadius: 10,
                marginBottom: 28,
                paddingHorizontal: 16,
            }}
            >
                <TextInput
                    style={{
                    flex: 1,
                    color: colors.foreground,
                    paddingVertical: 16,
                    }}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showConfirmPassword}
                />

                <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                >
                    <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.muted}
                    />
                </TouchableOpacity>
            </View>

        </ScrollView>
        <View className="px-6 mb-12">
            <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="items-center rounded-lg bg-primary py-4"
            >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text className="text-base font-semibold text-white">
                Change Password
                </Text>
            )}
            </TouchableOpacity>
        </View>
    </ScreenContainer>
  );
}