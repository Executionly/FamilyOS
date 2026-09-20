import { useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, Share, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';
import { AppHeader } from '@/components/app-header';
import { isAdminAccess } from '@/utils';

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

export default function CharterPreviewScreen() {
  const router = useRouter();
  const colors = useColors();
  const { draftMission, draftVision, draftValues, updateCharter, draftConstitution, createCharter, clearDrafts, charter } = useCharterStore();
  const { family, currentMember } = useFamilyStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditor = isAdminAccess(currentMember?.role)

  const mission = draftMission ? draftMission : charter?.mission;
  const vision = draftVision ? draftVision : charter?.vision;
  const values = draftValues?.length > 0 ? draftValues : charter?.values;
  const constitution = draftConstitution ?? charter?.constitution;

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

  const sections = [
    {
      key: 'mission',
      icon: 'flag-outline' as const,
      label: 'MISSION',
      content: mission,
    },
    {
      key: 'vision',
      icon: 'telescope-outline' as const,
      label: 'VISION',
      content: vision,
    },
  ];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Charter" showBack />
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
                <Ionicons name="document-text-outline" size={26} color="#FFFFFF" />
              </View>

              <Text className="text-[26px] font-extrabold text-white mb-1.5">
                Your Family Charter
              </Text>
              <Text
                style={{ color: 'rgba(255,255,255,0.88)' }}
                className="text-sm leading-relaxed pr-4"
              >
                Review your charter before saving
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

          {/* Mission & Vision */}
          {sections.map((section) => (
            <View
              key={section.key}
              style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
              className="mb-4 rounded-2xl p-5 border"
            >
              <View className="flex-row items-center mb-3">
                <View
                  style={{ backgroundColor: colors.primary + '14' }}
                  className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
                >
                  <Ionicons name={section.icon} size={15} color={colors.primary} />
                </View>
                <Text style={{ color: colors.primary }} className="text-xs font-bold tracking-wider">
                  {section.label}
                </Text>
              </View>
              <Text className="text-base text-foreground leading-relaxed">{section.content}</Text>
            </View>
          ))}

          {/* Values Section */}
          <View
            style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
            className="mb-4 rounded-2xl p-5 border"
          >
            <View className="flex-row items-center mb-4">
              <View
                style={{ backgroundColor: colors.primary + '14' }}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
              >
                <Ionicons name="diamond-outline" size={15} color={colors.primary} />
              </View>
              <Text style={{ color: colors.primary }} className="text-xs font-bold tracking-wider">
                CORE VALUES
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {values?.map((value, index) => (
                <View
                  key={index}
                  style={{ backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' }}
                  className="rounded-full px-3.5 py-2 border flex-row items-center"
                >
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary} style={{ marginRight: 5 }} />
                  <Text style={{ color: colors.primary }} className="text-sm font-semibold">
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Constitution Section */}
          <View
            style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
            className="mb-6 rounded-2xl p-5 border"
          >
            <View className="flex-row items-center mb-3">
              <View
                style={{ backgroundColor: colors.primary + '14' }}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
              >
                <Ionicons name="scale-outline" size={15} color={colors.primary} />
              </View>
              <Text style={{ color: colors.primary }} className="text-xs font-bold tracking-wider">
                CONSTITUTION
              </Text>
            </View>
            <Text className="text-base text-foreground leading-relaxed">{constitution}</Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            {/* Save Button */}
            {isEditor && (
              <TouchableOpacity onPress={handleSaveCharter} disabled={loading} activeOpacity={0.85}>
                <View style={[SHADOW, { borderRadius: 18 }]} className="overflow-hidden">
                  <LinearGradient
                    colors={[colors.primary, colors.primary + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    
                  >
                    <View className="py-4 items-center flex-row justify-center">
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name={charter?.id ? 'cloud-upload-outline' : 'save-outline'}
                            size={18}
                            color="#fff"
                            style={{ marginRight: 8 }}
                          />
                          <Text className="text-white text-base font-bold">
                            {charter?.id ? 'Update' : 'Save'} Charter
                          </Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            )}

            {/* Share Button */}
            <Pressable
              onPress={handleShare}
              disabled={loading}
              style={({ pressed }) => [
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
              className="border rounded-2xl py-4 items-center flex-row justify-center"
            >
              <Ionicons
                name="share-social-outline"
                size={18}
                color={colors.foreground}
                style={{ marginRight: 8 }}
              />
              <Text className="text-base font-semibold text-foreground">Share Charter</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}