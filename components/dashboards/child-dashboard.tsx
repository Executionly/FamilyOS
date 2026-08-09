import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useChoreStore } from '@/lib/stores/chore-store';
import { NotificationBell } from '@/components/Notification-Bell';

export function ChildDashboard() {
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { chores, fetchChores, updateChore } = useChoreStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (family?.id) {
      setLoading(true);
      fetchChores(family.id).finally(() => setLoading(false));
    }
  }, [family?.id]);

  const myChores = chores.filter((c) => c.assigned_to === currentMember?.id && c.status !== 'completed');
  const completedToday = chores.filter((c) => c.assigned_to === currentMember?.id && c.status === 'completed').length;

  const handleDone = async (id: string) => {
    try { await updateChore(id, { status: 'completed' }); } catch (err) { console.error(err); }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-primary px-6 pb-10 pt-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 items-center">
              <Text className="text-4xl">👋</Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">
                {greeting()}, {currentMember?.name?.split(' ')[0]}!
              </Text>
              <Text className="mt-1 text-sm text-white/80">
                {myChores.length === 0
                  ? "You're all done for today!"
                  : `You have ${myChores.length} thing${myChores.length > 1 ? 's' : ''} to do`}
              </Text>
            </View>
          </View>
          <View className="absolute right-5 top-6">
            <NotificationBell />
          </View>
        </View>

        <View className="-mt-5 px-5">
          {/* Streak / completed pill */}
          {completedToday > 0 && (
            <View className="mb-4 flex-row items-center justify-center rounded-2xl border border-border bg-surface py-3">
              <Ionicons name="trophy-outline" size={18} color="#E08A2C" />
              <Text className="ml-2 text-sm font-bold text-foreground">
                {completedToday} chore{completedToday > 1 ? 's' : ''} done today!
              </Text>
            </View>
          )}

          {/* Chore cards */}
          {myChores.length === 0 ? (
            <View className="mt-6 items-center rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
              <Text className="text-6xl">🎉</Text>
              <Text className="mt-3 text-lg font-extrabold text-emerald-700">All done!</Text>
              <Text className="mt-1 text-sm text-emerald-600">Great job today</Text>
            </View>
          ) : (
            myChores.map((item) => (
              <View
                key={item.id}
                className="mb-3 flex-row items-center rounded-3xl border-2 border-sky-100 bg-surface p-5"
              >
                <Text className="mr-3.5 text-3xl">🧹</Text>
                <Text className="flex-1 text-base font-bold text-foreground">{item.title}</Text>
                <Pressable
                  onPress={() => handleDone(item.id)}
                  className="rounded-2xl bg-emerald-500 px-4.5 py-3"
                >
                  <Text className="text-sm font-extrabold text-white">Done!</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}