import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  route: string;
  adminOnly?: boolean;
  open: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();

  const MENU_ITEMS: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Profile',
      description: 'Update your personal information and preferences',
      route: '/(stack)/update-profile',
      adminOnly: false,
      open: true,
    },
    {
      icon: 'notifications-outline',
      label: 'Notification Preferences',
      description: 'Choose what you want to be notified about',
      route: '/(stack)/notification-preference',
      open: true,
    },
    {
      icon: 'lock-closed-outline',
      label: 'Change Password',
      description: 'Update your account security credentials',
      route: '/(stack)/change-password',
      open: true,
    },
  ];

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Account Settings" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 32,
        }}
      >
        {/* Page introduction */}
        <View className="mb-6 flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
              Personal control
            </Text>

            <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Your account
            </Text>

            <Text className="mt-1 text-xs font-medium leading-5 text-muted">
              Manage your profile, notifications, and account security.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: `${colors.primary}14`,
              borderColor: `${colors.primary}28`,
            }}
            className="ml-4 h-12 w-12 items-center justify-center rounded-2xl border"
          >
            <Ionicons
              name="settings-outline"
              size={23}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Settings list */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
            elevation: 2,
          }}
          className="overflow-hidden rounded-[26px] border"
        >
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.route}
              disabled={!item.open}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.72 : 1,
                backgroundColor: pressed
                  ? `${colors.primary}06`
                  : colors.surface,
                borderBottomColor: colors.border,
                borderBottomWidth:
                  index !== MENU_ITEMS.length - 1 ? 1 : 0,
              })}
              className="flex-row items-center px-4 py-4"
            >
              <View
                style={{
                  backgroundColor: `${colors.primary}14`,
                  borderColor: `${colors.primary}24`,
                }}
                className="h-11 w-11 items-center justify-center rounded-2xl border"
              >
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={colors.primary}
                />
              </View>

              <View className="ml-3.5 flex-1 pr-3">
                <Text className="text-sm font-black text-foreground">
                  {item.label}
                </Text>

                <Text className="mt-1 text-[11px] font-medium leading-4 text-muted">
                  {item.description}
                </Text>
              </View>

              <View
                style={{ backgroundColor: colors.background }}
                className="h-8 w-8 items-center justify-center rounded-full"
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.muted}
                />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Security note */}
        <View
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}20`,
          }}
          className="mt-5 flex-row items-start rounded-2xl border px-4 py-3.5"
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={colors.primary}
          />

          <Text className="ml-3 flex-1 text-xs font-medium leading-5 text-muted">
            Keep your account details and password up to date to help protect
            your family space.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
