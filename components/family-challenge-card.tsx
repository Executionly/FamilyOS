import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useChallengeStore } from '@/lib/stores/challenge-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { CategoryBadge } from './ui/category-badge';
import { MemberAvatarStack } from './ui/member-avatar-stack';
import { router } from 'expo-router';


export function FamilyChallengeCard() {
  const { family, members, currentMember } = useFamilyStore();
  const {
    mode, loading, activeChallenge, candidates, candidateIndex, completedCount,
    load, tryAnother, accept, complete, participate,skip
  } = useChallengeStore();
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState('');

  const isPremium = family?.subscription_tier === 'premium';

  useEffect(() => {
    if (family?.id) load(family.id, isPremium);
  }, [family?.id]);

  /* ---------------------------- Loading skeleton --------------------------- */
  if (mode === 'idle' && loading) {
    return (
      <View className="mb-4 rounded-[22px] border border-[#E7ECEF] bg-white p-5">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF1F5]">
            <ActivityIndicator size="small" color="#044768" />
          </View>
          <View className="flex-1 gap-1.5">
            <View className="h-2.5 w-32 rounded-full bg-[#E7ECEF]" />
            <View className="h-2 w-40 rounded-full bg-[#F1F3F5]" />
          </View>
        </View>
        <Text className="mt-4 text-center text-xs font-medium text-[#9CA3AF]">
          Finding today's family challenge…
        </Text>
      </View>
    );
  }

  /* ------------------------------ Waiting state ----------------------------- */
  if (mode === 'waiting') {
    return (
      <View className="mb-4 items-center rounded-[22px] border border-dashed border-[#D1D9DE] bg-[#FBFBFA] p-6">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white" style={{ elevation: 1 }}>
          <Ionicons name="compass-outline" size={20} color="#9CA3AF" />
        </View>
        <Text className="mt-3 text-sm font-semibold text-[#4B5563]">Getting to know your family</Text>
        <Text className="mt-1 max-w-[280px] text-center text-[13px] leading-relaxed text-[#9CA3AF]">
          No pressure — once it's time, a new family challenge will show up right here.
        </Text>
        <View className='mt-5 flex-row items-center'>
          <Pressable
            onPress={() => router.push('/(stack)/challenge-cadence')}
            className="mr-2 flex-row items-center gap-2 rounded-xl bg-primary-light px-5 py-2"
          >
            <Ionicons name="settings-sharp" size={16} color="#fff" />
            <Text className="text-[13px] font-bold text-white">Update settings</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(stack)/challenge-list')}
            className="flex-row items-center gap-1.5 rounded-xl bg-[#FE6A50] px-5 py-2"
          >
            <Text className="text-[13px] font-bold text-[#fff]">View challenges</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  /* ------------------------------ Celebrating ------------------------------- */
  if (mode === 'celebrating') {
    return (
      <LinearGradient
        colors={['#044768', '#0a5c81', '#0d3b52']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="mb-4 rounded-[22px] p-6"
        style={{ borderRadius: 22,marginBottom: 8 }}
      >
        <View className="items-center p-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <Ionicons name="sparkles" size={24} color="#FFC98B" />
          </View>
          <Text className="mt-4 text-lg font-bold text-white">Challenge complete!</Text>
          <Text className="mx-auto mt-1 max-w-[260px] text-center text-[13px] text-white/70">
            Nice work — that's {completedCount} {completedCount === 1 ? 'challenge' : 'challenges'} your
            family has done together.
          </Text>

          <View className='flex-row items-center mt-6'>
            <Pressable
              onPress={() => family?.id && load(family.id, isPremium)}
              className="flex-row items-center gap-1.5 rounded-xl bg-white px-5 py-2 mr-2"
            >
              <Text className="text-[13px] font-bold text-[#044768]">Find the next challenge</Text>
              <Ionicons name="chevron-forward" size={14} color="#044768" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(stack)/challenge-list')}
              className="flex-row items-center gap-1.5 rounded-xl bg-[#FE6A50] px-5 py-2"
            >
              <Text className="text-[13px] font-bold text-[#fff]">View challenges</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  /* -------------------------------- Active ---------------------------------- */
  if (mode === 'active' && activeChallenge) {
    return (
      <LinearGradient
        colors={['#044768', '#065779', '#03354a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, marginBottom: 8 }}
        
      >
        <View className="mb-4 p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <Ionicons name="sparkles" size={16} color="#FFC98B" />
              </View>
              <Text className="text-[11px] font-extrabold tracking-wide text-white/70">
                FAMILY CHALLENGE
              </Text>
            </View>
            <View className='flex-row items-center'>
              <CategoryBadge category={activeChallenge.category} />
              <Pressable
                onPress={() => router.push('/(stack)/challenge-cadence')}
                className="ml-2"
              >
                <Ionicons name="settings-sharp" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>

          <Text className="mt-3.5 text-xl font-bold leading-snug text-white">
            {activeChallenge.title}
          </Text>
          <Text className="mt-2 text-[13.5px] leading-relaxed text-white/80">
            {activeChallenge.description}
          </Text>

          <View className="mt-4 flex-row items-center gap-2">
            {activeChallenge.estimated_minutes && (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.6)" />
                <Text className="text-[12px] font-medium text-white/60">
                  {activeChallenge.estimated_minutes} min
                </Text>
              </View>
            )}
            <MemberAvatarStack members={members ?? []} />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[12px] font-medium text-white/60">
              {activeChallenge.participant_ids?.length ?? 0} of {(members ?? []).length} joined
            </Text>
            <Pressable onPress={() => router.push(`/(stack)/challenge?id=${activeChallenge.id}`)}>
              <Text className="text-[12px] font-bold text-white underline">View Challenge</Text>
            </Pressable>
          </View>

          {currentMember?.id && !activeChallenge.participant_ids?.includes(currentMember.id) && (
            <Pressable
              onPress={() => participate()}
              className="mt-4 mr-2 self-start rounded-xl bg-white/15 px-4.5 py-2.5"
            >
              <Text className="text-[13px] font-bold text-white">I'm In</Text>
            </Pressable>
          )}
          {!showReflection ? (
            <View>
              <Pressable
                onPress={() => setShowReflection(true)}
                className="mt-5 flex-row items-center gap-2 self-start rounded-xl bg-[#FE6A50] px-5 py-2"
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text className="text-[13px] font-bold text-white">Mark Complete</Text>
              </Pressable>
              <Pressable onPress={() => family?.id && skip(family.id, isPremium)} className="mt-4 ml-3">
                <Text className="text-[13px] font-semibold text-white/60">Skip</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-5 rounded-2xl bg-white/[0.08] p-4">
              <Text className="text-[13px] font-semibold text-white">
                Nice work completing this together! 🎉
              </Text>
              <Text className="mt-1 text-[12px] text-white/60">
                What did your family enjoy most? (optional)
              </Text>
              <TextInput
                value={reflection}
                onChangeText={setReflection}
                placeholder="Share a quick note..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={2}
                className="mt-2.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-[13px] text-white"
              />
              <View className="mt-3 flex-row items-center gap-2">
                <Pressable
                  onPress={() => { complete(reflection); setShowReflection(false); setReflection(''); }}
                  disabled={loading}
                  className="flex-row items-center gap-1.5 rounded-xl bg-[#FE6A50] px-4 py-2.5"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={13} color="#fff" />
                  )}
                  <Text className="text-[13px] font-bold text-white">
                    {loading ? 'Saving...' : 'Save & Finish'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setShowReflection(false)} className="px-3.5 py-2.5">
                  <Text className="text-[13px] font-semibold text-white/60">Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>
      </LinearGradient>
    );
  }

  /* ------------------------------- Suggesting -------------------------------- */
  if (mode === 'suggesting' && candidates.length > 0) {
    const current = candidates[candidateIndex];
    return (
      <LinearGradient
        colors={['#FE6A50', '#fb6f52', '#e85a3f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, marginBottom: 8 }}
      >
        <View className='p-4'>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                <Ionicons name="sparkles" size={16} color="#fff" />
              </View>
              <Text className="text-[11px] font-extrabold tracking-wide text-white/80">
                FAMILY CHALLENGE
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {isPremium && (
                <View className="flex-row items-center gap-1 rounded-full bg-white/15 px-2 py-1">
                  <Ionicons name="sparkles" size={10} color="#fff" />
                  <Text className="text-[10px] font-bold text-white">PREMIUM</Text>
                </View>
              )}
              <CategoryBadge category={current.category} />
            </View>
          </View>

          <Text className="mt-3.5 text-xl font-bold leading-snug text-white">{current.title}</Text>
          <Text className="mt-2 text-[13.5px] leading-relaxed text-white/85">{current.description}</Text>

          {current.estimated_minutes && (
            <View className="mt-3 flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text className="text-[12px] font-medium text-white/70">
                {current.estimated_minutes} min together
              </Text>
            </View>
          )}

          <View className="mt-5 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2.5">
              <Pressable
                onPress={() => family?.id && accept(family.id)}
                disabled={loading}
                className="flex-row items-center rounded-xl bg-white px-2 py-2.5"
              >
                <Ionicons name="checkmark-circle" size={15} color="#FE6A50" />
                <Text className="text-[13px] font-bold text-[#FE6A50] ml-1">Accept Challenge</Text>
              </Pressable>
              <Pressable
                onPress={() => family?.id && tryAnother(family.id, isPremium)}
                disabled={loading}
                className="flex-row items-center gap-1.5 px-2 py-2.5"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh" size={14} color="#fff" />
                )}
                <Text className="text-[13px] font-bold text-white/90">
                  {loading ? 'Loading...' : 'Try Another'}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-1.5">
              {candidates.map((_, i) => (
                <View
                  key={i}
                  className={`h-1.5 rounded-full ${i === candidateIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/35'}`}
                />
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return null;
}