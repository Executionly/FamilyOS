// components/dashboard/shared.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import { colors, type as t } from '@/constants/design-tokens';

export function ActivityBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const barW = 20, gap = 10, chartH = 44;
  const totalW = data.length * (barW + gap) - gap;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Svg width={totalW} height={chartH + 18}>
      <G>
        {data.map((val, i) => {
          const barH = Math.max((val / max) * chartH, 4);
          const x = i * (barW + gap);
          const y = chartH - barH;
          return (
            <G key={i}>
              <Rect x={x} y={0} width={barW} height={chartH} rx={5} fill={colors.harborSoft} />
              <Rect x={x} y={y} width={barW} height={barH} rx={5} fill={colors.harbor} opacity={val > 0 ? 1 : 0.25} />
              <SvgText x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={10} fill={colors.muted}>
                {days[i]}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

export function StatCard({
  icon: Icon, label, value, sub, accent = colors.harbor,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: accent + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={18} color={accent} />
      </View>
      <Text style={{ fontFamily: t.display, fontSize: 22, color: colors.harborDeep }}>{value}</Text>
      <Text style={{ fontFamily: t.bodyMedium, fontSize: 12, color: colors.harborDeep, opacity: 0.7, marginTop: 2 }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: t.body, fontSize: 10, color: colors.muted, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <Text style={{ fontFamily: t.displayMedium, fontSize: 16, color: colors.harborDeep }}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={{ fontFamily: t.bodySemibold, fontSize: 12, color: colors.harbor }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export const card = {
  backgroundColor: colors.surface, borderRadius: 20, padding: 20,
  borderWidth: 1, borderColor: colors.border, marginBottom: 16,
} as const;