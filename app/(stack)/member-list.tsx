import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/use-colors';
import { Member, useFamilyStore } from '@/lib/stores/family-store';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { isAdminAccess } from '@/utils';
import { Image } from 'react-native';

const NO_CODE_AGE_BANDS = ['toddler', 'child', 'preteen'];

function getAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

const avatarUrlCache = new Map<string, string>();

function MemberAvatar({ member, colors }: { 
  member: Member; 
  colors: ReturnType<typeof useColors>;
}) {
  const { getAvatarSignedUrl } = useFamilyStore();
  const [signedUrl, setSignedUrl] = useState<string | null>(
    member.avatar_url ? avatarUrlCache.get(member.avatar_url) ?? null : null
  );

  useEffect(() => {
    let cancelled = false;
    if (!member.avatar_url) {
      setSignedUrl(null);
      return;
    }
    const cached = avatarUrlCache.get(member.avatar_url);
    if (cached) {
      setSignedUrl(cached);
      return;
    }
    getAvatarSignedUrl(member.avatar_url).then((url) => {
      if (url) avatarUrlCache.set(member.avatar_url!, url);
      if (!cancelled) setSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [member.avatar_url, getAvatarSignedUrl]);

  return (
    <View
      className="w-11 h-11 rounded-full items-center justify-center mr-3 overflow-hidden"
      style={{ backgroundColor: colors.primary + '20' }}
    >
      {signedUrl ? (
        <Image source={{ uri: signedUrl }} resizeMode="cover" className="w-11 h-11" />
      ) : (
        <Text className="text-sm font-bold text-primary">{getInitials(member.name)}</Text>
      )}
    </View>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, members, 
    loading, fetchMembers, 
    currentMember, promoteMember, 
    demoteMember, getAvatarSignedUrl } = useFamilyStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = isAdminAccess(currentMember?.role);

  useEffect(() => {
    if (family?.id) fetchMembers(family.id);
  }, [family?.id]);

  const handleFetch = () => {
    if (!family?.id) return;
    setRefreshing(true);
    try {
      fetchMembers(family.id);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopy = async (code: string, memberId: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedId(memberId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const confirmPromote = (member: Member) => {
    Alert.alert(
      'Make Admin',
      `Make ${member.name} an admin? They'll be able to manage chores, meals, calendar, and members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Make Admin', onPress: () => promoteMember(member.id, family!.id) },
      ]
    );
  };

  const confirmDemote = (member: Member) => {
    Alert.alert(
      'Remove Admin',
      `Remove admin access from ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => demoteMember(member.id, family!.id) },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader
        title="Members"
        right={
          isAdmin ? (
            <TouchableOpacity
              onPress={() => router.push('/(stack)/add-member')}
              className="flex-row items-center justify-center py-2 px-3 rounded-xl bg-primary"
            >
              <Ionicons name="person-add-outline" size={15} color="#fff" />
              <Text className="text-white text-sm font-semibold ml-2">Add</Text>
            </TouchableOpacity>
          ) : null
        }
        showBack
      />
      <View className="flex-1 px-4 pt-4">
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-muted text-base">No members yet</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleFetch} />}
          renderItem={({ item }) => {
            const isManaged = NO_CODE_AGE_BANDS.includes(item.age_band ?? '');
            const isClaimed = !!item.user_id;
            const isMe = item.user_id === currentMember?.user_id;
            const age = getAge(item.date_of_birth);

            return (
              <Pressable
                onPress={() => router.push(`/(stack)/member-profile?id=${item.id}`)}
                className="p-4 rounded-xl mb-3 border border-border"
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View className="flex-row items-center">
                  {/* Avatar */}
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center mr-3 overflow-hidden"
                    style={{ backgroundColor: colors.primary + '20' }}
                  >
                    {item.avatar_url ? (
                      <MemberAvatar member={item} colors={colors}/>
                    ) : (
                      <Text className="text-sm font-bold text-primary">{getInitials(item.name)}</Text>
                    )}
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                      <View className="px-2 py-1 rounded-full bg-primary/10">
                        <Text className="text-xs font-medium text-primary capitalize">{item.role}</Text>
                      </View>
                    </View>
                    {(age !== null || item.age_band) && (
                      <Text className="text-xs text-muted mt-0.5 capitalize">
                        {age !== null ? `${age} years old` : item.age_band}
                      </Text>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ marginLeft: 8 }} />
                </View>

                <View className="flex-row items-center gap-2 flex-wrap mt-2">
                  {item.role === 'member' && isAdmin &&  isClaimed &&(
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmPromote(item);
                      }}
                      className="mt-2 flex-row items-center rounded-lg border border-primary bg-primary/10 px-3 py-1.5 self-start"
                    >
                      <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                      <Text className="ml-1.5 text-xs font-semibold text-primary">Make Admin</Text>
                    </Pressable>
                  )}

                  {item.role === 'admin' && !item.is_founding_admin && isAdmin && isClaimed && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmDemote(item);
                      }}
                      className="mt-2 flex-row items-center rounded-lg border border-red-500 px-3 py-1.5 self-start"
                    >
                      <Text className="text-xs font-semibold text-red-400">Remove Admin</Text>
                    </Pressable>
                  )}

                  {item.is_founding_admin && (
                    <View className="mt-2 flex-row items-center self-start rounded-lg bg-amber-50 px-3 py-1.5">
                      <Ionicons name="star" size={12} color="#D97706" />
                      <Text className="ml-1 text-xs font-semibold text-amber-700">Owner</Text>
                    </View>
                  )}

                  {!isMe && isClaimed && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/dm?userId=${item.user_id}`);
                      }}
                      className="mt-2 flex-row items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 self-start"
                    >
                      <Ionicons name="chatbubble-outline" size={13} color={colors.primary} />
                      <Text className="text-xs font-semibold text-primary">Message</Text>
                    </Pressable>
                  )}
                </View>

                {isManaged ? (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
                    <Text className="text-xs text-muted ml-1">Managed profile — no login</Text>
                  </View>
                ) : isClaimed ? (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="checkmark-circle" size={14} color={colors.success ?? 'green'} />
                    <Text className="text-xs text-muted ml-1">Joined</Text>
                  </View>
                ) : item.signup_code && isAdmin ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCopy(item.signup_code!, item.id);
                    }}
                    className="flex-row items-center justify-between mt-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text className="text-base font-bold tracking-widest text-foreground">
                      {item.signup_code}
                    </Text>
                    <View className="flex-row items-center">
                      {copiedId === item.id ? (
                        <Text className="text-xs text-primary font-medium mr-1">Copied!</Text>
                      ) : null}
                      <Ionicons name="copy-outline" size={16} color={colors.muted} />
                    </View>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenContainer>
  );
}