import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useChallengeStore } from '@/lib/stores/challenge-store';
import { supabase } from '@/lib/_core/supabase';
import { FamilyChallenge } from '@/lib/services/challenge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { CATEGORY_EMOJI } from '@/lib/challenge-emojis';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { members, currentMember, family } = useFamilyStore();
  const { participate, complete, loading: storeLoading } = useChallengeStore();
  const [challenge, setChallenge] = useState<FamilyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState('');

  const fetchChallenge = () => {
    supabase.from('family_challenge').select('*').eq('id', id).single()
      .then(({ data }) => { setChallenge(data); setLoading(false); });
  };

  useEffect(() => { fetchChallenge(); }, [id]);

  if (loading || !challenge) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#044768" /></View>
      </ScreenContainer>
    );
  }

  const participants = (members ?? []).filter((m) => challenge.participant_ids?.includes(m.id));
  const progress = (members ?? []).length > 0 ? participants.length / (members ?? []).length : 0;
  const hasJoined = currentMember?.id ? challenge.participant_ids?.includes(currentMember.id) : false;

  const handleJoin = async () => {
    await participate();
    fetchChallenge();
  };

  const handleComplete = async () => {
    await complete(reflection);
    fetchChallenge();
    setShowReflection(false);
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Challenge Details" showBack />

      <ScrollView className="px-5 pt-2" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient
          colors={['#044768', '#0E86D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 26, overflow: 'hidden' }}
        >
            <View className='p-6 flex-col items-start'>
                <Text style={{ position: 'absolute', right: -10, top: 20, fontSize: 110, opacity: 0.35 }}>
                    {CATEGORY_EMOJI[challenge.category] ?? '✨'}
                </Text>
                <CategoryBadge category={challenge.category} />
                <Text className="mt-4 text-[24px] font-extrabold leading-tight text-white">{challenge.title}</Text>
                <Text className="mt-2 max-w-[90%] text-[14px] leading-relaxed text-white/85">
                    {challenge.description}
                </Text>

                <View className="mt-4 flex-row items-center gap-2">
                    <StatusPillLight status={challenge.status} />
                    {challenge.status === 'accepted' && progress > 0 && (
                    <Text className="text-[12px] font-semibold text-white/80">
                        {Math.round(progress * 100)}% joined
                    </Text>
                    )}
                </View>
                {challenge.status === 'accepted' && progress > 0 && (
                    <View className="mt-2 h-2 w-full max-w-[250px] overflow-hidden rounded-full bg-white/25">
                    <View style={{ width: `${Math.round(progress * 100)}%` }} className="h-full rounded-full bg-white" />
                    </View>
                )}

            </View>
        </LinearGradient>

        {/* Info tiles */}
        <View className="mt-4 flex-row gap-3">
          {challenge.estimated_minutes && (
            <InfoTile icon="time-outline" label="Time together" value={`${challenge.estimated_minutes} minutes`} />
          )}
          {challenge.end_date && (
            <InfoTile icon="calendar-outline" label="Runs through" value={formatDate(challenge.end_date)} />
          )}
        </View>

        {/* Participants */}
        <View className="mt-4 rounded-2xl border border-[#E7ECEF] bg-white p-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="people-outline" size={13} color="#7C8A94" />
            <Text className="text-[11px] font-bold uppercase tracking-wide text-[#7C8A94]">Participants</Text>
          </View>

          {participants.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {participants.map((p) => (
                <View key={p.id} className="flex-row items-center gap-2 rounded-full bg-[#F6F8F9] py-1.5 pl-1.5 pr-3">
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-[#EAF1F5]">
                    <Text className="text-[10px] font-bold text-[#044768]">{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text className="text-[13px] font-semibold text-[#11181C]">{p.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="mt-2 text-[14px] text-[#9AA6AE]">No one has joined yet</Text>
          )}
        </View>

        {/* Reflection */}
        {challenge.status === 'completed' && (challenge.reflection || challenge.reflection_summary) && (
          <View className="mt-4 rounded-2xl bg-[#EAF1F5] p-4">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="sparkles" size={13} color="#044768" />
              <Text className="text-[11px] font-bold uppercase tracking-wide text-[#044768]">Reflection</Text>
            </View>
            {challenge.reflection_summary && (
              <Text className="mt-2 text-[15px] font-semibold italic leading-snug text-[#044768]">
                "{challenge.reflection_summary}"
              </Text>
            )}
            {challenge.reflection && (
              <Text className="mt-2 text-[13px] leading-relaxed text-[#3E5A66]">{challenge.reflection}</Text>
            )}
          </View>
        )}

        {/* Contextual CTA */}
        {challenge.status === 'accepted' && !showReflection && (
          <Pressable
            onPress={hasJoined ? () => setShowReflection(true) : handleJoin}
            disabled={storeLoading}
            className="mt-5 items-center rounded-2xl bg-[#044768] py-3.5"
          >
            <Text className="text-[15px] font-bold text-white">
              {storeLoading ? '...' : hasJoined ? 'Mark as Completed' : 'Join this Challenge'}
            </Text>
          </Pressable>
        )}

        {challenge.status === 'accepted' && showReflection && (
          <View className="mt-5 rounded-2xl border border-[#E7ECEF] bg-white p-4">
            <Text className="text-[13px] font-semibold text-[#11181C]">Nice work completing this together! 🎉</Text>
            <Text className="mt-1 text-[12px] text-[#7C8A94]">What did your family enjoy most? (optional)</Text>
            <TextInput
              value={reflection}
              onChangeText={setReflection}
              placeholder="Share a quick note..."
              multiline
              className="mt-2.5 rounded-xl border border-[#E7ECEF] bg-[#F9FAFB] px-3.5 py-2.5 text-[13px] text-[#11181C]"
            />
            <Pressable onPress={handleComplete} disabled={storeLoading} className="mt-3 self-start rounded-xl bg-[#044768] px-4.5 py-2.5">
              <Text className="text-[13px] font-bold text-white">{storeLoading ? 'Saving...' : 'Save & Finish'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoTile({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-[#E7ECEF] bg-white p-4">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={icon} size={14} color="#7C8A94" />
        <Text className="text-[11px] font-bold uppercase tracking-wide text-[#7C8A94]">{label}</Text>
      </View>
      <Text className="mt-1.5 text-[14px] font-semibold text-[#11181C]">{value}</Text>
    </View>
  );
}

function StatusPillLight({ status }: { status: string }) {
  const label = status === 'accepted' ? 'In Progress' : status === 'completed' ? 'Completed' : 'Skipped';
  return (
    <View className="rounded-full bg-white/20 px-2.5 py-1">
      <Text className="text-[11px] font-bold text-white">{label}</Text>
    </View>
  );
}