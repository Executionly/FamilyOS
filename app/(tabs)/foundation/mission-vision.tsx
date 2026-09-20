import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useColors } from '@/hooks/use-colors';
import { generateMissionVision, LlmUpgradeRequiredError } from '@/lib/services/charter-ai';
import { useFamilyStore } from '@/lib/stores/family-store';
import { AppHeader } from '@/components/app-header';
import { UpgradePrompt } from '@/components/upgrade-prompt';

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 1,
};

export default function MissionVisionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { draftMission, draftVision, setDraftMission, setDraftVision, aiSuggestions, setAISuggestions, charter } = useCharterStore();
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
      const result = await generateMissionVision(family.id, family?.name || 'Our Family', {
        currentMission: draftMission,
        currentVision: draftVision,
      });
      setAISuggestions({ mission: result.mission, vision: result.vision });
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

  const handleUseMissionSuggestion = () => {
    setDraftMission(aiSuggestions.mission || '');
    setAISuggestions({ mission: undefined, vision: aiSuggestions.vision });
  };

  const handleUseVisionSuggestion = () => {
    setDraftVision(aiSuggestions.vision || '');
    setAISuggestions({ mission: aiSuggestions.mission, vision: undefined });
  };

  const handleContinue = () => {
    if (!draftMission?.trim() || !draftVision?.trim()) {
      setError('Please fill in both Mission and Vision');
      return;
    }
    router.push('./core-values');
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Mission & Vision" showBack />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 px-5 py-6">
          {/* Hero Header */}
          <View style={[SHADOW, { borderRadius: 28 }]} className="mb-6 overflow-hidden">
            <LinearGradient
              colors={[colors.primary, colors.primary + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 24, paddingVertical: 28 }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: -40,
                  left: -20,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              />

              <View
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                className="w-14 h-14 rounded-2xl items-center justify-center mb-5"
              >
                <Ionicons name="compass-outline" size={26} color="#FFFFFF" />
              </View>

              <Text className="text-[26px] font-extrabold text-white mb-1.5">
                Mission & Vision
              </Text>
              <Text
                style={{ color: 'rgba(255,255,255,0.88)' }}
                className="text-sm leading-relaxed pr-4"
              >
                Define what your family stands for and where you're headed
              </Text>
            </LinearGradient>
          </View>

          {/* Error Message */}
          {error && (
            <View
              style={{ backgroundColor: colors.error + '14', borderColor: colors.error + '40' }}
              className="mb-6 p-4 rounded-2xl border flex-row items-center"
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={{ color: colors.error }} className="text-sm font-medium ml-2.5 flex-1">
                {error}
              </Text>
            </View>
          )}

          {/* Mission Section */}
          <View
            style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
            className="mb-4 rounded-2xl p-5 border"
          >
            <View className="flex-row items-center mb-2">
              <View
                style={{ backgroundColor: colors.primary + '14' }}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
              >
                <Ionicons name="flag-outline" size={15} color={colors.primary} />
              </View>
              <Text className="text-sm font-bold text-foreground">Family Mission</Text>
            </View>
            <Text className="text-xs text-muted mb-3 leading-relaxed pl-[42px]">
              What is your family's core purpose? What do you want to be known for?
            </Text>
            <TextInput
              placeholder="e.g., To love, support, and grow together as a family..."
              placeholderTextColor={colors.muted}
              value={draftMission || charter?.mission}
              onChangeText={setDraftMission}
              multiline
              numberOfLines={4}
              className="rounded-xl px-4 py-3 text-base border"
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Vision Section */}
          <View
            style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
            className="mb-6 rounded-2xl p-5 border"
          >
            <View className="flex-row items-center mb-2">
              <View
                style={{ backgroundColor: colors.primary + '14' }}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
              >
                <Ionicons name="telescope-outline" size={15} color={colors.primary} />
              </View>
              <Text className="text-sm font-bold text-foreground">Family Vision</Text>
            </View>
            <Text className="text-xs text-muted mb-3 leading-relaxed pl-[42px]">
              What does your ideal family look like in 5-10 years?
            </Text>
            <TextInput
              placeholder="e.g., A family where everyone feels safe, heard, and empowered..."
              placeholderTextColor={colors.muted}
              value={draftVision || charter?.vision}
              onChangeText={setDraftVision}
              multiline
              numberOfLines={4}
              className="rounded-xl px-4 py-3 text-base border"
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* AI Suggestions */}
          {(aiSuggestions.mission || aiSuggestions.vision) && (
            <View
              style={[SHADOW, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '30' }]}
              className="mb-6 rounded-2xl p-5 border"
            >
              <View className="flex-row items-center mb-4">
                <View
                  style={{ backgroundColor: colors.primary }}
                  className="w-8 h-8 rounded-full items-center justify-center mr-2.5"
                >
                  <Ionicons name="sparkles" size={15} color={colors.background} />
                </View>
                <Text style={{ color: colors.primary }} className="text-xs font-bold tracking-wider">
                  AI SUGGESTIONS
                </Text>
              </View>

              {aiSuggestions.mission && (
                <View
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-xl p-4 border mb-3"
                >
                  <Text className="text-xs font-semibold text-muted mb-1.5">Suggested Mission</Text>
                  <Text className="text-sm text-foreground leading-relaxed mb-3">
                    {aiSuggestions.mission}
                  </Text>
                  <Pressable
                    onPress={handleUseMissionSuggestion}
                    style={({ pressed }) => [
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                    className="self-start rounded-full px-4 py-2 flex-row items-center"
                  >
                    <Ionicons name="checkmark" size={13} color={colors.background} style={{ marginRight: 5 }} />
                    <Text className="text-xs font-bold text-background">Use this</Text>
                  </Pressable>
                </View>
              )}

              {aiSuggestions.vision && (
                <View
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-xl p-4 border"
                >
                  <Text className="text-xs font-semibold text-muted mb-1.5">Suggested Vision</Text>
                  <Text className="text-sm text-foreground leading-relaxed mb-3">
                    {aiSuggestions.vision}
                  </Text>
                  <Pressable
                    onPress={handleUseVisionSuggestion}
                    style={({ pressed }) => [
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                    className="self-start rounded-full px-4 py-2 flex-row items-center"
                  >
                    <Ionicons name="checkmark" size={13} color={colors.background} style={{ marginRight: 5 }} />
                    <Text className="text-xs font-bold text-background">Use this</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Generate AI Button */}
          <Pressable
            onPress={handleGenerateAISuggestions}
            disabled={loading}
            style={({ pressed }) => [
              { backgroundColor: colors.surface, borderColor: colors.primary + '40' },
              pressed && { opacity: 0.7 },
            ]}
            className="border rounded-2xl py-4 items-center mb-4 flex-row justify-center"
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={17} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.primary }} className="text-base font-bold">
                  Get AI Suggestions
                </Text>
              </>
            )}
          </Pressable>

          {/* Continue Button */}
          <Pressable onPress={handleContinue}>
            {({ pressed }) => (
              <View style={[SHADOW, { opacity: pressed ? 0.9 : 1, borderRadius: 18 }]} className="overflow-hidden">
                <LinearGradient
                  colors={[colors.primary, colors.primary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  
                >
                  <View className="py-4 items-center flex-row justify-center">
                    <Text className="text-base font-bold text-background mr-2">Continue to Values</Text>
                    <Ionicons name="arrow-forward" size={17} color={colors.background} />
                  </View>
                </LinearGradient>
              </View>
            )}
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