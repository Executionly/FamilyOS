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
      className="w-12 h-12 rounded-full items-center justify-center mr-3 overflow-hidden border-2"
      style={{ backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }}
    >
      {signedUrl ? (
        <Image source={{ uri: signedUrl }} resizeMode="cover" className="w-12 h-12" />
      ) : (
        <Text className="text-sm font-black text-primary">{getInitials(member.name)}</Text>
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
    demoteMember } = useFamilyStore();
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
          <ActivityIndicator size="large" color={colors.primary} />
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
              className="flex-row items-center justify-center py-2 px-4 rounded-xl bg-primary"
            >
              <Ionicons name="person-add" size={14} color="#fff" />
              <Text className="text-white text-xs font-black ml-1.5 uppercase tracking-wider">Add</Text>
            </TouchableOpacity>
          ) : null
        }
        showBack
      />
      <View className="flex-1 px-5 pt-3">
        {/* HERO TITLE BLOCK */}
        <View className="mb-6">
          <Text className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Your Circle</Text>
          <Text className="text-3xl font-black text-foreground">Family Circle</Text>
          <Text className="text-xs text-muted font-medium mt-1">Manage family members, view profiles, and invite contributors.</Text>
        </View>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="items-center justify-center py-16 rounded-3xl border border-dashed">
              <View style={{ backgroundColor: `${colors.primary}10` }} className="w-16 h-16 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="people-outline" size={28} color={colors.primary} />
              </View>
              <Text className="text-base font-black text-foreground mb-1">No family members</Text>
              <Text className="text-xs text-muted text-center max-w-[200px] leading-relaxed">Add profiles or share join codes to assemble your unit.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleFetch} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const isManaged = NO_CODE_AGE_BANDS.includes(item.age_band ?? '');
            const isClaimed = !!item.user_id;
            const isMe = item.user_id === currentMember?.user_id;
            const age = getAge(item.date_of_birth);

            return (
              <Pressable
                onPress={() => router.push(`/(stack)/member-profile?id=${item.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  // borderColor: colors.,
                  opacity: pressed ? 0.85 : 1,
                })}
                className="p-5 rounded-3xl mb-4 border border-gray-200 shadow-xs"
              >
                <View className="flex-row items-center">
                  {/* Avatar Column */}
                  {item.avatar_url ? (
                    <MemberAvatar member={item} colors={colors}/>
                  ) : (
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mr-3 overflow-hidden border-2"
                      style={{ backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }}
                    >
                      <Text className="text-sm font-black text-primary">{getInitials(item.name)}</Text>
                    </View>
                  )}

                  {/* Info Column */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-black text-foreground" numberOfLines={1}>
                        {item.name} {isMe && '(You)'}
                      </Text>
                      
                      <View style={{ backgroundColor: `${colors.primary}10` }} className="px-2.5 py-1 rounded-lg">
                        <Text style={{ color: colors.primary }} className="text-[10px] font-extrabold capitalize tracking-wider">{item.role}</Text>
                      </View>
                    </View>
                    {(age !== null || item.age_band) && (
                      <Text className="text-xs text-muted mt-1 font-semibold capitalize">
                        {age !== null ? `${age} yrs old` : item.age_band}
                      </Text>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 12 }} />
                </View>

                {/* Tags and Custom Status Badges */}
                <View className="flex-row items-center gap-2 flex-wrap mt-2.5">
                  {isManaged ? (
                    <View style={{ backgroundColor: `${colors.muted}15` }} className="flex-row items-center px-2.5 py-1.5 rounded-xl border border-border/40">
                      <Ionicons name="lock-closed" size={11} color={colors.muted} />
                      <Text className="text-[10px] font-bold text-muted ml-1 uppercase">Managed Profile</Text>
                    </View>
                  ) : isClaimed ? (
                    <View style={{ backgroundColor: '#10B98110', borderColor: '#10B98130' }} className="flex-row items-center px-2.5 py-1.5 rounded-xl border">
                      <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                      <Text className="text-[10px] font-black text-emerald-600 ml-1 uppercase">Joined</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }} className="flex-row items-center px-2.5 py-1.5 rounded-xl border">
                      <Ionicons name="mail" size={11} color="#F59E0B" />
                      <Text className="text-[10px] font-black text-amber-600 ml-1 uppercase">Invited</Text>
                    </View>
                  )}

                  {item.is_founding_admin && (
                    <View style={{ backgroundColor: '#D9770615' }} className="flex-row items-center rounded-xl px-2.5 py-1.5">
                      <Ionicons name="star" size={11} color="#D97706" />
                      <Text className="ml-1 text-[10px] font-black text-amber-700 uppercase">Creator</Text>
                    </View>
                  )}
                </View>

                {/* SIGNUP CODE BLOCK */}
                {!isManaged && !isClaimed && item.signup_code && isAdmin && (
                  <View className="mt-4 pt-4 border-t" style={{ borderTopColor: colors.border }}>
                    <Text className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5 ml-1">Share Code to Join</Text>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCopy(item.signup_code!, item.id);
                      }}
                      style={{ backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border }}
                      className="flex-row items-center justify-between px-3.5 py-3 rounded-2xl"
                    >
                      <Text className="text-base font-black tracking-widest text-foreground">
                        {item.signup_code}
                      </Text>
                      <View className="flex-row items-center">
                        {copiedId === item.id ? (
                          <Text className="text-xs text-primary font-black mr-2">Copied!</Text>
                        ) : null}
                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                      </View>
                    </Pressable>
                  </View>
                )}

                {/* INTERACTIVE ACTIONS */}
                {( (item.role === 'member' && isAdmin && isClaimed) || 
                   (item.role === 'admin' && !item.is_founding_admin && isAdmin && isClaimed) || 
                   (!isMe && isClaimed) ) && (
                  <View className="flex-row items-center gap-2 flex-wrap mt-3 pt-3 border-t" style={{ borderTopColor: colors.border }}>
                    {item.role === 'member' && isAdmin && isClaimed && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          confirmPromote(item);
                        }}
                        style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}08` }}
                        className="flex-row items-center rounded-xl border px-3 py-2"
                      >
                        <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                        <Text className="ml-1.5 text-xs font-bold text-primary">Make Admin</Text>
                      </Pressable>
                    )}

                    {item.role === 'admin' && !item.is_founding_admin && isAdmin && isClaimed && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          confirmDemote(item);
                        }}
                        style={{ borderColor: '#EF4444' }}
                        className="flex-row items-center rounded-xl border px-3 py-2"
                      >
                        <Ionicons name="close" size={13} color="#EF4444" />
                        <Text className="ml-1.5 text-xs font-bold text-red-500">Remove Admin</Text>
                      </Pressable>
                    )}

                    {!isMe && isClaimed && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/dm?userId=${item.user_id}`);
                        }}
                        style={{ borderColor: colors.border, backgroundColor: colors.background }}
                        className="flex-row items-center rounded-xl border px-3.5 py-2 ml-auto"
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.foreground} />
                        <Text className="text-xs font-bold text-foreground ml-1.5">Message</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenContainer>
  );
}