import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

type CellValue = string | boolean;

interface ComparisonRow {
  label: string;
  free: CellValue;
  premium: CellValue;
  emphasize?: boolean; // bold styling for price rows
}

interface PlanComparisonTableProps {
  /** e.g. offering?.monthly?.product?.priceString — pass undefined while loading */
  monthlyPriceString?: string;
  /** e.g. offering?.annual?.product?.priceString — pass undefined while loading */
  annualPriceString?: string;
}

export function PlanComparisonTable({
  monthlyPriceString,
  annualPriceString,
}: PlanComparisonTableProps) {
  const colors = useColors();

  const rows: ComparisonRow[] = [
    {
      label: 'Price',
      free: '$0',
      premium: monthlyPriceString ? `${monthlyPriceString}/mo` : '—',
      emphasize: true,
    },
    {
      label: 'Annual',
      free: '$0',
      premium: annualPriceString ? `${annualPriceString}/year` : '—',
      emphasize: true,
    },
    { label: 'Family members', free: 'Maximum 6', premium: 'Unlimited' },
    { label: 'Storage', free: '200 MB', premium: 'Unlimited*', emphasize: true },
    { label: 'Family AI', free: 'Limited', premium: 'Expanded' },
    { label: 'Family Chat', free: true, premium: true },
    { label: 'Family Calendar', free: true, premium: true },
    { label: 'Family Meetings', free: true, premium: true },
    { label: 'Family Foundation', free: true, premium: true },
    { label: 'Family Meals Planner', free: false, premium: true },
    { label: 'Memories', free: true, premium: 'Unlimited' },
    { label: 'Advanced AI recommendations', free: 'Limited', premium: true },
    { label: 'Family planning', free: 'Basic', premium: 'Advanced' },
    { label: 'Family growth insights', free: 'Basic', premium: true },
    { label: 'Legacy features', free: 'Basic', premium: 'Advanced' },
  ];

  const renderCell = (value: CellValue, emphasize?: boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Ionicons name="checkmark" size={16} color={colors.primary} />
      ) : (
        <Text className="text-xs text-muted">—</Text>
      );
    }
    return (
      <Text className={`text-xs ${emphasize ? 'font-bold text-foreground' : 'text-muted'}`}>
        {value}
      </Text>
    );
  };

  return (
    <View className="mb-6 overflow-hidden rounded-2xl border border-border">
      {/* Header row */}
      <View className="flex-row border-b border-border bg-surface px-4 py-3">
        <View className="flex-[1.4]" />
        <View className="flex-1 items-center">
          <Text className="text-xs font-semibold text-muted">Free</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xs font-semibold text-primary">Premium</Text>
        </View>
      </View>

      {rows.map((row, idx) => (
        <View
          key={row.label}
          className={`flex-row items-center px-4 py-3 ${
            idx !== rows.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          <View className="flex-[1.4]">
            <Text className="text-xs text-foreground">{row.label}</Text>
          </View>
          <View className="flex-1 items-center">{renderCell(row.free, row.emphasize)}</View>
          <View className="flex-1 items-center">{renderCell(row.premium, row.emphasize)}</View>
        </View>
      ))}

      <View className="border-t border-border px-4 py-2">
        <Text className="text-[10px] text-muted">*Subject to reasonable-use protections.</Text>
      </View>
    </View>
  );
}