import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AgeGroup, AssessmentDimension } from '@/types';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAssessmentStore } from '@/lib/stores/assessment-store';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';

function resolveAgeGroup(ageBand: string | undefined): AgeGroup {
  if (ageBand && ['toddler', 'child', 'preteen'].includes(ageBand)) {
    return 'child';
  }

  return 'adult';
}

const DIMENSION_TITLE: Record<AssessmentDimension, string> = {
  temperament: 'Temperament',
  productivity_energy: 'Productivity Energy',
};

export default function AssessmentScreen() {
  const { memberId, dimension } = useLocalSearchParams<{
    memberId: string;
    dimension: AssessmentDimension;
  }>();

  const router = useRouter();
  const colors = useColors();

  const { members, family, fetchMembers } = useFamilyStore();

  const {
    questions,
    session,
    loading,
    fetchQuestions,
    fetchActiveSession,
    startAssessment,
    answerQuestion,
    completeAssessment,
  } = useAssessmentStore();

  const [initializing, setInitializing] = useState(true);
  const member = members.find((m) => m.id === memberId);
  const ageGroup = resolveAgeGroup(member?.age_band);

  const assessmentTitle =
    DIMENSION_TITLE[dimension] ?? 'Assessment';

  useEffect(() => {
    const init = async () => {
      if (!member || !family || !dimension) return;

      const ageGroup = resolveAgeGroup(member.age_band);

      await fetchQuestions(dimension, ageGroup);

      const existing = await fetchActiveSession(member.id, dimension);

      if (!existing) {
        await startAssessment(
          member.id,
          family.id,
          dimension,
          ageGroup,
        );
      }

      setInitializing(false);
    };

    init();
  }, [memberId, dimension]);

  if (initializing || loading || !session) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <AppHeader title={assessmentTitle} showBack />

        <View className="flex-1 items-center justify-center">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="items-center rounded-3xl border px-8 py-7"
          >
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-4 h-12 w-12 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="sparkles-outline"
                size={23}
                color={colors.primary}
              />
            </View>

            <ActivityIndicator color={colors.primary} />

            <Text className="mt-4 text-sm font-black text-foreground">
              Preparing your assessment
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Just a moment
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const orderedQuestions = session.question_ids
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as typeof questions;

  const currentQuestion = orderedQuestions[session.current_index];

  const progress = orderedQuestions.length
    ? Math.round(
        (session.current_index / orderedQuestions.length) * 100,
      )
    : 0;

  const handleSelect = async (optionIndex: number) => {
    if (!currentQuestion) return;

    await answerQuestion({
      question_id: currentQuestion.id,
      selected_option_index: optionIndex,
    });

    const isLastQuestion =
      session.current_index + 1 >= orderedQuestions.length;

    if (isLastQuestion) {
      const { resultType } = await completeAssessment();

      if (family?.id) {
        fetchMembers(family.id);
      }

      router.replace(
        `/(stack)/assessment-result?dimension=${dimension}&resultType=${resultType}&sessionId=${session.id}&ageGroup=${ageGroup}`,
      );
    }
  };

  if (!currentQuestion) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <AppHeader title={assessmentTitle} showBack />

        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

    const OPTION_EMOJI = ['🌟', '🚀', '🎈', '🧩'];

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title={assessmentTitle} showBack />

      <View className="flex-1 px-5 pt-5">
        {/* Assessment status */}
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted">
              {dimension === 'temperament'
                ? 'Personal profile'
                : 'Working style'}
            </Text>

            <Text className="mt-1 text-base font-black text-foreground">
              Discover your pattern
            </Text>
          </View>

          <View
            style={{
              backgroundColor: `${colors.primary}14`,
              borderColor: `${colors.primary}28`,
            }}
            className="rounded-full border px-3 py-1.5"
          >
            <Text
              style={{ color: colors.primary }}
              className="text-[10px] font-black"
            >
              {progress}%
            </Text>
          </View>
        </View>

        {/* Progress track */}
        <View className="mb-7">
          <View
            style={{ backgroundColor: colors.border }}
            className="h-2 w-full overflow-hidden rounded-full"
          >
            <View
              style={{
                width: `${Math.max(progress, 5)}%`,
                backgroundColor: colors.primary,
              }}
              className="h-full rounded-full"
            />
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold text-muted">
              Question {session.current_index + 1} of{' '}
              {orderedQuestions.length}
            </Text>

            <Text className="text-[11px] font-semibold text-muted">
              Choose one answer
            </Text>
          </View>
        </View>

        {/* Question card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 7 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
            elevation: 3,
          }}
          className="mb-5 overflow-hidden rounded-[26px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}0C`,
              borderBottomColor: `${colors.primary}18`,
            }}
            className="flex-row items-center border-b px-5 py-4"
          >
            <View
              style={{ backgroundColor: colors.primary }}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#FFFFFF"
              />
            </View>

            <Text className="ml-3 text-[10px] font-black uppercase tracking-[1.4px] text-muted">
              Your perspective
            </Text>
          </View>

          <View className="px-5 py-6">
            <Text 
            className={ageGroup === 'child' ? 'text-[26px] font-black leading-9 tracking-tight text-foreground' : 'text-[22px] font-black leading-8 tracking-tight text-foreground'}>
              {currentQuestion.question}
            </Text>
          </View>
        </View>

        {/* Answer options */}
        <View className="gap-3">
          {currentQuestion.options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => handleSelect(index)}
              style={[
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 4,
                  },
                  shadowOpacity: 0.06,
                  shadowRadius: 9,
                  elevation: 2,
                  transform: [{ scale: 1 }],
                },
              ]}
              className="flex-row items-center rounded-2xl border px-4 py-4"
            >
              <View
                style={{
                  backgroundColor: `${colors.primary}`,
                  borderColor: `${colors.primary}25`,
                }}
                className="mr-3 h-9 w-9 items-center justify-center rounded-xl border"
              >
               <Text
                style={{
                    color: '#FFFFFF',
                }}
                className="text-sm font-black"
                >
                    {ageGroup === 'child' ? OPTION_EMOJI[index % OPTION_EMOJI.length] : String.fromCharCode(65 + index)}
                </Text>
              </View>

              <Text className="flex-1 text-sm font-semibold leading-5 text-foreground">
                {option.text}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.muted}
              />
            </Pressable>
          ))}
        </View>

        <View className="mt-auto flex-row items-center justify-center pb-6 pt-6">
          <Ionicons
            name="lock-closed-outline"
            size={13}
            color={colors.muted}
          />

          <Text className="ml-1.5 text-[10px] font-semibold text-muted">
            There are no right or wrong answers
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
