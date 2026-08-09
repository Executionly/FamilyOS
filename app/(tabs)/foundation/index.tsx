import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';
import { isAdminAccess } from '@/utils';

export default function FoundationBuilderScreen() {
  const router = useRouter();
  const colors = useColors();
  const { charter, fetchCharter, loading: charterLoading } = useCharterStore();
  const { family, currentMember } = useFamilyStore();
  const [loading, setLoading] = useState(true);
  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    const loadCharter = async () => {
      if (family) {
        try {
          await fetchCharter(family.id);
        } catch (err) {
          console.error('Error loading charter:', err);
        }
      }
      setLoading(false);
    };

    loadCharter();
  }, [family, fetchCharter]);

  const handleStartCharter = () => {
    router.push('/(tabs)/foundation/mission-vision');
  };

  const handleEditCharter = () => {
    router.push('/(tabs)/foundation/mission-vision');
  };

  const handleViewCharter = () => {
    router.push('/(tabs)/foundation/preview');
  };

  if (loading || charterLoading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-8 items-center">
            <Text className="text-4xl mb-4">📜</Text>
            <Text className="text-3xl font-bold text-foreground mb-2">Foundation Builder</Text>
            <Text className="text-base text-muted text-center">
              Create your family's shared identity and operating principles
            </Text>
          </View>

          {charter ? (
            // Charter exists
            <>
              {/* Charter Summary */}
              <View className="mb-8 bg-surface rounded-lg p-6 border border-border">
                <Text className="text-sm font-semibold text-primary mb-4">YOUR FAMILY CHARTER</Text>

                <View className="mb-4">
                  <Text className="text-xs text-muted mb-1">Mission</Text>
                  <Text className="text-sm text-foreground leading-relaxed line-clamp-2">
                    {charter.mission}
                  </Text>
                </View>

                <View className="mb-4">
                  <Text className="text-xs text-muted mb-1">Vision</Text>
                  <Text className="text-sm text-foreground leading-relaxed line-clamp-2">
                    {charter.vision}
                  </Text>
                </View>

                <View className="mb-4">
                  <Text className="text-xs text-muted mb-1">Core Values</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {charter.values.slice(0, 3).map((value, index) => (
                      <View
                        key={index}
                        style={{ backgroundColor: colors.primary }}
                        className="rounded-full px-2 py-1"
                      >
                        <Text className="text-xs font-semibold text-background">{value}</Text>
                      </View>
                    ))}
                    {charter.values.length > 3 && (
                      <View
                        style={{ backgroundColor: colors.primary }}
                        className="rounded-full px-2 py-1"
                      >
                        <Text className="text-xs font-semibold text-background">
                          +{charter.values.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="gap-3">
                <Pressable
                  onPress={handleViewCharter}
                  style={{ backgroundColor: colors.primary }}
                  className="rounded-lg py-3 items-center"
                >
                  <Text className="text-base font-semibold text-background">View Full Charter</Text>
                </Pressable>

                {isEditor && <Pressable
                  onPress={handleEditCharter}
                  style={({ pressed }) => [
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  className="border rounded-lg py-3 items-center"
                >
                  <Text className="text-base font-semibold text-foreground">Edit Charter</Text>
                </Pressable>}
              </View>

              {/* Last Updated */}
              <View className="mt-8 items-center">
                <Text className="text-xs text-muted">
                  Last updated {new Date(charter.updated_at).toLocaleDateString()}
                </Text>
              </View>
            </>
          ) : (
            // No charter yet
            <>
              {/* Info Cards */}
              <View className="mb-8 gap-4">
                <View className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                  <Text className="text-sm font-semibold text-foreground mb-2">📝 Mission & Vision</Text>
                  <Text className="text-sm text-muted">
                    Define your family's core purpose and long-term aspirations
                  </Text>
                </View>

                <View className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                  <Text className="text-sm font-semibold text-foreground mb-2">💎 Core Values</Text>
                  <Text className="text-sm text-muted">
                    Identify the principles that guide your family's decisions
                  </Text>
                </View>

                <View className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                  <Text className="text-sm font-semibold text-foreground mb-2">⚖️ Constitution</Text>
                  <Text className="text-sm text-muted">
                    Establish your family's operating rules and commitments
                  </Text>
                </View>
              </View>

              {/* Start Button */}
              {isEditor && <Pressable
                onPress={handleStartCharter}
                style={{ backgroundColor: colors.primary }}
                className="rounded-lg py-3 items-center"
              >
                <Text className="text-base font-semibold text-background">Start Building Charter</Text>
              </Pressable>}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
