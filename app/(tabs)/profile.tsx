import { View, Text, TouchableOpacity, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { ScreenContainer } from '@/components/screen-container';
import { isAdminAccess } from '@/utils';
import { useEffect, useState } from 'react';
import { TierBadge } from '@/components/ui/tier-badge';
import { UpgradePrompt } from '@/components/upgrade-prompt';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  premium?: boolean;
  open: boolean;
};


const LEGAL_ITEMS: MenuItem[] = [
  { icon: 'document-text-outline', label: 'Privacy Policy', route: '/(stack)/privacy-policy', open: true },
  { icon: 'reader-outline', label: 'Terms of Use', route: '/(stack)/terms-of-service', open: true },
];

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signOut } = useAuthStore();
  const { family, currentMember, getAvatarSignedUrl, getFamilyPhotoSignedUrl } = useFamilyStore();
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [familyPhotoSignedUrl, setFamilyPhotoSignedUrl] = useState<string | null>(null);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'module_limit'>('module_limit');

  const isPremium = family?.subscription_tier === 'premium';
  const isAdmin = isAdminAccess(currentMember?.role)

  const MENU_ITEMS: MenuItem[] = [
    { icon: 'people-outline', label: 'Family Members', route: '/(stack)/member-list', open: true, premium: true },
    { icon: 'restaurant-outline', label: 'Meal Planner', route: '/(stack)/meal',open: true, premium: isPremium },
    { icon: 'construct-outline', label: 'Manage Chores', route: '/(stack)/chores',open: true,premium: true },
    { icon: 'calendar-outline', label: 'Calendar (School schedules, Travel plans...) ', route: '/(stack)/calendar', open: true, premium: true },
    { icon: 'images-outline', label: 'Family Media', route: '/(stack)/media-library', open: true, premium: true },
    { icon: 'person-outline', label: 'Account Settings', route: '/(stack)/account-settings',open: true, premium: true },
    // { icon: 'person-outline', label: 'Account Settings', route: '/(stack)/paywall',open: true  },
  ];

  const visibleItems = MENU_ITEMS.filter((item) => !item.premium || isAdmin);

  const handleSignout = () => {
    signOut()
    router.replace('/sign-in')
  }

  useEffect(() => {
    const resolveAvatar = async () => {
      if (currentMember?.avatar_url) {
        const url = await getAvatarSignedUrl(currentMember.avatar_url);
        setAvatarSignedUrl(url);
      }
    };
    resolveAvatar();
  }, [currentMember?.avatar_url]);

  useEffect(() => {
    const resolveFamilyPhoto = async () => {
      if (family?.photo_url) {
        const url = await getFamilyPhotoSignedUrl(family.photo_url);
        setFamilyPhotoSignedUrl(url);
      }
    };
    resolveFamilyPhoto();
  }, [family?.photo_url]);

  const openPremiumModal = () => {
    setUpgradePromptVisible(true)
    setUpgradeReason('module_limit')
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} 
      className="flex-1">
        <View className='flex-1'>
          {/* Family cover photo */}
          <View className="items-center">
            <View className="h-40 w-full">
              {familyPhotoSignedUrl ? (
                <Image source={{ uri: familyPhotoSignedUrl }} 
                className="h-40 w-full" 
                resizeMode='cover'
                />
              ) : (
                <View className="h-40 w-full items-center justify-center bg-primary">
                  <Text className="text-4xl font-bold text-white/90">
                    {family?.name?.charAt(0)?.toUpperCase() ?? 'F'}
                  </Text>
                </View>
              )}
            </View>

            {/* Member avatar badge, overlapping bottom-right of the cover */}
            <View className="absolute bottom-[-28px] right-6">
              {avatarSignedUrl ? (
                <Image
                  source={{ uri: avatarSignedUrl }}
                  className="h-20 w-20 rounded-full border-4 border-background"
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-primary">
                  <Text className="text-xl font-bold text-white">
                    {currentMember?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>
          </View>
            {/* Family name + member info, pushed down to clear the overlapping badge */}
          <View className="mt-10 items-center px-6 pb-4">
            <Text className="text-2xl font-bold text-foreground">{family?.name ?? 'Your Family'}</Text>
            <View className='bg-primary p-0 rounded-full'>
              <TierBadge tier={family?.subscription_tier} />
            </View>
            {currentMember?.name && (
              <Text className="mt-1 text-sm text-muted ">
                Signed in as {currentMember.name} · {currentMember.role}
              </Text>
            )}
            <Pressable 
              onPress={() => router.push('/(stack)/family-settings')} 
              className="mt-3">
                <Text className="text-sm font-semibold text-primary">Edit family name & photo</Text>
            </Pressable>
          </View>

            {/* Menu list */}
            <View className="px-4">
              {visibleItems.map((item, index) => (
                  <TouchableOpacity
                  key={item.route}
                  disabled={!item.open}
                  onPress={() => {
                    if(!item.premium) openPremiumModal()
                    else router.push(item.route as any)
                  }}
                  className={`flex-row items-center justify-between py-5 px-4 bg-surface ${
                      index === 0 ? 'rounded-t-xl' : ''
                  } ${index === visibleItems.length - 1 ? 'rounded-b-xl' : 'border-b border-border'}`}
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  >
                  <View className="flex-row items-center">
                      <Ionicons name={item.icon} size={20} color={colors.foreground} />
                      <Text className="text-base text-foreground ml-3">{item.label}</Text>
                  </View>
                  <View className="flex-row items-center">
                    {!item.premium && <Ionicons name="lock-closed" size={10} 
                    color={colors.muted} style={{marginRight: 2}} />}
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </View>
                  </TouchableOpacity>
              ))}
            </View>

            {/* Legal */}
            <View className="px-4 mt-4">
              {LEGAL_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={item.route}
                  disabled={!item.open}
                  onPress={() => router.push(item.route as any)}
                  className={`flex-row items-center justify-between py-5 px-4 bg-surface ${
                    index === 0 ? 'rounded-t-xl' : ''
                  } ${index === LEGAL_ITEMS.length - 1 ? 'rounded-b-xl' : 'border-b border-border'}`}
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

            {/* Sign out */}
            <View className="px-4 mt-6 mb-10">
                <TouchableOpacity
                    onPress={handleSignout}
                    className="flex-row items-center justify-center py-4 px-4 rounded-xl bg-red-50"
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text className="text-base font-semibold ml-2" style={{ color: colors.error }}>
                    Sign Out
                    </Text>
                </TouchableOpacity>
            </View>
        </View>

      </ScrollView>

      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        reason={upgradeReason}
      />
    </ScreenContainer>
  );
}