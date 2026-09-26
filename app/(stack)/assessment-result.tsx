import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AgeGroup,
  AssessmentDimension,
  ProductivityEnergy,
  TemperamentType,
} from '@/types';
import { useColors } from '@/hooks/use-colors';
import {
  PRODUCTIVITY_ENERGY_CONTENT,
  TEMPERAMENT_CONTENT,
} from '@/lib/result-content';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useAssessmentStore } from '@/lib/stores/assessment-store';


export default function AssessmentResultScreen() {
    const insets = useSafeAreaInsets()
  const { dimension, resultType, ageGroup, sessionId } = useLocalSearchParams<{
    dimension: AssessmentDimension;
    resultType: string;
    sessionId: string;
    ageGroup: AgeGroup;
  }>();

  const router = useRouter();
  const colors = useColors();
  const { fetchMembers, family } = useFamilyStore();
  const { submitChildFeedback } = useAssessmentStore();
   const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const content =
    dimension === 'temperament'
      ? TEMPERAMENT_CONTENT[resultType as TemperamentType]
      : PRODUCTIVITY_ENERGY_CONTENT[resultType as ProductivityEnergy];

  if (!content) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <AppHeader title="Result" showBack={false} />

        <View className="flex-1 items-center justify-center px-6">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="w-full items-center rounded-3xl border px-6 py-8"
          >
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={colors.primary}
              />
            </View>

            <Text className="text-center text-base font-black text-foreground">
              Result unavailable
            </Text>

            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              We could not load this result. Please try the assessment again.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const isTemperament = dimension === 'temperament';
  const heading = isTemperament
    ? 'Your Temperament'
    : 'Your Productivity Energy';

  const category = isTemperament ? 'PERSONALITY PATTERN' : 'WORKING STYLE';
  const icon = isTemperament ? 'compass-outline' : 'flash-outline';

  const isChild = ageGroup === 'child';
 
  const handleFeedback = async (feltAccurate: boolean) => {
    setFeedbackGiven(feltAccurate);
    if (sessionId) await submitChildFeedback(sessionId, feltAccurate);
  };

  const handleDone = () => {
    if (family?.id) {
      fetchMembers(family.id);
    }

    router.replace('/(stack)/my-profile');
  };

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Result" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 32,
        }}
      >
        {/* Result hero */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 3,
          }}
          className="mb-5 overflow-hidden rounded-[28px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}0C`,
              borderBottomColor: `${colors.primary}18`,
            }}
            className="items-center border-b px-5 pb-7 pt-7"
          >
            <View
              style={{
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 5,
              }}
              className="mb-5 h-[70px] w-[70px] items-center justify-center rounded-[22px]"
            >
              <Ionicons name={icon} size={34} color="#FFFFFF" />
            </View>

            <Text className="text-[10px] font-bold uppercase tracking-[1.7px] text-muted">
              {category}
            </Text>

            <Text className="mt-2 text-center text-3xl font-black tracking-tight text-foreground">
              {content.label}
            </Text>

            <View
              style={{
                backgroundColor: `${colors.primary}15`,
                borderColor: `${colors.primary}28`,
              }}
              className="mt-4 flex-row items-center rounded-full border px-3 py-1.5"
            >
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />

              <Text
                style={{ color: colors.primary }}
                className="ml-1.5 text-[10px] font-black uppercase tracking-wider"
              >
                Assessment complete
              </Text>
            </View>
          </View>

          <View className="px-5 py-5">
            <Text className="text-sm leading-6 text-foreground">
              {content.summary}
            </Text>
          </View>
        </View>

        {/* Strengths */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          }}
          className="mb-4 overflow-hidden rounded-[24px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}08`,
              borderBottomColor: `${colors.primary}15`,
            }}
            className="flex-row items-center border-b px-5 py-4"
          >
            <View
              style={{ backgroundColor: `${colors.primary}15` }}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="sparkles-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View className="ml-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-muted">
                Your advantage
              </Text>

              <Text className="mt-0.5 text-base font-black text-foreground">
                My Strengths
              </Text>
            </View>
          </View>

          <View className="gap-3 px-5 py-5">
            {content.strengths.map((strength, index) => (
              <View key={index} className="flex-row items-start">
                <View
                  style={{ backgroundColor: colors.primary }}
                  className="mt-1.5 mr-3 h-1.5 w-1.5 rounded-full"
                />

                <Text className="flex-1 text-sm leading-5 text-foreground">
                  {strength}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Practical insights */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          }}
          className="mb-6 overflow-hidden rounded-[24px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}08`,
              borderBottomColor: `${colors.primary}15`,
            }}
            className="flex-row items-center border-b px-5 py-4"
          >
            <View
              style={{ backgroundColor: `${colors.primary}15` }}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="layers-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View className="ml-3">
              <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-muted">
                Practical perspective
              </Text>

              <Text className="mt-0.5 text-base font-black text-foreground">
                How this shows up
              </Text>
            </View>
          </View>

          <View className="gap-5 px-5 py-5">
            <InsightRow
              icon="add-circle-outline"
              label="How I may contribute"
              value={content.howIMayContribute}
              colors={colors}
            />

            <InsightRow
              icon="briefcase-outline"
              label="How I may prefer to work"
              value={content.howIMayPreferToWork}
              colors={colors}
            />

            <InsightRow
              icon="hand-left-outline"
              label="What I may need from others"
              value={content.whatIMayNeedFromOthers}
              colors={colors}
            />

            <InsightRow
              icon="trending-up-outline"
              label="Growth opportunity"
              value={content.growthOpportunity}
              colors={colors}
            />
          </View>
        </View>

        {isChild && (
          <View
            className="mb-6 items-center rounded-xl border border-border p-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text className="mb-3 text-center text-base font-semibold text-foreground">
              Does that sound like you?
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleFeedback(true)}
                className="flex-1 items-center rounded-xl px-4 py-3"
                style={{
                  backgroundColor: feedbackGiven === true ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: feedbackGiven === true ? '#fff' : colors.foreground }}
                >
                  That sounds like me!
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleFeedback(false)}
                className="flex-1 items-center rounded-xl px-4 py-3"
                style={{
                  backgroundColor: feedbackGiven === false ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: feedbackGiven === false ? '#fff' : colors.foreground }}
                >
                  Not really
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Completion action */}
        <View
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}>
            <Pressable
            onPress={handleDone}
            style={({
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.22,
                shadowRadius: 12,
                elevation: 4,
            })}
            className="flex-row items-center justify-center rounded-2xl py-4"
            >
            <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />

            <Text className="ml-2 text-sm font-black text-white">
                Done
            </Text>

            <Ionicons
                name="arrow-forward"
                size={16}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
            />
            </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InsightRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View className="flex-row items-start">
      <Ionicons
        name={icon}
        size={18}
        color={colors.primary}
        style={{ marginTop: 2, marginRight: 11 }}
      />

      <View className="flex-1">
        <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-muted">
          {label}
        </Text>

        <Text className="mt-1 text-sm leading-5 text-foreground">
          {value}
        </Text>
      </View>
    </View>
  );
}
