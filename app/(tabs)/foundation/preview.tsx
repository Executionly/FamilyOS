import { useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, Share, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';
import { AppHeader } from '@/components/app-header';
import { isAdminAccess } from '@/utils';

export default function CharterPreviewScreen() {
  const router = useRouter();
  const colors = useColors();
  const { draftMission, draftVision, draftValues, updateCharter, draftConstitution, createCharter, clearDrafts,charter } = useCharterStore();
  const { family, currentMember } = useFamilyStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditor = isAdminAccess(currentMember?.role)

  const handleSaveCharter = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!family || !user) {
        throw new Error('Family or user not found');
      }

      const charterData = {
        mission: draftMission,
        vision: draftVision,
        values: draftValues,
        constitution: draftConstitution,
      };

      if (charter?.id) {
        await updateCharter(charter.id, charterData);
      } else {
        await createCharter(family.id, charterData);
      }

      clearDrafts();
      router.replace('/(tabs)/foundation');
    } catch (err) {
      console.log('Error saving charter:', err);
      const message = err instanceof Error ? err.message : 'Failed to save charter';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const charterText = `${family?.name} Family Charter

Mission:
${draftMission}

Vision:
${draftVision}

Core Values:
${draftValues.join(', ')}

Constitution:
${draftConstitution}`;

      await Share.share({
        message: charterText,
        title: `${family?.name} Family Charter`,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Charter" showBack />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-6 items-center">
            <Text className="text-3xl font-bold text-foreground mb-2">Your Family Charter</Text>
            <Text className="text-base text-muted text-center">
              Review your charter before saving
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Mission Section */}
          <View className="mb-6 bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm font-semibold text-primary mb-2">MISSION</Text>
            <Text className="text-base text-foreground leading-relaxed">{draftMission ? draftMission : charter?.mission}</Text>
          </View>

          {/* Vision Section */}
          <View className="mb-6 bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm font-semibold text-primary mb-2">VISION</Text>
            <Text className="text-base text-foreground leading-relaxed">{draftVision ? draftVision : charter?.vision}</Text>
          </View>

          {/* Values Section */}
          <View className="mb-6 bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm font-semibold text-primary mb-3">CORE VALUES</Text>
            <View className="flex-row flex-wrap gap-2">
              {(draftValues?.length > 0 ? draftValues : charter?.values)?.map((value, index) => (
                <View
                  key={index}
                  style={{ backgroundColor: colors.primary }}
                  className="rounded-full px-3 py-1"
                >
                  <Text className="text-sm font-semibold text-background">{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Constitution Section */}
          <View className="mb-6 bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm font-semibold text-primary mb-2">CONSTITUTION</Text>
            <Text className="text-base text-foreground leading-relaxed">{draftConstitution ?? charter?.constitution}</Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            {/* Save Button */}

            {isEditor && <TouchableOpacity
            onPress={handleSaveCharter}
            disabled={loading}
            className='py-4 items-center bg-primary rounded-lg mb-2'>
              {loading ? (
                <ActivityIndicator color={"#fff"} />
              ) : (
                <Text className='text-white text-base font-semibold'>
                  {charter?.id ? "Update" : "Save"} Charter
                </Text>
              )}
            </TouchableOpacity>}

            {/* Share Button */}
            <Pressable
              onPress={handleShare}
              disabled={loading}
              style={({ pressed }) => [
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
              className="border rounded-lg py-4 items-center"
            >
              <Text className="text-base font-semibold text-foreground">Share Charter</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
