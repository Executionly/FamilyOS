import { useState } from 'react';
import { ScrollView, Text, View, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useColors } from '@/hooks/use-colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setFamilyName, familyName, nextStep } = useOnboardingStore();

  const [name, setName] = useState(familyName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Please enter your family name');
      return;
    }

    setLoading(true);
    try {
      setFamilyName(name.trim());
      nextStep();
      router.push('/(onboarding)/add-members');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6 py-8">

          {/* Hero */}
          <View className="mb-10 items-center">
            <Text className="text-6xl mb-4">🏡</Text>
            <Text className="text-4xl font-bold text-foreground mb-3 text-center">
              Welcome to Fambound™
            </Text>
            <Text className="text-base text-muted text-center leading-relaxed">
              Your AI Chief of Staff for the whole household. Let's start by giving your family a name.
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Family Name Input */}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Family Name
            </Text>
            <TextInput
              placeholder="e.g. The Johnson"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              editable={!loading}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            />
            <Text className="text-xs text-muted mt-2">
              This is how your family will be identified across the app.
            </Text>
          </View>

          {/* What to expect */}
          <View className="mb-10 bg-primary/10 rounded-lg p-5 border border-primary/20">
            <Text className="text-sm font-semibold text-foreground mb-3">Here's what comes next:</Text>
            <View className="gap-2">
              <Text className="text-sm text-muted">👨‍👩‍👧‍👦  Add your family members</Text>
              <Text className="text-sm text-muted">📜  Build your Family Charter with AI</Text>
              <Text className="text-sm text-muted">🗓  Run your first weekly family meeting</Text>
              <Text className="text-sm text-muted">✅  Start coordinating daily life</Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading}
            className="py-4 items-center bg-primary rounded-lg"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-foreground text-base font-semibold">
                Get Started
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}