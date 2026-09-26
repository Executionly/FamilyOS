import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { supabase } from '@/lib/_core/supabase';
import { GAME_META } from '@/constants/games';

interface MemberStats {
  member_id: string;
  name: string;
  total_score: number;
  games_played: number;
  correct_answers: number;
  total_answers: number;
  wins: number;
}

export default function GameAnalyticsScreen() {
  const colors = useColors();
  const { family } = useFamilyStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [gameFilter, setGameFilter] = useState<'all' | 'bible_trivia' | 'quiz'>('all');

  useEffect(() => {
    if (family?.id) loadStats();
  }, [family?.id, gameFilter]);

  const loadStats = async () => {
    if (!family?.id) return;
    setLoading(true);
    try {
      let sessionQuery = supabase
        .from('game_session')
        .select('id, game_type')
        .eq('family_id', family.id)
        .eq('status', 'completed')
        .eq('mode', 'multiplayer');
      if (gameFilter !== 'all') sessionQuery = sessionQuery.eq('game_type', gameFilter);

      const { data: sessions } = await sessionQuery;
      const sessionIds = (sessions ?? []).map((s) => s.id);

      if (sessionIds.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const { data: participants } = await supabase
        .from('game_participant')
        .select('id, member_id, score, session_id, member:member_id(name)')
        .in('session_id', sessionIds);

      const { data: answers } = await supabase
        .from('game_answer')
        .select('participant_id, is_correct');

      const answersByParticipant = new Map<string, { correct: number; total: number }>();
      (answers ?? []).forEach((a) => {
        const cur = answersByParticipant.get(a.participant_id) ?? { correct: 0, total: 0 };
        cur.total += 1;
        if (a.is_correct) cur.correct += 1;
        answersByParticipant.set(a.participant_id, cur);
      });

      // Determine per-session winner (highest score in that session)
      const winnersBySession = new Map<string, string>();
      const bySession = new Map<string, typeof participants>();
      (participants ?? []).forEach((p) => {
        bySession.set(p.session_id, [...(bySession.get(p.session_id) ?? []), p]);
      });
      bySession.forEach((group: any, sessionId) => {
        const top = [...group].sort((a, b) => b.score - a.score)[0];
        if (top) winnersBySession.set(sessionId, top.member_id);
      });

      const byMember = new Map<string, MemberStats>();
      (participants ?? []).forEach((p: any) => {
        const existing = byMember.get(p.member_id) ?? {
          member_id: p.member_id,
          name: p.member?.name ?? 'Player',
          total_score: 0,
          games_played: 0,
          correct_answers: 0,
          total_answers: 0,
          wins: 0,
        };
        existing.total_score += p.score;
        existing.games_played += 1;
        const ans = answersByParticipant.get(p.id);
        if (ans) {
          existing.correct_answers += ans.correct;
          existing.total_answers += ans.total;
        }
        if (winnersBySession.get(p.session_id) === p.member_id) existing.wins += 1;
        byMember.set(p.member_id, existing);
      });

      setStats(Array.from(byMember.values()).sort((a, b) => b.total_score - a.total_score));
    } catch (err) {
      console.error('Failed to load game stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const topPlayer = stats[0];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Game Stats" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Filter */}
        <View className="mb-5 flex-row gap-2">
          {(['all', 'bible_trivia', 'quiz'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setGameFilter(f)}
              style={{
                backgroundColor: gameFilter === f ? colors.primary : colors.surface,
                borderColor: gameFilter === f ? colors.primary : colors.border,
              }}
              className="flex-1 items-center rounded-xl border py-2.5"
            >
              <Text style={{ color: gameFilter === f ? '#fff' : colors.foreground }} className="text-xs font-bold">
                {f === 'all' ? 'All Games' : GAME_META[f].label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : stats.length === 0 ? (
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="items-center rounded-2xl border py-16">
            <Ionicons name="stats-chart-outline" size={28} color={colors.muted} />
            <Text className="mt-2 text-sm text-muted">No completed games yet</Text>
          </View>
        ) : (
          <>
            {/* Top player spotlight */}
            {topPlayer && (
              <View style={{ backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' }} className="mb-6 items-center rounded-3xl border p-6">
                <Ionicons name="trophy" size={36} color="#F59E0B" />
                <Text className="mt-2 text-[10px] font-bold text-muted uppercase tracking-widest">Family Champion</Text>
                <Text className="mt-1 text-xl font-black text-foreground">{topPlayer.name}</Text>
                <Text style={{ color: '#F59E0B' }} className="mt-1 text-sm font-bold">{topPlayer.total_score} total points</Text>
              </View>
            )}

            {/* Leaderboard */}
            <Text className="mb-3 text-sm font-bold text-foreground">Leaderboard</Text>
            <View className="gap-2.5">
              {stats.map((m, i) => {
                const accuracy = m.total_answers > 0 ? Math.round((m.correct_answers / m.total_answers) * 100) : 0;
                return (
                  <View key={m.member_id} style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
                    <View className="flex-row items-center mb-3">
                      <View style={{ backgroundColor: i === 0 ? '#F59E0B20' : `${colors.primary}15` }} className="w-9 h-9 rounded-xl items-center justify-center mr-3">
                        <Text style={{ color: i === 0 ? '#F59E0B' : colors.primary }} className="text-xs font-black">#{i + 1}</Text>
                      </View>
                      <Text className="flex-1 text-sm font-bold text-foreground">{m.name}</Text>
                      <Text style={{ color: colors.primary }} className="text-base font-black">{m.total_score}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <StatChip icon="game-controller-outline" label="Games" value={m.games_played} colors={colors} />
                      <StatChip icon="trophy-outline" label="Wins" value={m.wins} colors={colors} />
                      <StatChip icon="checkmark-done-outline" label="Accuracy" value={`${accuracy}%`} colors={colors} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function StatChip({ icon, label, value, colors }: { icon: any; label: string; value: string | number; colors: any }) {
  return (
    <View className="items-center flex-1">
      <Ionicons name={icon} size={14} color={colors.muted} />
      <Text className="mt-1 text-xs font-black text-foreground">{value}</Text>
      <Text className="text-[9px] text-muted uppercase tracking-wide">{label}</Text>
    </View>
  );
}