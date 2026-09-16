import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  health: { icon: 'walk-outline', label: 'Health' },
  connection: { icon: 'heart-outline', label: 'Connection' },
  gratitude: { icon: 'sunny-outline', label: 'Gratitude' },
  service: { icon: 'gift-outline', label: 'Service' },
  growth: { icon: 'trending-up-outline', label: 'Growth' },
  fun: { icon: 'happy-outline', label: 'Fun' },
  communication: { icon: 'chatbubbles-outline', label: 'Communication' },
  tradition: { icon: 'flower-outline', label: 'Tradition' },
  teamwork: { icon: 'people-outline', label: 'Teamwork' },
  faith: { icon: 'moon-outline', label: 'Faith' },
  creativity: { icon: 'color-palette-outline', label: 'Creativity' },
  responsibility: { icon: 'checkmark-done-outline', label: 'Responsibility' },
  celebration: { icon: 'balloon-outline', label: 'Celebration' },
};

export function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? { icon: 'sparkles-outline', label: category };
  return (
    <View className="flex-row items-center max-w-fit gap-1 rounded-full bg-white/15 px-2.5 py-1">
      <Ionicons name={meta.icon} size={11} color="#fff" />
      <Text className="text-[10px] font-bold text-white">{meta.label}</Text>
    </View>
  );
}