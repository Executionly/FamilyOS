import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useFamilyStore } from '@/lib/stores/family-store';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  adminOnly?: boolean;
  open: boolean;
};


export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { currentMember } = useFamilyStore();
  const MENU_ITEMS: MenuItem[] = [
    { icon: 'people-outline', label: 'Profile', route: `/(stack)/update-profile`, adminOnly: false, open: true },
    { icon: 'notifications-outline', label: 'Notification Preferences', route: '/(stack)/notification-preference', open: true  },
    { icon: 'lock-closed-outline', label: 'Change Password', route: '/(stack)/change-password',open: true  },
  ];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Account Settings" showBack />
      <ScrollView showsVerticalScrollIndicator={false} 
      className="flex-1">
        <View className='flex-1'>
            {/* Menu list */}
            <View className="px-4">
            {MENU_ITEMS.map((item, index) => (
                <TouchableOpacity
                key={item.route}
                disabled={!item.open}
                onPress={() => router.push(item.route as any)}
                className={`flex-row items-center justify-between py-5 px-4 bg-surface ${
                    index === 0 ? 'rounded-t-xl' : ''
                } ${index === MENU_ITEMS.length - 1 ? 'rounded-b-xl' : 'border-b border-border'}`}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                <View className="flex-row items-center">
                    <Ionicons name={item.icon} size={20} color={colors.foreground} />
                    <Text className="text-base text-foreground ml-3">{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
            ))}
            </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}