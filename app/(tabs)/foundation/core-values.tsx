import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useColors } from '@/hooks/use-colors';

export default function CoreValuesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { draftValues, addValue, removeValue, aiSuggestions, setAISuggestions } = useCharterStore();
  const [valueInput, setValueInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddValue = () => {
    if (!valueInput.trim()) {
      setError('Please enter a value');
      return;
    }
    if (draftValues.length >= 10) {
      setError('Maximum 10 values allowed');
      return;
    }
    addValue(valueInput.trim());
    setValueInput('');
    setError(null);
  };

  const handleGenerateAISuggestions = async () => {
    setError(null);
    setLoading(true);
    try {
      // TODO: Call Supabase Edge Function to generate AI suggestions
      // For now, show placeholder suggestions
      setAISuggestions({
        values: ['Love', 'Honesty', 'Growth', 'Respect', 'Fun'],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (draftValues.length === 0) {
      setError('Please add at least one core value');
      return;
    }
    router.push('./constitution');
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
            <Text className="text-3xl font-bold text-foreground mb-2">Core Values</Text>
            <Text className="text-base text-muted text-center">
              What principles guide your family?
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Add Value Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Add a Value</Text>
            <View className="flex-row gap-2">
              <TextInput
                placeholder="e.g., Honesty, Love, Growth..."
                placeholderTextColor={colors.muted}
                value={valueInput}
                onChangeText={setValueInput}
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
                style={{
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              />
              <Pressable
                onPress={handleAddValue}
                style={{ backgroundColor: colors.primary }}
                className="rounded-lg px-4 py-3 items-center justify-center"
              >
                <Text className="text-base font-semibold text-background">+</Text>
              </Pressable>
            </View>
          </View>

          {/* Values List */}
          {draftValues.length > 0 && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">Your Values</Text>
              <FlatList
                scrollEnabled={false}
                data={draftValues}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View className="flex-row items-center justify-between bg-surface rounded-lg p-3 mb-2 border border-border">
                    <Text className="text-base font-semibold text-foreground">{item}</Text>
                    <Pressable
                      onPress={() => removeValue(index)}
                      className="px-3 py-2"
                    >
                      <Text className="text-base text-error">✕</Text>
                    </Pressable>
                  </View>
                )}
              />
              <Text className="text-xs text-muted mt-2">{draftValues.length}/10 values</Text>
            </View>
          )}

          {/* AI Suggestions */}
          {aiSuggestions.values && aiSuggestions.values.length > 0 && (
            <View className="mb-6 bg-primary/10 rounded-lg p-4 border border-primary/20">
              <Text className="text-sm font-semibold text-foreground mb-3">✨ AI Suggestions</Text>
              <View className="flex-row flex-wrap gap-2">
                {aiSuggestions.values.map((value, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      if (!draftValues.includes(value)) {
                        addValue(value);
                      }
                    }}
                    style={{
                      backgroundColor: draftValues.includes(value) ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    }}
                    className="border rounded-full px-3 py-2"
                  >
                    <Text
                      style={{
                        color: draftValues.includes(value) ? colors.background : colors.foreground,
                      }}
                      className="text-sm font-semibold"
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
            <Text className="text-base font-semibold text-background">Continue to Constitution</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
