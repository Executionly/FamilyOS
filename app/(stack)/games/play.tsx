import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGameStore } from '@/lib/stores/game-store';
import { QUESTION_TIME_LIMIT_MS, GAME_META } from '@/constants/games';

export default function GamePlayScreen() {
  const router = useRouter();
  const colors = useColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const { currentMember } = useFamilyStore();
  const {
    currentSession, questions, participants, submitAnswer, advanceQuestion,
    joinSession, subscribeToSession, unsubscribeFromSession,
  } = useGameStore();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; explanation?: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT_MS);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const questionStartRef = useRef(Date.now());

  const isHost = currentSession?.created_by === user?.id;
  const currentQuestion = questions[currentSession?.current_question_index ?? 0];
  const isMultiplayer = currentSession?.mode === 'multiplayer';
  const isComplete = currentSession?.status === 'completed';

  useEffect(() => {
    if (!sessionId) return;
    joinSession(sessionId, currentMember!.id).then(() => {
      const mine = participants.find((p) => p.member_id === currentMember?.id);
      if (mine) setMyParticipantId(mine.id);
    });
    subscribeToSession(sessionId);
    return () => unsubscribeFromSession();
  }, [sessionId]);

  useEffect(() => {
    const mine = participants.find((p) => p.member_id === currentMember?.id);
    if (mine) setMyParticipantId(mine.id);
  }, [participants, currentMember?.id]);

  // Reset per-question state when the question index changes
  useEffect(() => {
    setSelectedOption(null);
    setAnswerResult(null);
    setTimeLeft(QUESTION_TIME_LIMIT_MS);
    questionStartRef.current = Date.now();
  }, [currentSession?.current_question_index]);

  // Countdown timer
  useEffect(() => {
    if (isComplete || answerResult) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          if (isHost) handleTimeUp();
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentSession?.current_question_index, answerResult, isComplete]);

  const handleTimeUp = () => {
    if (!sessionId) return;
    setTimeout(() => advanceQuestion(sessionId), 1500); // brief pause so everyone sees the timeout
  };

  const handleSelectOption = async (index: number) => {
    if (selectedOption !== null || !currentQuestion || !myParticipantId) return;
    setSelectedOption(index);

    const timeTaken = Date.now() - questionStartRef.current;
    const isCorrect = await submitAnswer(myParticipantId, currentQuestion.id, index, timeTaken);
    setAnswerResult({ correct: isCorrect, explanation: currentQuestion.explanation });

    // Solo mode advances immediately once answered; multiplayer waits for the timer/host
    if (!isMultiplayer && sessionId) {
      setTimeout(() => advanceQuestion(sessionId), 1800);
    }
  };


  if (!currentSession) {
  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    </ScreenContainer>
  );
}

  if (isComplete) {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="trophy" size={48} color="#F59E0B" />
          <Text className="mt-4 text-xl font-extrabold text-foreground">Game Over!</Text>

          <View className="mt-6 w-full">
            {sorted.map((p, i) => (
              <View key={p.id} className="mb-2 flex-row items-center rounded-xl border border-border bg-surface p-3">
                <Text className="mr-3 text-base font-bold text-muted">#{i + 1}</Text>
                <Text className="flex-1 text-sm font-semibold text-foreground">{p.member?.name ?? 'Player'}</Text>
                <Text className="text-sm font-bold text-primary">{p.score} pts</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={() => router.replace('/(stack)/games')} className="mt-8 rounded-xl bg-primary px-6 py-3">
            <Text className="text-sm font-bold text-white">Play Again</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (!currentQuestion) {
  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    </ScreenContainer>
  );
}

  const meta = GAME_META[currentSession.game_type];
  const progress = (currentSession.current_question_index + 1) / currentSession.question_ids.length;
  const timePercent = timeLeft / QUESTION_TIME_LIMIT_MS;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <View className="px-5 pt-4">
        {/* Progress + timer */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-muted">
            Question {currentSession.current_question_index + 1} of {currentSession.question_ids.length}
          </Text>
          <Text className="text-xs font-bold" style={{ color: timePercent < 0.3 ? '#EF4444' : colors.muted }}>
            {Math.ceil(timeLeft / 1000)}s
          </Text>
        </View>
        <View className="mb-2 h-1.5 overflow-hidden rounded-full bg-border">
          <View className="h-full rounded-full" style={{ width: `${timePercent * 100}%`, backgroundColor: timePercent < 0.3 ? '#EF4444' : meta.color }} />
        </View>
        <View className="mb-6 h-1 overflow-hidden rounded-full bg-border">
          <View className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </View>

        {/* Live leaderboard strip — multiplayer only */}
        {isMultiplayer && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-grow-0" contentContainerStyle={{ gap: 8 }}>
            {[...participants].sort((a, b) => b.score - a.score).map((p) => (
              <View key={p.id} className="flex-row items-center rounded-full border border-border bg-surface px-3 py-1.5">
                <Text className="text-xs font-semibold text-foreground">{p.member?.name ?? 'Player'}</Text>
                <Text className="ml-1.5 text-xs font-bold text-primary">{p.score}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Question */}
        <View className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <Text className="text-base font-bold leading-6 text-foreground">{currentQuestion.question}</Text>
        </View>

        {/* Options */}
        <View className="gap-3">
          {currentQuestion.options.map((opt, i) => {
            const isSelected = selectedOption === i;
            const showCorrectness = answerResult !== null;
            const isCorrectAnswer = answerResult && currentQuestion.correct_option_index === i;

            let bgClass = 'border-border bg-surface';
            if (showCorrectness && isSelected && answerResult.correct) bgClass = 'border-emerald-400 bg-emerald-50';
            else if (showCorrectness && isSelected && !answerResult.correct) bgClass = 'border-red-400 bg-red-50';
            else if (isSelected) bgClass = 'border-primary bg-primary/5';

            return (
              <Pressable
                key={i}
                onPress={() => handleSelectOption(i)}
                disabled={selectedOption !== null}
                className={`rounded-xl border-2 p-4 ${bgClass}`}
              >
                <Text className="text-sm font-semibold text-foreground">{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {answerResult?.explanation && (
          <View className="mt-4 rounded-xl bg-primary/5 p-3">
            <Text className="text-xs text-muted">{answerResult.explanation}</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}