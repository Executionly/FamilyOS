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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-row items-center justify-between mb-6 px-6 pb-3 border-b border-b-gray-200">
      {showBack && <Pressable onPress={() => router.back()}>
        <Text className="text-primary text-lg font-semibold">← Back</Text>
      </Pressable>}

      {title && <View 
      style={{ flex: 1 }}>
        <Text className='text-center' 
        style={{ color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>}

      {right && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {right}
        </View>
      )}
    </View>
  );
}