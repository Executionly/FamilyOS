import React from 'react';
import { View, Text } from 'react-native';

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  accepted: { label: 'In Progress', bg: '#EAF1F5', text: '#044768' },
  completed: { label: 'Completed', bg: '#E7F7EE', text: '#15803D' },
  abandoned: { label: 'Skipped', bg: '#F1F3F5', text: '#7C8A94' },
};

export function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.accepted;
  return (
    <View style={{ backgroundColor: meta.bg }} className="rounded-full px-2.5 py-1">
      <Text style={{ color: meta.text }} className="text-[11px] font-bold">{meta.label}</Text>
    </View>
  );
}