import { useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';

export default function OnboardingReadyScreen() {
  const router = useRouter();
  const colors = useColors();
  const { familyName, members, completeOnboarding, reset } = useOnboardingStore();
  const { createFamily } = useFamilyStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartFoundationBuilder = async () => {
  setError(null);
  setLoading(true);

  try {
    if (!user) throw new Error('User not authenticated');

    // Create family in database — capture the returned row, we need its id
    await useFamilyStore.getState().fetchFamilyForUser(user.id);
    const existingFamily = useFamilyStore.getState().family;

    let family = existingFamily;
    if (!family) {
      family = await createFamily(familyName, user.id);

      const { addMember } = useFamilyStore.getState();
      await addMember(family.id, {
        name: user.user_metadata?.full_name || user.email || 'Admin',
        role: 'admin',
        user_id: user.id,
        has_login: true,
      });
      for (const member of members) {
        await addMember(family.id, member);
      }
    }

    // Mark onboarding as complete
    completeOnboarding();

    // Clear onboarding draft state now that it's persisted to Supabase
    reset();

    // Navigate to Foundation Builder
    router.replace('/(tabs)');
  } catch (err) {
    const message =
      (err as any)?.message ||
      (err as any)?.details ||
      (err instanceof Error ? err.message : 'Something went wrong');
    console.error('[OnboardingReady] Failed to save family/members:', err);
    setError(message);
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
            <Text className="text-5xl mb-4">✨</Text>
            <Text className="text-3xl font-bold text-foreground mb-2">You're All Set!</Text>
            <Text className="text-base text-muted text-center">
              Your family is ready to build shared identity
            </Text>
          </View>

          {/* Summary */}
          <View className="mb-8 bg-surface rounded-lg p-6 border border-border">
            <View className="mb-4">
              <Text className="text-xs font-semibold text-muted uppercase mb-1">Family Name</Text>
              <Text className="text-lg font-bold text-foreground">{familyName}</Text>
            </View>

            <View>
              <Text className="text-xs font-semibold text-muted uppercase mb-2">Members</Text>
              {members.map((member, index) => (
                <View key={index} className="flex-row items-center justify-between mb-2">
                  <Text className="text-base text-foreground">{member.name}</Text>
                  <Text className="text-xs text-muted capitalize">{member.role}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Next Steps */}
          <View className="mb-8 bg-primary/10 rounded-lg p-6 border border-primary/20">
            <Text className="text-sm font-semibold text-foreground mb-2">Next Steps:</Text>
            <Text className="text-sm text-muted leading-relaxed">
              1. Complete your Family Charter with AI guidance{'\n'}
              2. Add your family values and constitution{'\n'}
              3. Schedule your first family meeting{'\n'}
              4. Start coordinating your family life
            </Text>
          </View>

          {/* Start Button */}
            <TouchableOpacity
              onPress={handleStartFoundationBuilder}
              disabled={loading}
              className='py-4 items-center bg-primary rounded-lg mb-8'>
                {loading ? (
                  <ActivityIndicator color={"#fff"} />
                ) : (
                  <Text className='text-foreground text-base font-semibold'>
                    Start Foundation Builder
                  </Text>
                )}
            </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
