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
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { supabase } from '@/lib/_core/supabase';
import { ExpiredSubscriptionCard } from '@/components/ExpiredSubscriptionCard';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  description?: string;
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
  const { tier, expiresAt } = useSubscriptionStore();
  const [subStatus, setSubStatus] = useState<string | null>(null);

  const MENU_ITEMS: MenuItem[] = [
    { icon: 'people-outline', label: 'Family Members', description: 'Add, invite, and manage everyone in your family', route: '/(stack)/member-list', open: true, premium: true },
    { icon: 'restaurant-outline', label: 'Meal Planner', description: "Plan meals and build your family's weekly menu", route: '/(stack)/meal', open: true, premium: isPremium },
    { icon: 'construct-outline', label: 'Manage Chores', description: "Assign chores and track who's completed what", route: '/(stack)/chores', open: true, premium: true },
    { icon: 'game-controller-outline', label: 'Family Games', description: 'Play games together as a family', route: '/(stack)/games', open: true, premium: true },    
    { icon: 'calendar-outline', label: 'Calendar (School schedules, Travel plans...) ', description: 'School schedules, appointments, travel plans, birthdays & more', route: '/(stack)/calendar', open: true, premium: true },
    { icon: 'trophy-outline', label: 'Family Challenges', description: 'Accept fun, values-based challenges as a family', route: '/(stack)/challenge-list', open: true, premium: true },    
    { icon: 'images-outline', label: 'Family Media', description: "Store and browse your family's photos and videos", route: '/(stack)/media-library', open: true, premium: true },
    { icon: 'person-outline', label: 'Account Settings', description: 'Manage your profile, subscription, and account', route: '/(stack)/account-settings', open: true, premium: true },
    {
      label: 'Guide',
      icon: 'book-outline',
      description: 'Learn what you can do in the app and where to find it',
      route: '/(stack)/guide',
      premium: true,
      open: true,
    },
  ];

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

  useEffect(() => {
    if (family?.id) {
      supabase.from('family').select('subscription_status').eq('id', family.id).single()
        .then(({ data }) => setSubStatus(data?.subscription_status ?? null));
    }
  }, [family?.id]);

  const showExpiredCard = subStatus === 'expired' && tier === 'free';

  const openPremiumModal = () => {
    setUpgradePromptVisible(true)
    setUpgradeReason('module_limit')
  }

return (
  <ScreenContainer
    containerClassName="bg-background"
    safeAreaClassName="bg-background"
  >
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Family identity hero */}
      <View className="px-4 pt-4">
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 18,
            elevation: 4,
          }}
          className="overflow-hidden rounded-[28px] border"
        >
          <View className="h-[164px] w-full overflow-hidden">
            {familyPhotoSignedUrl ? (
              <Image
                source={{ uri: familyPhotoSignedUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[colors.primary, `${colors.primary}B8`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: '100%',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="people"
                  size={38}
                  color="rgba(255,255,255,0.85)"
                />

                <Text className="mt-2 text-[10px] font-black uppercase tracking-[2px] text-white/80">
                  Family space
                </Text>
              </LinearGradient>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 82,
              }}
            />

            <View className="absolute left-5 top-5">
              <View className="rounded-full bg-black/20 px-3 py-1.5">
                <Text className="text-[10px] font-black uppercase tracking-[1.4px] text-white">
                  Family profile
                </Text>
              </View>
            </View>
          </View>

          {/* Avatar */}
          <View className="absolute right-5 top-[116px]">
            <View
              style={{
                backgroundColor: colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.2,
                shadowRadius: 9,
                elevation: 5,
              }}
              className="rounded-full p-1.5"
            >
              <View
                className="rounded-full p-[3px]"
                style={{
                  backgroundColor: isPremium
                    ? '#F59E0B'
                    : colors.primary,
                }}
              >
                {avatarSignedUrl ? (
                  <Image
                    source={{ uri: avatarSignedUrl }}
                    className="h-[68px] w-[68px] rounded-full"
                  />
                ) : (
                  <View
                    className="h-[68px] w-[68px] items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-2xl font-black text-white">
                      {currentMember?.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {isPremium && (
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  borderColor: colors.surface,
                }}
                className="absolute bottom-0 left-0 h-6 w-6 items-center justify-center rounded-full border-2"
              >
                <Ionicons name="star" size={11} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Identity */}
          <View className="px-5 pb-5 pt-2">
            <View className="pr-20">

              <Text
                numberOfLines={1}
                className="mt-1 text-[25px] font-black tracking-tight text-foreground"
              >
                {family?.name ?? 'Your Family'}
              </Text>
            </View>

            {currentMember?.name && (
              <Text className="mt-1 text-xs font-medium text-muted">
                Signed in as {currentMember.name} · {currentMember.role}
              </Text>
            )}

            <View className="mt-2 flex-row items-center justify-between">
              <TierBadge tier={family?.subscription_tier} />

              <Pressable
                onPress={() =>
                  router.push('/(stack)/family-settings')
                }
                style={({ pressed }) => ({
                  opacity: pressed ? 0.55 : 1,
                })}
                className="flex-row items-center"
              >
                <Text
                  style={{ color: colors.primary }}
                  className="text-xs font-black"
                >
                  Edit family profile
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.primary}
                  style={{ marginLeft: 4 }}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Subscription status */}
      <View className="px-4">
        {showExpiredCard && (
          <View className="mt-4">
            <ExpiredSubscriptionCard />
          </View>
        )}

        {!isPremium && !showExpiredCard && (
          <Pressable
            onPress={() => router.push('/(stack)/paywall')}
            style={({ pressed }) => ({
              opacity: pressed ? 0.86 : 1,
              shadowColor: '#D97706',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 12,
              elevation: 4,
            })}
            className="mt-4 overflow-hidden rounded-[22px]"
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-row items-center px-4 py-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-sm font-black text-white">
                  Unlock Premium
                </Text>

                <Text className="mt-0.5 text-[11px] font-medium text-white/80">
                  Full AI access, unlimited members & storage
                </Text>
              </View>

              <View className="h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="#FFFFFF"
                />
              </View>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Account section */}
      <View className="mt-6 px-4">
        <View className="mb-3 flex-row items-end justify-between px-1">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
              Workspace
            </Text>

            <Text className="mt-1 text-lg font-black text-foreground">
              Family tools
            </Text>
          </View>

          <Ionicons
            name="grid-outline"
            size={18}
            color={colors.muted}
          />
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
          className="overflow-hidden rounded-[24px] border"
        >
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              disabled={!item.open}
              onPress={() => {
                if (!item.premium) {
                  openPremiumModal();
                } else {
                  router.push(item.route as any);
                }
              }}
              activeOpacity={0.7}
              className="flex-row items-center px-4 py-3.5"
              style={{
                borderBottomWidth:
                  index !== MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  backgroundColor: `${colors.primary}12`,
                  borderColor: `${colors.primary}22`,
                }}
                className="h-10 w-10 items-center justify-center rounded-xl border"
              >
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View className="ml-3 flex-1 pr-3">
                <View className="flex-row items-center">
                  <Text
                    numberOfLines={1}
                    className="flex-shrink text-sm font-bold text-foreground"
                  >
                    {item.label}
                  </Text>

                  {!item.premium && (
                    <View
                      style={{ backgroundColor: `${colors.primary}14` }}
                      className="ml-2 rounded-full px-1.5 py-0.5"
                    >
                      <Text
                        style={{ color: colors.primary }}
                        className="text-[8px] font-black uppercase"
                      >
                        Premium
                      </Text>
                    </View>
                  )}
                </View>

                {!!item.description && (
                  <Text
                    numberOfLines={1}
                    className="mt-1 text-[11px] font-medium text-muted"
                  >
                    {item.description}
                  </Text>
                )}
              </View>

              <View
                style={{ backgroundColor: colors.background }}
                className="h-8 w-8 items-center justify-center rounded-full"
              >
                <Ionicons
                  name={
                    !item.premium
                      ? 'lock-closed-outline'
                      : 'chevron-forward'
                  }
                  size={!item.premium ? 13 : 15}
                  color={colors.muted}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Legal section */}
      <View className="mt-6 px-4">
        <Text className="mb-3 px-1 text-[10px] font-black uppercase tracking-[1.6px] text-muted">
          Legal
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
          className="overflow-hidden rounded-[22px] border"
        >
          {LEGAL_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.route}
              disabled={!item.open}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
              className="flex-row items-center px-4 py-3.5"
              style={{
                borderBottomWidth:
                  index !== LEGAL_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{ backgroundColor: `${colors.muted}14` }}
                className="h-9 w-9 items-center justify-center rounded-xl"
              >
                <Ionicons
                  name={item.icon}
                  size={17}
                  color={colors.muted}
                />
              </View>

              <Text className="ml-3 flex-1 text-sm font-semibold text-foreground">
                {item.label}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={15}
                color={colors.muted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Account actions */}
      <View className="mt-7 px-4">
        <TouchableOpacity
          onPress={handleSignout}
          activeOpacity={0.7}
          className="flex-row items-center justify-center rounded-2xl border py-4"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.foreground}
          />

          <Text className="ml-2 text-sm font-black text-foreground">
            Sign Out
          </Text>
        </TouchableOpacity>

        <Pressable
          onPress={() => setShowDeleteModal(true)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
          })}
          className="items-center justify-center py-4"
        >
          <Text className="text-xs font-bold text-red-500">
            Delete Account
          </Text>
        </Pressable>
      </View>
    </ScrollView>

    <UpgradePrompt
      visible={upgradePromptVisible}
      onClose={() => setUpgradePromptVisible(false)}
      reason={upgradeReason}
    />

    <DeleteAccountModal
      visible={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      isFoundingAdmin={currentMember?.is_founding_admin ?? false}
    />
  </ScreenContainer>
);

}