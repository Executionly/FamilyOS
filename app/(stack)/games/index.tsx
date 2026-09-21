import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { GameSession, useGameStore } from '@/lib/stores/game-store';
import { GAME_META } from '@/constants/games';
import { MemberAvatar } from '@/components/ui/member-avatar';

const DIFFICULTY_META = {
  easy: { label: 'Easy', color: '#10B981', icon: 'leaf-outline', desc: 'Casual play' },
  medium: { label: 'Medium', color: '#F59E0B', icon: 'flame-outline', desc: 'Balanced' },
  hard: { label: 'Hard', color: '#EF4444', icon: 'flash-outline', desc: 'Expert' },
} as const;

export default function GamesHubScreen() {
  const router = useRouter();
  const colors = useColors();
  const segment = useSegments()
  const { family, currentMember } = useFamilyStore();
  const { user } = useAuthStore();
  const { startSession, loading, dailyLimitReached } = useGameStore();

  const [selectedGame, setSelectedGame] = useState<'bible_trivia' | 'quiz' | null>(null);
  const [mode, setMode] = useState<'solo' | 'multiplayer'>('solo');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const { members } = useFamilyStore();
  const { findActiveSession, inviteAndStart } = useGameStore();
  const isPremium = family?.subscription_tier === 'premium';

  useEffect(() => {
    if (family?.id && currentMember?.id) {
      findActiveSession(family.id, currentMember.id).then(setActiveSession);
    }
  }, [family?.id, currentMember?.id, segment]);

  const toggleInvite = (id: string) =>
    setInvitedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleStart = async () => {
    if (!selectedGame || !family?.id || !user?.id || !currentMember?.id) return;

    if (mode === 'multiplayer') {
      const session = await inviteAndStart(family.id, user.id, currentMember.id, selectedGame, invitedIds, { difficulty, count: 10 });
      if (session) router.push(`/(stack)/games/lobby?sessionId=${session.id}`);
    } else {
      const session = await startSession(family.id, user.id, currentMember.id, selectedGame, mode, { difficulty, count: 10 });
      if (session) router.push(`/(stack)/games/play?sessionId=${session.id}`);
    }
  };

  const canStart = selectedGame && (mode === 'solo' || (mode === 'multiplayer' && invitedIds.length > 0));
  const availableMembers = (members ?? []).filter((m) => m.id !== currentMember?.id);

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Games" showBack />
      
      <View>

        <View className='px-5 items-end mb-4'>
          <Pressable onPress={() => router.push('/(stack)/games/analytics')} 
          className="flex-row items-center">
            <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
            <Text className="ml-1.5 text-sm font-semibold text-primary">View Family Stats</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView 
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }} 
      showsVerticalScrollIndicator={false}>
        {/* HERO WELCOME BANNER */}
        <View
          style={{ backgroundColor: colors.primary }}
          className="rounded-3xl p-5 mb-5 overflow-hidden -mt-5"
        >
          <View
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full"
          />
          <View
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            className="absolute -right-4 top-12 w-20 h-20 rounded-full"
          />
          
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Ionicons name="game-controller" size={20} color="#fff" />
              <Text className="ml-2 text-[10px] font-black text-white uppercase tracking-widest">
                Family Playtime
              </Text>
            </View>

            {/* Premium Pill */}
            {!isPremium && <Pressable
              onPress={() => router.push('/(stack)/paywall')}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              className="flex-row items-center rounded-full px-2.5 py-1"
            >
              <Ionicons name="sparkles" size={10} color="#F59E0B" />
              <Text className="ml-1 text-[9px] font-black text-white uppercase tracking-wider">
                Go Premium
              </Text>
            </Pressable>}
          </View>

          <Text className="text-xl font-black text-white mb-1">Ready to play?</Text>
          <Text className="text-xs text-white/80 font-medium mb-3">
            Choose a game, invite the family, and let the fun begin.
          </Text>

          {/* Inline Premium Banner Trigger (Keeps card compact and beautiful) */}
          {!isPremium && <Pressable
            onPress={() => router.push('/(stack)/paywall')}
            style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
            className="flex-row items-center justify-between rounded-xl px-3.5 py-2"
          >
            <View className="flex-row items-center flex-1 pr-2">
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text className="ml-2 text-[10px] font-bold text-white leading-tight flex-1">
                Unlock deep insights & unlimited pro level trivia questions.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </Pressable>}
        </View>

        {/* DAILY LIMIT WARNING */}
        {dailyLimitReached && (
          <View
            style={{ backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }}
            className="mb-5 flex-row items-center rounded-2xl border p-4"
          >
            <View style={{ backgroundColor: '#F59E0B20' }} className="w-9 h-9 rounded-xl items-center justify-center mr-3">
              <Ionicons name="alert-circle" size={18} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text style={{ color: '#F59E0B' }} className="text-xs font-black mb-0.5">Daily limit reached</Text>
              <Text className="text-[11px] text-muted font-medium">Come back tomorrow for more fun!</Text>
            </View>
          </View>
        )}

        {/* RESUME ACTIVE SESSION */}
        {activeSession && (
          <Pressable
            onPress={() =>
              router.push(
                activeSession.status === 'waiting'
                  ? `/(stack)/games/lobby?sessionId=${activeSession.id}`
                  : `/(stack)/games/play?sessionId=${activeSession.id}`
              )
            }
            style={({ pressed }) => [
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            className="mb-5 flex-row items-center rounded-2xl border border-gray-200 p-4"
          >
            <View style={{ backgroundColor: `${colors.primary}15` }} className="w-11 h-11 rounded-2xl items-center justify-center mr-3">
              <Ionicons name="play" size={18} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-muted uppercase tracking-widest">In Progress</Text>
              <Text style={{ color: colors.primary }} className="text-sm font-black mt-0.5">Resume active game</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* STEP 1: GAME PICKER */}
        <View className="mb-6">
          <View className="flex-row items-center mb-3 ml-1">
            <View style={{ backgroundColor: colors.primary }} className="w-5 h-5 rounded-full items-center justify-center mr-2">
              <Text className="text-[10px] font-black text-white">1</Text>
            </View>
            <Text className="text-[10px] font-black text-muted uppercase tracking-widest">Pick a game</Text>
          </View>

          <View className="gap-3">
            {(Object.keys(GAME_META) as Array<keyof typeof GAME_META>).map((key) => {
              const meta = GAME_META[key];
              const selected = selectedGame === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedGame(key)}
                  style={[
                    {
                      backgroundColor: selected ? `${meta.color}08` : colors.surface,
                      borderColor: selected ? meta.color : colors.border,
                    },
                  ]}
                  className="flex-row items-center rounded-3xl border p-4"
                >
                  <View
                    style={{ backgroundColor: `${meta.color}20` }}
                    className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
                  >
                    <Ionicons name={meta.icon as any} size={26} color={meta.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-black text-foreground">{meta.label}</Text>
                    <Text className="mt-0.5 text-xs text-muted font-medium leading-4">{meta.description}</Text>
                  </View>
                  {selected ? (
                    <View
                      style={{ backgroundColor: meta.color }}
                      className="w-7 h-7 rounded-full items-center justify-center"
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  ) : (
                    <View
                      style={{ borderColor: colors.border }}
                      className="w-7 h-7 rounded-full border-2"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {selectedGame && (
          <>
            {/* STEP 2: MODE */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3 ml-1">
                <View style={{ backgroundColor: colors.primary }} className="w-5 h-5 rounded-full items-center justify-center mr-2">
                  <Text className="text-[10px] font-black text-white">2</Text>
                </View>
                <Text className="text-[10px] font-black text-muted uppercase tracking-widest">Play mode</Text>
              </View>

              <View className="flex-row gap-3">
                {(['solo', 'multiplayer'] as const).map((m) => {
                  const isSelected = mode === m;
                  const modeIcon = m === 'solo' ? 'person' : 'people';
                  const modeDesc = m === 'solo' ? 'Just you' : 'With family';
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setMode(m)}
                      style={[
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      className="flex-1 rounded-3xl border p-4 items-center"
                    >
                      <View
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.background,
                        }}
                        className="w-11 h-11 rounded-2xl items-center justify-center mb-2"
                      >
                        <Ionicons name={modeIcon} size={22} color={isSelected ? '#fff' : colors.foreground} />
                      </View>
                      <Text
                        style={{ color: isSelected ? '#fff' : colors.foreground }}
                        className="text-sm font-black capitalize mb-0.5"
                      >
                        {m}
                      </Text>
                      <Text
                        style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : colors.muted }}
                        className="text-[10px] font-semibold"
                      >
                        {modeDesc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* STEP 2.5: INVITE (MULTIPLAYER ONLY) */}
            {mode === 'multiplayer' && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3 ml-1">
                  <View className="flex-row items-center">
                    <Ionicons name="person-add-outline" size={14} color={colors.muted} />
                    <Text className="ml-1.5 text-[10px] font-black text-muted uppercase tracking-widest">
                      Invite family
                    </Text>
                  </View>
                  {invitedIds.length > 0 && (
                    <View style={{ backgroundColor: `${colors.primary}15` }} className="rounded-full px-2.5 py-1">
                      <Text style={{ color: colors.primary }} className="text-[10px] font-black">
                        {invitedIds.length} selected
                      </Text>
                    </View>
                  )}
                </View>

                {availableMembers.length === 0 ? (
                  <View
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    className="rounded-2xl border p-6 items-center"
                  >
                    <Ionicons name="people-outline" size={28} color={colors.muted} />
                    <Text className="mt-2 text-xs font-semibold text-muted">No other family members yet</Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingRight: 10 }}
                  >
                    {availableMembers.map((m: any) => {
                      const isSelected = invitedIds.includes(m.id);
                      const photoUrl = m.photo || m.avatar || m.avatarUrl || m.image;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => toggleInvite(m.id)}
                          style={[
                            {
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderColor: isSelected ? colors.primary : colors.border,
                              // opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                          className="rounded-2xl border-2 p-3 items-center w-24"
                        >
                          <View className="relative mb-2">
                            <MemberAvatar member={m} colors={colors}/>
                            {isSelected && (
                              <View
                                style={{ backgroundColor: '#10B981', borderColor: colors.primary }}
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 items-center justify-center"
                              >
                                <Ionicons name="checkmark" size={11} color="#fff" />
                              </View>
                            )}
                          </View>
                          <Text
                            style={{ color: isSelected ? '#fff' : colors.foreground }}
                            className="text-xs font-bold text-center"
                            numberOfLines={1}
                          >
                            {m.name}
                          </Text>
                          {m.role && (
                            <Text
                              style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : colors.muted }}
                              className="text-[9px] font-semibold mt-0.5"
                              numberOfLines={1}
                            >
                              {m.role}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* STEP 3: DIFFICULTY */}
            <View className="mb-8">
              <View className="flex-row items-center mb-3 ml-1">
                <View style={{ backgroundColor: colors.primary }} className="w-5 h-5 rounded-full items-center justify-center mr-2">
                  <Text className="text-[10px] font-black text-white">{mode === 'multiplayer' ? '4' : '3'}</Text>
                </View>
                <Text className="text-[10px] font-black text-muted uppercase tracking-widest">Difficulty level</Text>
              </View>

              <View className="flex-row gap-2.5">
                {(['easy', 'medium', 'hard'] as const).map((d) => {
                  const isSelected = difficulty === d;
                  const dMeta = DIFFICULTY_META[d];
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDifficulty(d)}
                      style={ [
                        {
                          backgroundColor: isSelected ? `${dMeta.color}10` : colors.surface,
                          borderColor: isSelected ? dMeta.color : colors.border,
                        },
                      ]}
                      className="flex-1 rounded-2xl border p-3 items-center"
                    >
                      <View
                        style={{ backgroundColor: `${dMeta.color}${isSelected ? '25' : '15'}` }}
                        className="w-9 h-9 rounded-xl items-center justify-center mb-2"
                      >
                        <Ionicons name={dMeta.icon as any} size={18} color={dMeta.color} />
                      </View>
                      <Text
                        style={{ color: isSelected ? dMeta.color : colors.foreground }}
                        className="text-xs font-black mb-0.5"
                      >
                        {dMeta.label}
                      </Text>
                      <Text className="text-[9px] font-semibold text-muted">{dMeta.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* DAILY LIMIT WARNING */}
            {dailyLimitReached && (
              <View
                style={{ backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }}
                className="mb-5 flex-row items-center rounded-2xl border p-4"
              >
                <View style={{ backgroundColor: '#F59E0B20' }} className="w-9 h-9 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: '#F59E0B' }} className="text-xs font-black mb-0.5">Daily limit reached</Text>
                  <Text className="text-[11px] text-muted font-medium">Come back tomorrow for more fun!</Text>
                </View>
              </View>
            )}

            {/* START BUTTON */}
            <TouchableOpacity
              onPress={handleStart}
              disabled={loading || !canStart}
              style={[
                {
                  backgroundColor: canStart ? colors.primary : colors.primary,
                  opacity: canStart ? 1 : 0.6
                },
              ]}
              className="flex-row items-center justify-center rounded-2xl py-4 shadow-sm"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="rocket" size={18} color="#fff" />
                  <Text className="ml-2 text-base font-black text-white tracking-wide">
                    {mode === 'multiplayer' && invitedIds.length === 0 ? 'Invite Someone First' : 'Start Game'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* GAME SUMMARY HINT */}
            {canStart && !loading && (
              <View className="mt-4 flex-row items-center justify-center">
                <Ionicons name="information-circle-outline" size={12} color={colors.muted} />
                <Text className="ml-1 text-[10px] text-muted font-semibold">
                  10 questions · {DIFFICULTY_META[difficulty].label} · {mode === 'multiplayer' ? `${invitedIds.length + 1} players` : 'Solo play'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}