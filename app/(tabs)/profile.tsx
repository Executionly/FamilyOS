import { View, Text, TouchableOpacity, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { ScreenContainer } from '@/components/screen-container';
import { isAdminAccess } from '@/utils';
import { useEffect, useState } from 'react';
import { TierBadge } from '@/components/ui/tier-badge';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { DeleteAccountModal } from '@/components/modals/delete-account-modal';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      <View className="flex-1">
        {/* Hero cover */}
        <View className="items-center">
          <View className="h-48 w-full overflow-hidden">
            {familyPhotoSignedUrl ? (
              <Image source={{ uri: familyPhotoSignedUrl }} className="h-48 w-full" resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[colors.primary, 'rgba(0,0,0,0.35)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 192, width: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text className="text-5xl font-bold text-white/90">
                  {family?.name?.charAt(0)?.toUpperCase() ?? 'F'}
                </Text>
              </LinearGradient>
            )}
            {/* Scrim so the avatar/name area reads clearly regardless of photo brightness */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.28)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64 }}
            />
          </View>

          {/* Avatar — gold ring for premium, neutral for free */}
          <View className="absolute bottom-[-32px] right-6">
            <View
              className="rounded-full p-1"
              style={{ backgroundColor: colors.background }}
            >
              <View
                className="rounded-full p-[3px]"
                style={{ backgroundColor: isPremium ? '#F59E0B' : colors.border }}
              >
                {avatarSignedUrl ? (
                  <Image source={{ uri: avatarSignedUrl }} className="h-20 w-20 rounded-full" />
                ) : (
                  <View
                    className="h-20 w-20 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-xl font-bold text-white">
                      {currentMember?.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Identity block */}
        <View className="mt-12 items-center px-6 pb-2">
          <Text className="text-[11px] font-bold tracking-[2px] text-muted">FAMILY</Text>
          <Text className="mt-1 text-[26px] font-extrabold leading-tight text-foreground">
            {family?.name ?? 'Your Family'}
          </Text>

          <View className="mt-2 flex-row items-center gap-1.5 bg-primary rounded-full">
            <TierBadge tier={family?.subscription_tier} />
          </View>

          {currentMember?.name && (
            <Text className="mt-2 text-sm text-muted">
              Signed in as {currentMember.name} · {currentMember.role}
            </Text>
          )}

          <Pressable onPress={() => router.push('/(stack)/family-settings')} className="mt-3">
            <Text className="text-sm font-semibold text-primary">Edit family name & photo</Text>
          </Pressable>
        </View>

        {/* Upgrade CTA — free tier only, prominent placement right below identity */}
        {!isPremium && (
          <View className="mt-4 px-4">
            <Pressable onPress={() => router.push('/(stack)/paywall')}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 20,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#D97706',
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <Ionicons name="sparkles" size={20} color="#fff" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-white">Unlock Premium</Text>
                  <Text className="mt-0.5 text-xs text-white/85">
                    Full AI access, unlimited members & storage
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Account section */}
        <View className="mt-7 px-4">
          <Text className="mb-2 px-1 text-[11px] font-bold tracking-[1.5px] text-muted">ACCOUNT</Text>
          <View
            className="overflow-hidden rounded-2xl"
            style={{
              backgroundColor: colors.surface,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            }}
          >
            {visibleItems.map((item, index) => (
              <TouchableOpacity
                key={item.route}
                disabled={!item.open}
                onPress={() => {
                  if (!item.premium) openPremiumModal();
                  else router.push(item.route as any);
                }}
                className={`flex-row items-center justify-between px-4 py-4 ${
                  index !== visibleItems.length - 1 ? 'border-b' : ''
                }`}
                style={{ borderColor: colors.border }}
              >
                <View className="flex-row items-center">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.primary + '1A' }}
                  >
                    <Ionicons name={item.icon} size={16} color={colors.primary} />
                  </View>
                  <Text className="ml-3 text-base text-foreground">{item.label}</Text>
                </View>
                <View className="flex-row items-center">
                  {!item.premium && (
                    <Ionicons name="lock-closed" size={10} color={colors.muted} style={{ marginRight: 4 }} />
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal section */}
        <View className="mt-6 px-4">
          <Text className="mb-2 px-1 text-[11px] font-bold tracking-[1.5px] text-muted">LEGAL</Text>
          <View
            className="overflow-hidden rounded-2xl"
            style={{
              backgroundColor: colors.surface,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            }}
          >
            {LEGAL_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.route}
                disabled={!item.open}
                onPress={() => router.push(item.route as any)}
                className={`flex-row items-center justify-between px-4 py-4 ${
                  index !== LEGAL_ITEMS.length - 1 ? 'border-b' : ''
                }`}
                style={{ borderColor: colors.border }}
              >
                <View className="flex-row items-center">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.muted + '1A' }}
                  >
                    <Ionicons name={item.icon} size={16} color={colors.muted} />
                  </View>
                  <Text className="ml-3 text-base text-foreground">{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign out — neutral, not styled as a danger action */}
        <View className="mt-7 px-4">
          <TouchableOpacity
            onPress={handleSignout}
            className="flex-row items-center justify-center rounded-2xl py-4"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.foreground} />
            <Text className="ml-2 text-base font-semibold text-foreground">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Delete account — the only red action on this screen */}
        <View className="mt-3 px-4 mb-10">
          <Pressable onPress={() => setShowDeleteModal(true)} className="items-center justify-center py-3">
            <Text className="text-sm font-semibold text-red-500">Delete Account</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>

    <UpgradePrompt visible={upgradePromptVisible} onClose={() => setUpgradePromptVisible(false)} reason={upgradeReason} />

    <DeleteAccountModal
      visible={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      isFoundingAdmin={currentMember?.is_founding_admin ?? false}
    />
  </ScreenContainer>
);
}