import { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ChoreStatus, useChoreStore } from '@/lib/stores/chore-store';
import { isAdminAccess } from '@/utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type FilterKey = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function ChoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { family, members, currentMember } = useFamilyStore();
  const { user } = useAuthStore();
  const { chores, loading, fetchChores, updateChore, deleteChore } = useChoreStore();

  const [filter, setFilter] = useState<FilterKey>('all');

  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    if (family?.id) fetchChores(family.id);
  }, [family?.id]);

  const filteredChores = useMemo(() => {
    const sorted = [...chores].sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
    if (filter === 'all') return sorted;
    return sorted.filter((c) => c.status === filter);
  }, [chores, filter]);

  const memberName = (id?: string | null) => members?.find((m) => m.id === id)?.name ?? null;

  const handleStatusChange = async (choreId: string, status: ChoreStatus) => {
    try {
      await updateChore(choreId, { status });
    } catch (err) {
      console.error('Failed to update chore:', err);
      alert('Something went wrong updating that chore.');
    }
  };

  const handleDelete = async (choreId: string) => {
    try {
      await deleteChore(choreId);
    } catch (err) {
      console.error('Failed to delete chore:', err);
      alert('Something went wrong deleting that chore.');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
      case 'in_progress': return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-600' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Chores" showBack />
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-grow-0 h-12 mt-1"
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 8 }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-2 ${
              filter === f.key ? 'border-primary bg-primary' : 'border-border bg-surface'
            }`}
          >
            <Text className={`text-xs font-semibold ${filter === f.key ? 'text-white' : 'text-foreground'}`}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredChores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="checkmark-done-circle-outline" size={32} color={colors.muted} />
              <Text className="mt-2 text-sm text-muted">No chores here</Text>
            </View>
          }
          renderItem={({ item }) => {
            const colorSet = statusColor(item.status);
            const isMine = item.assigned_to === currentMember?.id;

            return (
              <View className="mb-3 rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-bold text-foreground">{item.title}</Text>
                    {item.description ? (
                      <Text className="mt-1 text-xs text-muted">{item.description}</Text>
                    ) : null}

                    <View className="mt-2 flex-row flex-wrap items-center gap-2">
                      {item.assigned_to && (
                        <View className="rounded-full bg-primary/10 px-2.5 py-1">
                          <Text className="text-[11px] font-semibold text-primary">
                            {memberName(item.assigned_to) ?? 'Unassigned'}
                          </Text>
                        </View>
                      )}
                      {item.due_date && (
                        <Text className="text-[11px] text-muted">
                          Due {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      )}
                      {item.frequency && (
                        <Text className="text-[11px] text-muted capitalize">· {item.frequency}</Text>
                      )}
                    </View>
                  </View>

                  <View className={`rounded-full px-2.5 py-1 ${colorSet.bg}`}>
                    <Text className={`text-[10px] font-bold capitalize ${colorSet.text}`}>
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="mt-3 flex-row flex-wrap gap-2 border-t border-border pt-3">
                  {item.status !== 'completed' && (isMine || isEditor) && (
                    <Pressable
                      onPress={() => handleStatusChange(item.id, 'completed')}
                      className="flex-row items-center rounded-lg bg-emerald-500 px-3 py-1.5"
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text className="ml-1 text-xs font-semibold text-white">Done</Text>
                    </Pressable>
                  )}
                  {item.status === 'pending' && (isMine || isEditor) && (
                    <Pressable
                      onPress={() => handleStatusChange(item.id, 'in_progress')}
                      className="rounded-lg border border-border px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-foreground">Start</Text>
                    </Pressable>
                  )}
                  {isEditor && item.status !== 'cancelled' && item.status !== 'completed' && (
                    <Pressable
                      onPress={() => handleStatusChange(item.id, 'cancelled')}
                      className="rounded-lg border border-border px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-muted">Cancel</Text>
                    </Pressable>
                  )}
                  {isEditor && (
                    <Pressable
                      onPress={() => handleDelete(item.id)}
                      className="ml-auto flex-row items-center px-2 py-1.5"
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
      {isEditor && (
        <View className="px-4 pt-3"
         style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Pressable
            onPress={() => router.push('/(stack)/create-chore')}
            className="flex-row items-center justify-center rounded-xl bg-primary py-3"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="ml-1.5 text-sm font-bold text-white">Add Chore</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}