import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function AppHeader({ title, subtitle, showBack = false, onBack, right }: AppHeaderProps) {
  const router = useRouter();
  const colors = useColors();

  return (
    <View
      style={{ borderBottomColor: colors.border, backgroundColor: colors.background }}
      className="flex-row items-center justify-between mb-4 px-5 pb-3.5 pt-1 border-b"
    >
      <View style={{ minWidth: 44 }}>
        {showBack && (
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={8}
            style={({ pressed }) => [
              { backgroundColor: colors.primary + '14', opacity: pressed ? 0.7 : 1 },
            ]}
            className="flex-row items-center rounded-full py-1.5 pl-1 pr-3 self-start"
          >
            <View
              style={{ backgroundColor: colors.primary + '1F' }}
              className="w-7 h-7 rounded-full items-center justify-center mr-1"
            >
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </View>
            <Text style={{ color: colors.primary }} className="text-sm font-semibold">
              Back
            </Text>
          </Pressable>
        )}
      </View>

      {title ? (
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.foreground, fontSize: 17, fontWeight: '800', lineHeight: 21 }}
            className="text-center"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              numberOfLines={1}
              style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}
              className="text-center"
            >
              {subtitle}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={{ minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {right}
      </View>
    </View>
  );
}