import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useColors } from '@/hooks/use-colors';

export default function InviteCoparentScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setCoparentEmail, nextStep } = useOnboardingStore();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const handleInvite = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      setCoparentEmail(email);
      nextStep();
      router.push('/(onboarding)/ready');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      setSkipped(true);
      nextStep();
      router.push('/(onboarding)/ready');
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
          {/* Header */}
          <View className="mb-8 items-center">
            <Text className="text-3xl font-bold text-foreground mb-2">Invite Co-Parent</Text>
            <Text className="text-base text-muted text-center">
              Invite your co-parent to FamilyOS (optional)
            </Text>
          </View>

          {/* Description */}
          <View className="mb-8 bg-surface rounded-lg p-6">
            <Text className="text-sm text-muted leading-relaxed">
              Your co-parent will receive an invitation email to join your family and collaborate on family leadership.
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Co-Parent Email</Text>
            <TextInput
              placeholder="coparent@example.com"
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

          {/* Invite Button */}
           <TouchableOpacity
            onPress={handleInvite}
            disabled={loading}
          className='py-4 items-center bg-primary rounded-lg mb-8'>
              {loading ? (
                <ActivityIndicator color={"#fff"} />
              ) : (
                <Text className='text-foreground text-base font-semibold'>
                  Send Invitation
                </Text>
              )}
          </TouchableOpacity>

          {/* Skip Button */}
          <Pressable
            onPress={handleSkip}
            disabled={loading}
            style={({ pressed }) => [
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            className="border rounded-lg py-4 items-center"
          >
            <Text className="text-base font-semibold text-foreground">Skip for Now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
