import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const {forgotPassword} = useAuthStore()
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return false;
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    setError("");
    return true;
  };

  const handleContinue = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      await forgotPassword(email)

      router.push(`/verify-email?email=${email}&source=reset-password`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-6">

          {/* Header */}

          <Pressable
            onPress={() => router.back()}
            className="mt-2 h-11 w-11 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.foreground}
            />
          </Pressable>

          <View className="mt-10">
            <Text className="text-3xl font-bold text-foreground">
              Forgot Password
            </Text>

            <Text className="mt-3 text-base leading-6 text-muted">
              Enter the email associated with your Fambound account and we'll
              send you a verification code to reset your password.
            </Text>
          </View>

          {/* Form */}

          <View className="mt-12">

            <Text className="mb-2 text-sm font-medium text-foreground">
              Email Address
            </Text>

            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError("");
              }}
              placeholder="john@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              className="rounded-2xl border border-border bg-surface px-4 py-4 text-base text-foreground"
            />

            {!!error && (
              <Text className="mt-2 text-sm text-error">
                {error}
              </Text>
            )}
          </View>

          <View className="flex-1" />

          {/* Continue */}

          <TouchableOpacity
            disabled={loading}
            onPress={handleContinue}
            className={`items-center rounded-lg py-4 bg-primary`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Continue
              </Text>
            )}
          </TouchableOpacity>

          <View className="mb-6 mt-5 flex-row justify-center">
            <Text className="text-muted">
              Remember your password?
            </Text>

            <Pressable
              className="ml-2"
              onPress={() => router.replace("/(auth)/sign-in")}
            >
              <Text className="font-semibold text-primary">
                Sign In
              </Text>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}