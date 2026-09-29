import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import type { TeamId } from '../../../../types';
import { useFeudStore } from '@/lib/stores/useFeudStore';

const TEAM_META: Record<TeamId, { label: string; color: string }> = {
  A: { label: 'Team A', color: '#3B82F6' },
  B: { label: 'Team B', color: '#F97316' },
};

export default function FeudPlayScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const colors = useColors();
  const { currentMember } = useFamilyStore();
  const {
    currentSession,
    participants,
    questionData,
    error,
    joinSession,
    fetchQuestionData,
    subscribeToSession,
    unsubscribeFromSession,
    submitFaceOffAnswer,
    choosePlayOrPass,
    submitTurnAnswer,
    submitStealAnswer,
    startNextRound,
  } = useFeudStore();

  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const myMemberId = currentMember?.id;

  useEffect(() => {
    if (!sessionId || !myMemberId) return;
    joinSession(sessionId, myMemberId);
    subscribeToSession(sessionId);
    return () => unsubscribeFromSession();
  }, [sessionId, myMemberId]);

  useEffect(() => {
    if (currentSession?.feud_question_id) fetchQuestionData(currentSession.feud_question_id);
  }, [currentSession?.feud_question_id]);

  useEffect(() => {
    setAnswerText('');
  }, [currentSession?.feud_phase, currentSession?.current_player_id]);

  const nameFor = (memberId?: string | null) => participants.find((p) => p.member_id === memberId)?.member?.name ?? 'Player';
  const teamFor = (memberId?: string | null) => participants.find((p) => p.member_id === memberId)?.team_id ?? null;

  if (!currentSession || !questionData) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  const phase = currentSession.feud_phase;

  // ── Game complete ──────────────────────────────────────────────
  if (phase === 'game_complete') {
    const scoreA = currentSession.team_scores.A ?? 0;
    const scoreB = currentSession.team_scores.B ?? 0;
    const winner: TeamId | null = scoreA === scoreB ? null : scoreA > scoreB ? 'A' : 'B';

    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          <View className="items-center pt-6 pb-8">
            <View style={{ backgroundColor: '#F59E0B15' }} className="mb-4 h-24 w-24 items-center justify-center rounded-full">
              <Ionicons name="trophy" size={56} color="#F59E0B" />
            </View>
            <Text className="text-3xl font-black text-foreground">Game Over</Text>
            <Text className="mt-2 text-sm font-medium text-muted">
              {winner ? `${TEAM_META[winner].label} wins!` : "It's a tie!"}
            </Text>
          </View>

          <View className="gap-3">
            {(['A', 'B'] as TeamId[]).map((teamId) => {
              const meta = TEAM_META[teamId];
              const roster = participants.filter((p) => p.team_id === teamId);
              return (
                <View
                  key={teamId}
                  style={{ backgroundColor: colors.surface, borderColor: winner === teamId ? `${meta.color}60` : colors.border }}
                  className="rounded-2xl border p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text style={{ color: meta.color }} className="text-sm font-black">
                      {meta.label}
                    </Text>
                    <Text style={{ color: meta.color }} className="text-2xl font-black">
                      {currentSession.team_scores[teamId] ?? 0}
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-muted">{roster.map((p) => p.member?.name).join(', ')}</Text>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => router.replace('/(stack)/games')}
            style={{ backgroundColor: colors.primary }}
            className="mt-8 flex-row items-center justify-center rounded-2xl py-4"
          >
            <Ionicons name="game-controller" size={18} color="#fff" />
            <Text className="ml-2 text-sm font-bold text-white">Go to games</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Shared board (used by playing / steal / round_complete) ────
  const renderBoard = () => (
    <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="mb-5 gap-2 rounded-2xl border p-4">
      {questionData.answers.map((a, i) => {
        const revealed = currentSession.revealed_answer_ids.includes(a.id);
        return (
          <View
            key={a.id}
            style={{ backgroundColor: revealed ? `${colors.primary}10` : colors.background }}
            className="flex-row items-center justify-between rounded-xl px-3 py-2.5"
          >
            <Text className="text-sm font-bold text-foreground">
              {i + 1}. {revealed ? a.answer.toUpperCase() : '???'}
            </Text>
            {revealed && (
              <Text style={{ color: colors.primary }} className="text-sm font-black">
                {a.points}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderScoreBar = () => (
    <View className="mb-5 flex-row gap-3">
      {(['A', 'B'] as TeamId[]).map((teamId) => {
        const meta = TEAM_META[teamId];
        const isControlling = currentSession.controlling_team_id === teamId;
        return (
          <View
            key={teamId}
            style={{
              backgroundColor: isControlling ? `${meta.color}12` : colors.surface,
              borderColor: isControlling ? meta.color : colors.border,
            }}
            className="flex-1 rounded-xl border p-3"
          >
            <Text style={{ color: meta.color }} className="text-[10px] font-black uppercase tracking-wide">
              {meta.label}
            </Text>
            <Text className="text-lg font-black text-foreground">{currentSession.team_scores[teamId] ?? 0}</Text>
          </View>
        );
      })}
    </View>
  );

  const handleSubmit = async (fn: () => Promise<void>) => {
    if (!answerText.trim() || submitting) return;
    setSubmitting(true);
    await fn();
    setSubmitting(false);
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Round {currentSession.feud_round} of {currentSession.feud_total_rounds}
          </Text>
          {phase === 'playing' && (
            <Text className="text-[10px] font-bold uppercase tracking-widest text-error">
              {'X '.repeat(currentSession.strikes).trim() || 'No strikes'}
            </Text>
          )}
        </View>

        {renderScoreBar()}

        <View
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.primary, borderLeftWidth: 4 }}
          className="mb-5 rounded-2xl border p-5"
        >
          <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">The Question</Text>
          <Text className="text-lg font-bold leading-7 text-foreground">{questionData.question.question}</Text>
        </View>

        {error && (
          <View className="mb-4 rounded-xl border border-error p-3">
            <Text className="text-xs text-error">{error}</Text>
          </View>
        )}

        {/* ── FACE OFF ── */}
        {phase === 'face_off' && (
          <View className="items-center">
            <Text className="mb-4 text-base font-black text-foreground">Face-Off!</Text>
            <View className="mb-6 flex-row items-center gap-4">
              {currentSession.face_off_player_ids.map((id) => (
                <View key={id} className="items-center">
                  <Text className="text-sm font-bold text-foreground">{nameFor(id)}</Text>
                  <Text style={{ color: TEAM_META[teamFor(id) ?? 'A'].color }} className="text-[10px] font-semibold">
                    {TEAM_META[teamFor(id) ?? 'A'].label}
                  </Text>
                  {currentSession.face_off_answers[id] && (
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginTop: 4 }} />
                  )}
                </View>
              ))}
            </View>

            {currentSession.face_off_player_ids.includes(myMemberId ?? '') && !currentSession.face_off_answers[myMemberId ?? ''] ? (
              <View className="w-full">
                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  placeholder="Type your answer..."
                  placeholderTextColor={colors.muted}
                  className="mb-3 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
                  onSubmitEditing={() =>
                    handleSubmit(() => submitFaceOffAnswer(sessionId!, myMemberId!, answerText))
                  }
                />
                <Pressable
                  onPress={() => handleSubmit(() => submitFaceOffAnswer(sessionId!, myMemberId!, answerText))}
                  disabled={submitting || !answerText.trim()}
                  style={{ backgroundColor: colors.primary, opacity: answerText.trim() ? 1 : 0.6 }}
                  className="items-center rounded-xl py-3.5"
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Submit</Text>}
                </Pressable>
              </View>
            ) : (
              <Text className="text-xs font-semibold text-muted">Waiting for both players to answer...</Text>
            )}
          </View>
        )}

        {/* ── PLAY OR PASS ── */}
        {phase === 'play_or_pass' && (
          <View className="items-center">
            <Text className="mb-1 text-sm font-bold text-foreground">
              {TEAM_META[currentSession.controlling_team_id!].label} won the face-off!
            </Text>
            {currentSession.current_player_id === myMemberId ? (
              <>
                <Text className="mb-4 text-xs text-muted">Play or pass?</Text>
                <View className="w-full flex-row gap-3">
                  <Pressable
                    onPress={() => choosePlayOrPass(sessionId!, myMemberId!, 'play')}
                    style={{ backgroundColor: colors.primary }}
                    className="flex-1 items-center rounded-xl py-3.5"
                  >
                    <Text className="font-bold text-white">Play</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => choosePlayOrPass(sessionId!, myMemberId!, 'pass')}
                    style={{ borderColor: colors.border }}
                    className="flex-1 items-center rounded-xl border py-3.5"
                  >
                    <Text className="font-bold text-foreground">Pass</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text className="text-xs font-semibold text-muted">
                Waiting for {nameFor(currentSession.current_player_id)} to decide...
              </Text>
            )}
          </View>
        )}

        {/* ── PLAYING ── */}
        {phase === 'playing' && (
          <>
            {renderBoard()}
            {currentSession.current_player_id === myMemberId ? (
              <View>
                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  placeholder="Type your answer..."
                  placeholderTextColor={colors.muted}
                  className="mb-3 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
                  onSubmitEditing={() => handleSubmit(() => submitTurnAnswer(sessionId!, myMemberId!, answerText))}
                />
                <Pressable
                  onPress={() => handleSubmit(() => submitTurnAnswer(sessionId!, myMemberId!, answerText))}
                  disabled={submitting || !answerText.trim()}
                  style={{ backgroundColor: colors.primary, opacity: answerText.trim() ? 1 : 0.6 }}
                  className="items-center rounded-xl py-3.5"
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Submit Answer</Text>}
                </Pressable>
              </View>
            ) : (
              <Text className="text-center text-xs font-semibold text-muted">
                Waiting for {nameFor(currentSession.current_player_id)}...
              </Text>
            )}
          </>
        )}

        {/* ── STEAL ── */}
        {phase === 'steal' && (
          <>
            <View className="mb-3 items-center">
              <Text style={{ color: '#EF4444' }} className="text-sm font-black">
                3 STRIKES — {TEAM_META[currentSession.steal_team_id!].label} can steal {currentSession.round_points} points!
              </Text>
            </View>
            {renderBoard()}
            {currentSession.current_player_id === myMemberId ? (
              <View>
                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  placeholder="One shot — type your answer..."
                  placeholderTextColor={colors.muted}
                  className="mb-3 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
                />
                <Pressable
                  onPress={() => handleSubmit(() => submitStealAnswer(sessionId!, myMemberId!, answerText))}
                  disabled={submitting || !answerText.trim()}
                  style={{ backgroundColor: '#EF4444', opacity: answerText.trim() ? 1 : 0.6 }}
                  className="items-center rounded-xl py-3.5"
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Steal!</Text>}
                </Pressable>
              </View>
            ) : (
              <Text className="text-center text-xs font-semibold text-muted">
                Waiting for {nameFor(currentSession.current_player_id)}'s steal attempt...
              </Text>
            )}
          </>
        )}

        {/* ── ROUND COMPLETE ── */}
        {phase === 'round_complete' && (
          <View className="items-center">
            {renderBoard()}
            <Text className="mb-1 text-lg font-black text-foreground">
              {TEAM_META[currentSession.round_winner_team_id!].label} takes the round!
            </Text>
            <Text className="mb-6 text-xs text-muted">+{currentSession.round_points} points</Text>
            <Pressable
              onPress={() => myMemberId && startNextRound(sessionId!, myMemberId)}
              style={{ backgroundColor: colors.primary }}
              className="w-full items-center rounded-2xl py-4"
            >
              <Text className="text-base font-black text-white">
                {currentSession.feud_round >= currentSession.feud_total_rounds ? 'See Final Results' : 'Next Round'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}