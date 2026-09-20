import { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
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

const FILTERS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'pending', label: 'Pending', icon: 'hourglass-outline' },
  { key: 'in_progress', label: 'Active', icon: 'flash-outline' },
  { key: 'completed', label: 'Done', icon: 'checkmark-done-outline' },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

const STATUS_META: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  completed: { color: '#10B981', bg: '#10B98115', icon: 'checkmark-circle', label: 'Done' },
  in_progress: { color: '#F59E0B', bg: '#F59E0B15', icon: 'flash', label: 'In Progress' },
  cancelled: { color: '#EF4444', bg: '#EF444415', icon: 'close-circle', label: 'Cancelled' },
  pending: { color: '#6366F1', bg: '#6366F115', icon: 'hourglass', label: 'Pending' },
};

export default function ChoresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { family, members, currentMember } = useFamilyStore();
  const { user } = useAuthStore();
  const { chores, loading, fetchChores, updateChore, deleteChore } = useChoreStore();

  const [filter, setFilter] = useState<FilterKey>('all');

  const isEditor = isAdminAccess(currentMember?.role);

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

  const stats = useMemo(() => {
    return {
      total: chores.length,
      pending: chores.filter(c => c.status === 'pending').length,
      inProgress: chores.filter(c => c.status === 'in_progress').length,
      completed: chores.filter(c => c.status === 'completed').length,
    };
  }, [chores]);

  const memberName = (id?: string | null) => members?.find((m) => m.id === id)?.name ?? null;

  const handleStatusChange = async (choreId: string, status: ChoreStatus) => {
    try {
      await updateChore(choreId, { status });
    } catch (err) {
      console.error('Failed to update chore:', err);
      Alert.alert('Error', 'Something went wrong updating that chore.');
    }
  };

  const handleDelete = async (choreId: string) => {
    Alert.alert(
      'Delete Chore',
      'Are you sure you want to remove this chore?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChore(choreId);
            } catch (err) {
              console.error('Failed to delete chore:', err);
              Alert.alert('Error', 'Something went wrong deleting that chore.');
            }
          },
        },
      ]
    );
  };

  const isOverdue = (dueDate?: string | null, status?: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Chores" showBack />

      <View className="flex-1">
        {/* HERO SUMMARY BLOCK */}
        <View className="px-5 pt-3 pb-4">
          <View>
            <Text className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Task Central</Text>
            <Text className="text-3xl font-black text-foreground">Family Chores</Text>
          </View>

          {/* STATS GRID */}
          {chores.length > 0 && (
            <View className="flex-row gap-2.5 mt-5">
              <View
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="flex-1 rounded-2xl border p-3"
              >
                <View className="flex-row items-center mb-1.5">
                  <View style={{ backgroundColor: '#6366F115' }} className="w-6 h-6 rounded-lg items-center justify-center mr-1.5">
                    <Ionicons name="list" size={11} color="#6366F1" />
                  </View>
                  <Text className="text-[9px] font-black text-muted uppercase tracking-wider">Total</Text>
                </View>
                <Text className="text-lg font-black text-foreground">{stats.total}</Text>
              </View>

              <View
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="flex-1 rounded-2xl border p-3"
              >
                <View className="flex-row items-center mb-1.5">
                  <View style={{ backgroundColor: '#F59E0B15' }} className="w-6 h-6 rounded-lg items-center justify-center mr-1.5">
                    <Ionicons name="flash" size={11} color="#F59E0B" />
                  </View>
                  <Text className="text-[9px] font-black text-muted uppercase tracking-wider">Active</Text>
                </View>
                <Text className="text-lg font-black text-foreground">{stats.inProgress}</Text>
              </View>

              <View
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="flex-1 rounded-2xl border p-3"
              >
                <View className="flex-row items-center mb-1.5">
                  <View style={{ backgroundColor: '#10B98115' }} className="w-6 h-6 rounded-lg items-center justify-center mr-1.5">
                    <Ionicons name="checkmark" size={11} color="#10B981" />
                  </View>
                  <Text className="text-[9px] font-black text-muted uppercase tracking-wider">Done</Text>
                </View>
                <Text className="text-lg font-black text-foreground">{stats.completed}</Text>
              </View>
            </View>
          )}
        </View>

        {/* FILTER CHIP ROW */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-grow-0 mb-2 mt-2 min-h-[40px]"
          contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center', gap: 4}}
        >
          {FILTERS.map((f) => {
            const isSelected = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={ [
                  {
                    backgroundColor: isSelected ? colors.primary : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border,
                    // opacity: pressed ? 0.85 : 1,
                  },
                ]}
                className="flex-row items-center rounded-2xl border px-3.5 py-2"
              >
                <Ionicons
                  name={f.icon}
                  size={12}
                  color={isSelected ? '#fff' : colors.muted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ color: isSelected ? '#fff' : colors.foreground }}
                  className="text-xs font-black"
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredChores}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="items-center py-16 mt-4 rounded-3xl border border-dashed"
              >
                <View style={{ backgroundColor: `${colors.primary}10` }} className="w-16 h-16 rounded-2xl items-center justify-center mb-4">
                  <Ionicons name="checkmark-done-circle-outline" size={30} color={colors.primary} />
                </View>
                <Text className="text-base font-black text-foreground mb-1">All caught up!</Text>
                <Text className="text-xs text-muted text-center max-w-[220px] leading-relaxed">
                  No chores in this category. Enjoy your break or add a new task.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const status = STATUS_META[item.status] || STATUS_META.pending;
              const isMine = item.assigned_to === currentMember?.id;
              const overdue = isOverdue(item.due_date, item.status);
              const assigneeName = memberName(item.assigned_to);

              return (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: overdue ? '#EF444440' : colors.border,
                    borderLeftColor: status.color,
                    borderLeftWidth: 3,
                  }}
                  className="mb-3 rounded-2xl border p-5"
                >
                  {/* Header row */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center flex-wrap mb-1.5 gap-1.5">
                        {isMine && (
                          <View style={{ backgroundColor: `${colors.primary}15` }} className="flex-row items-center rounded-md px-2 py-0.5">
                            <Ionicons name="person" size={9} color={colors.primary} />
                            <Text style={{ color: colors.primary }} className="text-[9px] font-black ml-1 uppercase tracking-wider">You</Text>
                          </View>
                        )}
                        {overdue && (
                          <View style={{ backgroundColor: '#EF444415' }} className="flex-row items-center rounded-md px-2 py-0.5">
                            <Ionicons name="warning" size={9} color="#EF4444" />
                            <Text className="text-[9px] font-black ml-1 text-red-500 uppercase tracking-wider">Overdue</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm font-black text-foreground leading-snug">{item.title}</Text>
                      {item.description ? (
                        <Text className="mt-1 text-xs text-muted leading-relaxed" numberOfLines={2}>{item.description}</Text>
                      ) : null}
                    </View>

                    <View style={{ backgroundColor: status.bg }} className="flex-row items-center rounded-lg px-2 py-1">
                      <Ionicons name={status.icon} size={10} color={status.color} />
                      <Text style={{ color: status.color }} className="text-[9px] font-black ml-1 uppercase tracking-wider">
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  {/* Meta strip */}
                  <View className="flex-row items-center flex-wrap gap-x-4 gap-y-1.5">
                    {assigneeName && (
                      <View className="flex-row items-center">
                        <Ionicons name="person-circle-outline" size={13} color={colors.muted} />
                        <Text className="ml-1 text-[11px] font-bold text-muted">{assigneeName}</Text>
                      </View>
                    )}
                    {item.due_date && (
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={12} color={overdue ? '#EF4444' : colors.muted} />
                        <Text style={{ color: overdue ? '#EF4444' : colors.muted }} className="ml-1 text-[11px] font-bold">
                          {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    )}
                    {item.frequency && (
                      <View className="flex-row items-center">
                        <Ionicons name="repeat" size={12} color={colors.muted} />
                        <Text className="ml-1 text-[11px] font-bold text-muted capitalize">{item.frequency}</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Bar */}
                  {((isMine || isEditor) && (item.status !== 'completed' && item.status !== 'cancelled')) || isEditor ? (
                    <View className="mt-4 pt-3 flex-row items-center gap-2 flex-wrap border-t" style={{ borderTopColor: colors.border }}>
                      {item.status !== 'completed' && (isMine || isEditor) && (
                        <Pressable
                          onPress={() => handleStatusChange(item.id, 'completed')}
                          style={({ pressed }) => [{ backgroundColor: '#10B981', opacity: pressed ? 0.85 : 1 }]}
                          className="flex-row items-center rounded-xl px-3.5 py-2"
                        >
                          <Ionicons name="checkmark" size={13} color="#fff" />
                          <Text className="ml-1 text-xs font-black text-white">Complete</Text>
                        </Pressable>
                      )}
                      {item.status === 'pending' && (isMine || isEditor) && (
                        <Pressable
                          onPress={() => handleStatusChange(item.id, 'in_progress')}
                          style={({ pressed }) => [{
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            opacity: pressed ? 0.85 : 1,
                          }]}
                          className="flex-row items-center rounded-xl border px-3.5 py-2"
                        >
                          <Ionicons name="play" size={11} color={colors.foreground} />
                          <Text className="ml-1 text-xs font-bold text-foreground">Start</Text>
                        </Pressable>
                      )}
                      {isEditor && item.status !== 'cancelled' && item.status !== 'completed' && (
                        <Pressable
                          onPress={() => handleStatusChange(item.id, 'cancelled')}
                          style={({ pressed }) => [{
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            opacity: pressed ? 0.85 : 1,
                          }]}
                          className="flex-row items-center rounded-xl border px-3 py-2"
                        >
                          <Text className="text-xs font-bold text-muted">Cancel</Text>
                        </Pressable>
                      )}
                      {isEditor && (
                        <Pressable
                          onPress={() => handleDelete(item.id)}
                          style={({ pressed }) => [{
                            backgroundColor: `#EF444410`,
                            opacity: pressed ? 0.85 : 1,
                          }]}
                          className="ml-auto rounded-xl p-2"
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Floating Sticky FAB Bar */}
      {isEditor && (
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          }}
          className="px-5 pt-3 border-t"
        >
          <TouchableOpacity
            onPress={() => router.push('/(stack)/create-chore')}
            style={[{ backgroundColor: colors.primary}]}
            className="flex-row items-center justify-center rounded-2xl py-4 shadow-sm"
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text className="ml-2 text-sm font-black text-white tracking-wide">Create New Chore</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}