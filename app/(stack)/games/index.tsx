import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGameStore } from '@/lib/stores/game-store';
import { GAME_META } from '@/constants/games';

export default function GamesHubScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { user } = useAuthStore();
  const { startSession, loading, dailyLimitReached } = useGameStore();

  const [selectedGame, setSelectedGame] = useState<'bible_trivia' | 'quiz' | null>(null);
  const [mode, setMode] = useState<'solo' | 'multiplayer'>('solo');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const handleStart = async () => {
    if (!selectedGame || !family?.id || !user?.id || !currentMember?.id) return;

    const session = await startSession(family.id, user.id, currentMember.id, selectedGame, mode, { difficulty, count: 10 });

    if (session) {
      router.push(`/(stack)/games/play?sessionId=${session.id}`);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Games" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {dailyLimitReached && (
          <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Text className="text-xs text-amber-700">
              Your family has reached today's game limit. Try again tomorrow!
            </Text>
          </View>
        )}

        <Text className="mb-3 text-sm font-bold text-foreground">Choose a Game</Text>
        <View className="mb-6 gap-3">
          {(Object.keys(GAME_META) as Array<keyof typeof GAME_META>).map((key) => {
            const meta = GAME_META[key];
            const selected = selectedGame === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedGame(key)}
                className={`flex-row items-center rounded-2xl border-2 p-4 ${selected ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}
              >
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: meta.color + '20' }}>
                  <Ionicons name={meta.icon} size={22} color={meta.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">{meta.label}</Text>
                  <Text className="mt-0.5 text-xs text-muted">{meta.description}</Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>

        {selectedGame && (
          <>
            <Text className="mb-3 text-sm font-bold text-foreground">Mode</Text>
            <View className="mb-6 flex-row gap-2">
              {(['solo', 'multiplayer'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  className={`flex-1 items-center rounded-xl border py-3 ${mode === m ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
                >
                  <Ionicons name={m === 'solo' ? 'person-outline' : 'people-outline'} size={18} color={mode === m ? '#fff' : colors.foreground} />
                  <Text className={`mt-1 text-xs font-semibold capitalize ${mode === m ? 'text-white' : 'text-foreground'}`}>{m}</Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-3 text-sm font-bold text-foreground">Difficulty</Text>
            <View className="mb-8 flex-row gap-2">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDifficulty(d)}
                  className={`flex-1 items-center rounded-xl border py-2.5 ${difficulty === d ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
                >
                  <Text className={`text-xs font-semibold capitalize ${difficulty === d ? 'text-white' : 'text-foreground'}`}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleStart}
              disabled={loading}
              className="items-center rounded-2xl bg-primary py-4"
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">Start Game</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}