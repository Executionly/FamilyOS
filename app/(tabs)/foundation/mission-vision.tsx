import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useColors } from '@/hooks/use-colors';

export default function MissionVisionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { draftMission, draftVision, setDraftMission, setDraftVision, aiSuggestions, setAISuggestions,charter } = useCharterStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAISuggestions = async () => {
    setError(null);
    setLoading(true);
    try {
      // TODO: Call Supabase Edge Function to generate AI suggestions
      // For now, show placeholder suggestions
      setAISuggestions({
        mission: 'Our mission is to build a strong, connected family that supports each other through life\'s journey.',
        vision: 'We envision a family where every member feels valued, heard, and empowered to achieve their dreams.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!draftMission.trim() || !draftVision.trim()) {
      setError('Please fill in both Mission and Vision');
      return;
    }
    router.push('./core-values');
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-6 items-center">
            <Text className="text-3xl font-bold text-foreground mb-2">Mission & Vision</Text>
            <Text className="text-base text-muted text-center">
              Define what your family stands for and where you're headed
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Mission Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Family Mission</Text>
            <Text className="text-xs text-muted mb-3">
              What is your family's core purpose? What do you want to be known for?
            </Text>
            <TextInput
              placeholder="e.g., To love, support, and grow together as a family..."
              placeholderTextColor={colors.muted}
              value={charter?.mission}
              onChangeText={setDraftMission}
              multiline
              numberOfLines={4}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Vision Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Family Vision</Text>
            <Text className="text-xs text-muted mb-3">
              What does your ideal family look like in 5-10 years?
            </Text>
            <TextInput
              placeholder="e.g., A family where everyone feels safe, heard, and empowered..."
              placeholderTextColor={colors.muted}
              value={charter?.vision}
              onChangeText={setDraftVision}
              multiline
              numberOfLines={4}
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
          {aiSuggestions.mission && (
            <View className="mb-6 bg-primary/10 rounded-lg p-4 border border-primary/20">
              <Text className="text-sm font-semibold text-foreground mb-3">✨ AI Suggestions</Text>
              
              {aiSuggestions.mission && (
                <View className="mb-3">
                  <Text className="text-xs text-muted mb-1">Suggested Mission:</Text>
                  <Text className="text-sm text-foreground">{aiSuggestions.mission}</Text>
                  <Pressable
                    onPress={() => setDraftMission(aiSuggestions.mission || '')}
                    className="mt-2"
                  >
                    <Text className="text-xs font-semibold text-primary">Use this</Text>
                  </Pressable>
                </View>
              )}

              {aiSuggestions.vision && (
                <View>
                  <Text className="text-xs text-muted mb-1">Suggested Vision:</Text>
                  <Text className="text-sm text-foreground">{aiSuggestions.vision}</Text>
                  <Pressable
                    onPress={() => setDraftVision(aiSuggestions.vision || '')}
                    className="mt-2"
                  >
                    <Text className="text-xs font-semibold text-primary">Use this</Text>
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
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            className="border rounded-lg py-3 items-center mb-4"
          >
            {loading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Text className="text-base font-semibold text-foreground">✨ Get AI Suggestions</Text>
            )}
          </Pressable>

          {/* Continue Button */}
          <Pressable
            onPress={handleContinue}
            style={{ backgroundColor: colors.primary }}
            className="rounded-lg py-4 items-center"
          >
            <Text className="text-base font-semibold text-background">Continue to Values</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
