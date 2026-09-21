import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

export function ExpiredSubscriptionCard() {
  const router = useRouter();
  const colors = useColors();

  return (
    <Pressable
      onPress={() => router.push('/paywall')}
      style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }}
      className="mb-4 flex-row items-center rounded-2xl border p-4"
    >
      <View style={{ backgroundColor: '#FEE2E2' }} className="w-10 h-10 rounded-xl items-center justify-center mr-3">
        <Ionicons name="alert-circle" size={20} color="#DC2626" />
      </View>
      <View className="flex-1">
        <Text style={{ color: '#991B1B' }} className="text-sm font-bold">Your Premium has expired</Text>
        <Text style={{ color: '#B91C1C' }} className="text-xs mt-0.5">
          Renew to keep AI features, unlimited storage, and more.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#DC2626" />
    </Pressable>
  );
}