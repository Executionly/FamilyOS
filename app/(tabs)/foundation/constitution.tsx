import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useColors } from '@/hooks/use-colors';
import { generateConstitution, LlmUpgradeRequiredError } from '@/lib/services/charter-ai';
import { useFamilyStore } from '@/lib/stores/family-store';
import { AppHeader } from '@/components/app-header';
import { UpgradePrompt } from '@/components/upgrade-prompt';

export default function ConstitutionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { charter, draftValues, draftConstitution, setDraftConstitution, aiSuggestions, setAISuggestions } = useCharterStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { family } = useFamilyStore();
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'quota_exceeded'>('ai_feature');


  const handleGenerateAISuggestions = async () => {
    if (!family?.id) return;
    setError(null);
    setLoading(true);
    try {
      const result = await generateConstitution(family.id, family?.name || 'Our Family', {
        currentConstitution: draftConstitution,
        mission: charter?.mission,
        values: draftValues,
      });
      setAISuggestions({ constitution: result.constitution });
    } catch (err) {
      if (err instanceof LlmUpgradeRequiredError) {
        setUpgradeReason(err.reason ?? 'ai_feature');
        setUpgradePromptVisible(true);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!draftConstitution?.trim()) {
      setError('Please fill in your Family Constitution');
      return;
    }
    router.push('./preview');
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Constitution" showBack />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-6 items-center">
            <Text className="text-3xl font-bold text-foreground mb-2">Family Constitution</Text>
            <Text className="text-base text-muted text-center">
              How will your family operate? What are your family rules and commitments?
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Constitution Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Family Constitution</Text>
            <Text className="text-xs text-muted mb-3">
              Write your family's operating principles, rules, and commitments
            </Text>
            <TextInput
              placeholder="e.g., We communicate with honesty and respect. We support each other..."
              placeholderTextColor={colors.muted}
              value={draftConstitution}
              onChangeText={setDraftConstitution}
              multiline
              numberOfLines={8}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* AI Suggestions */}
          {aiSuggestions.constitution && (
            <View className="mb-6 bg-primary/10 rounded-lg p-4 border border-primary/20">
              <Text className="text-sm font-semibold text-foreground mb-3">✨ AI Suggestion</Text>
              <Text className="text-sm text-foreground mb-3 leading-relaxed">{aiSuggestions.constitution}</Text>
              <Pressable
                onPress={() => setDraftConstitution(aiSuggestions.constitution || '')}
                style={{ backgroundColor: colors.primary }}
                className="rounded-lg py-2 items-center"
              >
                <Text className="text-sm font-semibold text-background">Use this</Text>
              </Pressable>
            </View>
          )}

          {/* Generate AI Button */}
          <Pressable
            onPress={handleGenerateAISuggestions}
            disabled={loading}
            style={({ pressed }) => [
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            className="border rounded-lg py-3 items-center mb-4"
          >
            {loading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Text className="text-base font-semibold text-foreground">✨ Get AI Suggestion</Text>
            )}
          </Pressable>

          {/* Continue Button */}
          <Pressable
            onPress={handleContinue}
            style={{ backgroundColor: colors.primary }}
            className="rounded-lg py-4 items-center"
          >
            <Text className="text-base font-semibold text-background">Review & Save Charter</Text>
          </Pressable>
        </View>
      </ScrollView>

      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        reason={upgradeReason}
      />
    </ScreenContainer>
  );
}
