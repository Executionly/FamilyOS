import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useChallengeStore } from '@/lib/stores/challenge-store';
import { AppHeader } from '@/components/app-header';

const CADENCE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'A new challenge every week' },
  { value: 'monthly', label: 'Monthly', description: 'A new challenge once a month' },
  { value: 'bimonthly', label: 'Every 2 months', description: 'A new challenge every other month' },
  { value: 'quarterly', label: 'Quarterly', description: 'A new challenge every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'A new challenge once a year' },
  { value: 'surprise', label: 'AI recommended', description: 'Fambound AI decides when' },
];

export default function ChallengeCadenceScreen() {
  const router = useRouter();
  const { family } = useFamilyStore();
  const { setCadence } = useChallengeStore();
  const [selected, setSelected] = useState(family?.challenge_cadence ?? 'surprise');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!family?.id) return;
    setSaving(true);
    try {
      await setCadence(family.id, selected);
      router.back();
    } catch {
      // keep them on the screen if it fails, no silent loss
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader
      title='Challenge Frequency'
      showBack
      />
      <ScrollView className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-5">
          <Text className="text-[13px] leading-relaxed text-[#7C8A94]">
            Choose how often your family gets a new Family Challenge. You're never required to
            accept one — skip anytime.
          </Text>

          <View className="mt-5 overflow-hidden rounded-[18px] border border-[#E7ECEF] bg-white">
            {CADENCE_OPTIONS.map((opt, i) => {
              const isSelected = selected === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelected(opt.value)}
                  className={`flex-row items-center justify-between p-4 ${i > 0 ? 'border-t border-[#E7ECEF]' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-[#11181C]">{opt.label}</Text>
                    <Text className="mt-0.5 text-[12px] text-[#7C8A94]">{opt.description}</Text>
                  </View>
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-[#FE6A50] bg-[#FE6A50]' : 'border-[#E7ECEF]'
                    }`}
                  >
                    {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="mt-6 items-center rounded-xl bg-primary-light py-3.5"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-[14px] font-bold text-white">Save</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}