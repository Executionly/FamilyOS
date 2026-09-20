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
import { supabase } from '@/lib/_core/supabase';
import { PointsInfoButton } from '@/components/modals/PointInfoCard';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

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
  const { pauseSession, resumeSession } = useGameStore();
  const isPaused = currentSession?.status === 'paused';

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

  useEffect(() => {
    setSelectedOption(null);
    setAnswerResult(null);
    setTimeLeft(QUESTION_TIME_LIMIT_MS);
    questionStartRef.current = Date.now();
  }, [currentSession?.current_question_index]);

  useEffect(() => {
    if (isComplete || isPaused) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          if (!isMultiplayer || isHost) handleTimeUp();
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentSession?.current_question_index, isComplete, isPaused]);

  useEffect(() => {
    if (currentSession?.status === 'waiting' && sessionId) {
      router.replace(`/(stack)/games/lobby?sessionId=${sessionId}`);
    }
  }, [currentSession?.status]);

  useEffect(() => {
    if (!isMultiplayer || !isHost || !currentQuestion || !sessionId) return;

    const channel = supabase
      .channel(`answers-${sessionId}-${currentQuestion.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_answer', filter: `session_id=eq.${sessionId}` },
        async () => {
          const { count } = await supabase
            .from('game_answer')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('question_id', currentQuestion.id);

          if ((count ?? 0) >= participants.length) {
            setTimeout(() => advanceQuestion(sessionId, currentQuestion ? currentSession!.current_question_index : 0), 1200);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentQuestion?.id, isHost, isMultiplayer, participants.length]);

  const handleTimeUp = () => {
    if (!sessionId || !currentSession) return;
    setTimeout(() => advanceQuestion(sessionId, currentSession.current_question_index), 1500);
  };

  const handleSelectOption = async (index: number) => {
    if (selectedOption !== null || !currentQuestion || !myParticipantId) return;
    setSelectedOption(index);

    const timeTaken = Date.now() - questionStartRef.current;
    const isCorrect = await submitAnswer(myParticipantId, currentQuestion.id, index, timeTaken);
    setAnswerResult({ correct: isCorrect, explanation: currentQuestion.explanation });

    if (!isMultiplayer && sessionId) {
      setTimeout(() => advanceQuestion(sessionId,currentSession!.current_question_index), 1800);
    }
  };

  if (!currentSession) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (isComplete) {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const podiumColors = ['#F59E0B', '#94A3B8', '#B45309'];

    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} showsVerticalScrollIndicator={false}>
          <View className="items-center pt-6 pb-8">
            <View
              style={{ backgroundColor: '#F59E0B15' }}
              className="w-24 h-24 rounded-full items-center justify-center mb-4"
            >
              <Ionicons name="trophy" size={56} color="#F59E0B" />
            </View>
            <Text className="text-3xl font-black text-foreground">Game Over</Text>
            <Text className="mt-2 text-sm text-muted font-medium">
              {winner ? `${winner.member?.name ?? 'Player'} takes the crown` : 'Well played, everyone'}
            </Text>
          </View>

          <View className="gap-3">
            {sorted.map((p, i) => {
              const isTop = i < 3;
              const accent = isTop ? podiumColors[i] : colors.muted;
              return (
                <View
                  key={p.id}
                  style={{ backgroundColor: colors.surface, borderColor: i === 0 ? '#F59E0B40' : colors.border }}
                  className="flex-row items-center rounded-2xl border p-4"
                >
                  <View
                    style={{ backgroundColor: `${accent}20` }}
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  >
                    <Text style={{ color: accent }} className="text-sm font-black">
                      #{i + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">{p.member?.name ?? 'Player'}</Text>
                    <Text className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">
                      {i === 0 ? 'Champion' : i === 1 ? 'Runner-up' : i === 2 ? '3rd Place' : 'Participant'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text style={{ color: colors.primary }} className="text-lg font-black">
                      {p.score}
                    </Text>
                    <Text className="text-[9px] font-bold text-muted uppercase tracking-wider">points</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => router.replace('/(stack)/games')}
            style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            className="mt-8 flex-row items-center justify-center rounded-2xl py-4 bg-primary-dark"
          >
            <Ionicons name="game-controller" size={18} color="#fff" />
            <Text className="ml-2 text-sm font-bold text-white">Play Again</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  const meta = GAME_META[currentSession.game_type];
  const progress = (currentSession.current_question_index + 1) / currentSession.question_ids.length;
  const timePercent = timeLeft / QUESTION_TIME_LIMIT_MS;
  const isTimerCritical = timePercent < 0.3;
  const timerColor = isTimerCritical ? '#EF4444' : meta.color;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      {isPaused ? (
        <View className="items-center justify-center flex-1 px-8">
          <View
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="w-full rounded-3xl border p-8 items-center"
          >
            <View
              style={{ backgroundColor: `${colors.primary}15` }}
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
            >
              <Ionicons name="pause" size={40} color={colors.primary} />
            </View>
            <Text className="text-xl font-black text-foreground">Game Paused</Text>
            <Text className="mt-2 text-xs text-muted font-medium text-center">
              Take a breather. Resume whenever you're ready.
            </Text>
            {(!isMultiplayer || isHost) && (
              <Pressable
                onPress={() => sessionId && resumeSession(sessionId)}
                style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                className="mt-6 flex-row items-center rounded-2xl px-6 py-3 bg-primary-light"
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text className="ml-2 text-sm font-bold text-white">Resume Game</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER: Meta Info & Pause */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center">
              <View
                style={{ backgroundColor: `${meta.color}20` }}
                className="w-9 h-9 rounded-xl items-center justify-center mr-3"
              >
                <Ionicons name={meta.icon as any} size={18} color={meta.color} />
              </View>
              <View>
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  {isMultiplayer ? 'Multiplayer' : 'Solo'}
                </Text>
                <Text className="text-sm font-bold text-foreground capitalize">
                  {currentSession.game_type?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <View className='flex-row items-center gap-3'>
              <PointsInfoButton />
              {(!isMultiplayer || isHost) && !isComplete && (
                <Pressable
                  onPress={() => sessionId && (isPaused ? resumeSession(sessionId) : pauseSession(sessionId))}
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="w-10 h-10 rounded-xl border items-center justify-center"
                >
                  <Ionicons name="pause" size={16} color={colors.foreground} />
                </Pressable>
              )}
            </View>
          </View>

          {/* TIMER RING + PROGRESS */}
          <View
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-3xl border p-5 mb-5"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest">Question</Text>
                <Text className="text-lg font-black text-foreground mt-0.5">
                  {currentSession.current_question_index + 1}
                  <Text className="text-sm font-bold text-muted"> / {currentSession.question_ids.length}</Text>
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: `${timerColor}15`,
                  borderColor: `${timerColor}40`,
                }}
                className="flex-row items-center rounded-2xl border px-4 py-2"
              >
                <Ionicons name="time" size={14} color={timerColor} />
                <Text style={{ color: timerColor }} className="ml-1.5 text-base font-black">
                  {Math.ceil(timeLeft / 1000)}s
                </Text>
              </View>
            </View>

            {/* Timer bar */}
            <View
              style={{ backgroundColor: colors.background }}
              className="h-2 overflow-hidden rounded-full mb-2"
            >
              <View
                className="h-full rounded-full"
                style={{ width: `${timePercent * 100}%`, backgroundColor: timerColor }}
              />
            </View>

            {/* Progress bar */}
            <View
              style={{ backgroundColor: colors.background }}
              className="h-1 overflow-hidden rounded-full"
            >
              <View
                className="h-full rounded-full"
                style={{ width: `${progress * 100}%`, backgroundColor: colors.primary }}
              />
            </View>
          </View>

          {timeLeft === 0 && !answerResult && isMultiplayer && !isHost && (
            <View className="mt-4 items-center">
              <ActivityIndicator size="small" color={colors.muted} />
              <Text className="mt-2 text-xs text-muted">Waiting for the next question...</Text>
            </View>
          )}

          {/* LIVE LEADERBOARD */}
          {isMultiplayer && (
            <View className="mb-5">
              <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 ml-1">
                Live Standings
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {[...participants]
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => {
                    const isMe = p.id === myParticipantId;
                    return (
                      <View
                        key={p.id}
                        style={{
                          backgroundColor: isMe ? colors.primary : colors.surface,
                          borderColor: isMe ? colors.primary : colors.border,
                        }}
                        className="flex-row items-center rounded-2xl border px-3 py-2"
                      >
                        <View
                          style={{
                            backgroundColor: isMe
                              ? 'rgba(255,255,255,0.2)'
                              : i === 0
                              ? '#F59E0B20'
                              : colors.background,
                          }}
                          className="w-5 h-5 rounded-full items-center justify-center mr-2"
                        >
                          <Text
                            style={{ color: isMe ? '#fff' : i === 0 ? '#F59E0B' : colors.muted }}
                            className="text-[9px] font-black"
                          >
                            {i + 1}
                          </Text>
                        </View>
                        <Text
                          style={{ color: isMe ? '#fff' : colors.foreground }}
                          className="text-xs font-bold mr-2"
                        >
                          {p.member?.name ?? 'Player'}
                        </Text>
                        <Text
                          style={{ color: isMe ? '#fff' : colors.primary }}
                          className="text-xs font-black"
                        >
                          {p.score}
                        </Text>
                      </View>
                    );
                  })}
              </ScrollView>
            </View>
          )}

          {/* QUESTION CARD */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: meta.color,
              borderLeftWidth: 4,
            }}
            className="rounded-3xl border p-6 mb-5"
          >
            <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
              The Question
            </Text>
            <Text className="text-lg font-bold leading-7 text-foreground">
              {currentQuestion.question}
            </Text>
          </View>

          {/* OPTIONS */}
          <View className="gap-2.5">
            {currentQuestion.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              const showCorrectness = answerResult !== null;
              const isCorrectAnswer = showCorrectness && currentQuestion.correct_option_index === i;

              let borderColor = colors.border;
              let bgColor = colors.surface;
              let iconName: any = null;
              let iconColor = colors.muted;
              let labelBg = colors.background;
              let labelColor = colors.foreground;

              if (showCorrectness && isCorrectAnswer) {
                borderColor = '#10B981';
                bgColor = '#10B98110';
                iconName = 'checkmark-circle';
                iconColor = '#10B981';
                labelBg = '#10B981';
                labelColor = '#fff';
              } else if (showCorrectness && isSelected && !answerResult.correct) {
                borderColor = '#EF4444';
                bgColor = '#EF444410';
                iconName = 'close-circle';
                iconColor = '#EF4444';
                labelBg = '#EF4444';
                labelColor = '#fff';
              } else if (isSelected) {
                borderColor = colors.primary;
                bgColor = `${colors.primary}08`;
                labelBg = colors.primary;
                labelColor = '#fff';
              }

              return (
                <Pressable
                  key={i}
                  onPress={() => handleSelectOption(i)}
                  disabled={selectedOption !== null}
                  style={({ pressed }) => [
                    {
                      backgroundColor: bgColor,
                      borderColor,
                      opacity: pressed && selectedOption === null ? 0.85 : 1,
                    },
                  ]}
                  className="flex-row items-center rounded-2xl border-2 p-4"
                >
                  <View
                    style={{ backgroundColor: labelBg }}
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                  >
                    <Text style={{ color: labelColor }} className="text-sm font-black">
                      {OPTION_LABELS[i]}
                    </Text>
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-foreground leading-5">
                    {opt}
                  </Text>
                  {iconName && (
                    <Ionicons name={iconName} size={22} color={iconColor} style={{ marginLeft: 8 }} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* RESULT / EXPLANATION */}
          {answerResult && (
            <View
              style={{
                backgroundColor: answerResult.correct ? '#10B98110' : '#EF444410',
                borderColor: answerResult.correct ? '#10B98140' : '#EF444440',
              }}
              className="mt-5 rounded-2xl border p-4"
            >
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name={answerResult.correct ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={answerResult.correct ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={{ color: answerResult.correct ? '#10B981' : '#EF4444' }}
                  className="ml-2 text-sm font-black"
                >
                  {answerResult.correct ? 'Correct!' : 'Not quite'}
                </Text>
              </View>
              {answerResult.explanation && (
                <Text className="text-xs text-foreground leading-5 font-medium">
                  {answerResult.explanation}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}