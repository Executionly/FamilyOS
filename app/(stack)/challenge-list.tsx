import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useFamilyStore } from '@/lib/stores/family-store';
import { getAllChallenges, type FamilyChallenge } from '@/lib/services/challenge';
import { ChallengeCard } from '@/components/challenge-card';
import { MemberAvatarStack } from '@/components/ui/member-avatar-stack';

const FILTERS: { key: 'all' | 'accepted' | 'completed' | 'abandoned'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'accepted', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'abandoned', label: 'Skipped' },
];

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 rounded-2xl border border-[#E7ECEF] bg-white p-3.5">
      <View className="mb-1.5 h-7 w-7 items-center justify-center rounded-lg bg-[#044768]">
        <Text className="text-[12px] font-bold text-white">{value}</Text>
      </View>
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-[#7C8A94]">{label}</Text>
    </View>
  );
}

export default function ChallengesListScreen() {
  const router = useRouter();
  const { family, members } = useFamilyStore();
  const [challenges, setChallenges] = useState<FamilyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'accepted' | 'completed' | 'abandoned'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!family?.id) return;
    getAllChallenges(family.id).then((data) => { setChallenges(data); setLoading(false); });
  }, [family?.id]);

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      const matchesFilter = filter === 'all' || c.status === filter;
      const matchesQuery = c.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [challenges, filter, query]);

  const activeCount = challenges.filter((c) => c.status === 'accepted').length;
  const completedCount = challenges.filter((c) => c.status === 'completed').length;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Challenges" showBack />
      <View className='p-6 flex-1'>
        {loading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color="#044768" /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View className="mb-5">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-[13px] font-semibold uppercase tracking-wide text-[#7C8A94]">
                    {family?.name} Family
                  </Text>
                  <MemberAvatarStack members={members ?? []} />
                </View>

                <View className="flex-row gap-2.5">
                  <StatCard label="Active" value={activeCount} />
                  <StatCard label="Completed" value={completedCount} />
                  <StatCard label="Total" value={challenges.length} />
                </View>

                <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-[#EAF1F5] p-3.5">
                  <Ionicons name="sparkles" size={16} color="#044768" />
                  <Text className="flex-1 text-[12.5px] leading-snug text-[#3E5A66]">
                    <Text className="font-bold">Tip:</Text> Tap any challenge to see details, join in, and
                    leave a family reflection when you finish.
                  </Text>
                </View>

                <View className="mt-5 flex-row items-center rounded-full border border-[#E7ECEF] bg-white px-3.5 py-2.5">
                  <Ionicons name="search" size={16} color="#9AA6AE" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search challenges..."
                    placeholderTextColor="#9AA6AE"
                    className="ml-2.5 flex-1 text-[14px] text-[#11181C]"
                  />
                </View>

                <View className="mt-3 flex-row flex-wrap gap-2">
                  {FILTERS.map((f) => {
                    const isActive = filter === f.key;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        className="rounded-full px-3.5 py-1.5"
                        style={{ backgroundColor: isActive ? '#044768' : '#fff', borderWidth: isActive ? 0 : 1, borderColor: '#E7ECEF' }}
                      >
                        <Text className="text-[13px] font-semibold" style={{ color: isActive ? '#fff' : '#5B6672' }}>
                          {f.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <ChallengeCard
                challenge={item}
                members={members ?? []}
                onSelect={() => router.push(`/(stack)/challenge?id=${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <View className="items-center py-14">
                <Text className="text-[32px]">🔍</Text>
                <Text className="mt-3 text-[15px] font-semibold text-[#11181C]">No challenges found</Text>
                <Text className="mt-1 text-[13px] text-[#7C8A94]">Try a different search term or filter.</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}