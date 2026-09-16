import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryBadge } from '@/components/ui/category-badge';
import { StatusPill } from '@/components/ui/status-pill';
import type { FamilyChallenge } from '@/lib/services/challenge';
import { CATEGORY_EMOJI } from '@/lib/challenge-emojis';
import { MemberAvatarStack } from './ui/member-avatar-stack';

export function ChallengeCard({
  challenge, members, onSelect,
}: {
  challenge: FamilyChallenge;
  members: { id: string; name: string }[];
  onSelect: () => void;
}) {
  const participants = members.filter((m) => challenge.participant_ids?.includes(m.id));
  const progress = members.length > 0 ? participants.length / members.length : 0;

  return (
    <Pressable
      onPress={onSelect}
      className="mb-3 rounded-[22px] border border-[#E7ECEF] bg-white p-4"
    >
      <View className="flex-row items-start justify-between">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF1F5]">
          <Text className="text-[20px]">{CATEGORY_EMOJI[challenge.category] ?? '✨'}</Text>
        </View>
        <StatusPill status={challenge.status} />
      </View>

      <View className="mt-3">
        <CategoryBadge category={challenge.category} />
      </View>

      <Text className="mt-2.5 text-[16px] font-bold leading-snug text-[#11181C]" numberOfLines={1}>
        {challenge.title}
      </Text>
      <Text className="mt-1 text-[13px] leading-relaxed text-[#5B6672]" numberOfLines={2}>
        {challenge.description}
      </Text>

      {challenge.status === 'accepted' && progress > 0 && (
        <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F3F5]">
          <View style={{ width: `${Math.round(progress * 100)}%` }} className="h-full rounded-full bg-[#044768]" />
        </View>
      )}

      <View className="mt-3 flex-row items-center justify-between border-t border-[#F0F3F5] pt-3">
        <MemberAvatarStack members={participants} />
        <View className="flex-row items-center gap-2.5">
          {challenge.estimated_minutes && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={12} color="#7C8A94" />
              <Text className="text-[11px] font-medium text-[#7C8A94]">{challenge.estimated_minutes}m</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#B9C3CA" />
        </View>
      </View>
    </Pressable>
  );
}