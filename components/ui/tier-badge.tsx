import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export function TierBadge({ tier }: { tier?: string }) {
  const isPremium = tier === 'premium';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: isPremium ? '#FE6A50' : 'rgba(255,255,255,0.15)',
        gap: 5,
      }}
    >
      <Ionicons
        name={isPremium ? 'sparkles' : 'ellipse-outline'}
        size={11}
        color="#fff"
      />
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }}>
        {isPremium ? 'PREMIUM' : 'FREE PLAN'}
      </Text>
    </View>
  );
}