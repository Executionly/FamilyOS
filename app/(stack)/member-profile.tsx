import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ScrollView, Image, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { isAdminAccess } from '@/utils';
import { AppHeader } from '@/components/app-header';
import { ScreenContainer } from '@/components/screen-container';


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
  return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('');
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { family, members, currentMember, promoteMember, demoteMember, getAvatarSignedUrl } = useFamilyStore();
  const [copied, setCopied] = useState(false);
    const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
console.log("id",id)
  const member = members.find((m) => m.id === id);
  const isAdmin = isAdminAccess(currentMember?.role);
  const isMe = member?.user_id === currentMember?.user_id;
  const age = getAge(member?.date_of_birth);
  const isClaimed = !!member?.user_id;

   useEffect(() => {
      const resolveAvatar = async () => {
        if (member && member?.avatar_url) {
          const url = await getAvatarSignedUrl(member.avatar_url);
          setAvatarSignedUrl(url);
        }
      };
      resolveAvatar();
    }, [member]);

  if (!member) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Member" showBack />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted text-base text-center">
            This member couldn't be found. They may have been removed.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleCopy = async () => {
    if (!member.signup_code) return;
    await Clipboard.setStringAsync(member.signup_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmPromote = () => {
    Alert.alert(
      'Make Admin',
      `Make ${member.name} an admin? They'll be able to manage chores, meals, calendar, and members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Make Admin', onPress: () => promoteMember(member.id, family!.id) },
      ]
    );
  };

  const confirmDemote = () => {
    Alert.alert('Remove Admin', `Remove admin access from ${member.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => demoteMember(member.id, family!.id) },
    ]);
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader
        title="Profile"
        showBack
        right={
          isMe || isAdmin ? (
            <Pressable onPress={() => router.push(`/(stack)/update-profile?id=${member.user_id}&memberId=${member.id}&isAdmin=${isAdmin ? "true" : "false"}`)}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : null
        }
      />
      <ScrollView className="flex-1 px-4 pt-2" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Identity block */}
        <View className="items-center pt-4 pb-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center overflow-hidden mb-3"
            style={{ backgroundColor: colors.primary + '20' }}
          >
            {avatarSignedUrl ? (
              <Image source={{ uri: avatarSignedUrl }} className="w-24 h-24" />
            ) : (
              <Text className="text-3xl font-bold text-primary">{getInitials(member.name)}</Text>
            )}
          </View>
          <Text className="text-xl font-bold text-foreground">{member.name}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="px-2.5 py-1 rounded-full bg-primary/10">
              <Text className="text-xs font-medium text-primary capitalize">{member.role}</Text>
            </View>
            {member.is_founding_admin && (
              <View className="flex-row items-center rounded-full bg-amber-50 px-2.5 py-1">
                <Ionicons name="star" size={12} color="#D97706" />
                <Text className="ml-1 text-xs font-semibold text-amber-700">Owner</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bio */}
        {member.bio ? (
          <View
            className="p-4 rounded-xl mb-3 border border-border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text className="text-sm text-foreground leading-5">{member.bio}</Text>
          </View>
        ) : null}

        {/* Details */}
        <View
          className="rounded-xl mb-3 border border-border overflow-hidden"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          {age !== null && (
            <View className="flex-row items-center px-4 py-3 border-b border-border" style={{ borderColor: colors.border }}>
              <Ionicons name="calendar-outline" size={18} color={colors.muted} />
              <Text className="text-sm text-muted ml-3 flex-1">Age</Text>
              <Text className="text-sm font-medium text-foreground">{age} years old</Text>
            </View>
          )}
          {member.age_band && (
            <View className="flex-row items-center px-4 py-3 border-b border-border" style={{ borderColor: colors.border }}>
              <Ionicons name="person-outline" size={18} color={colors.muted} />
              <Text className="text-sm text-muted ml-3 flex-1">Age group</Text>
              <Text className="text-sm font-medium text-foreground capitalize">{member.age_band}</Text>
            </View>
          )}
          {member.phone_number && (
            <View className="flex-row items-center px-4 py-3 border-b border-border" style={{ borderColor: colors.border }}>
              <Ionicons name="call-outline" size={18} color={colors.muted} />
              <Text className="text-sm text-muted ml-3 flex-1">Phone</Text>
              <Text className="text-sm font-medium text-foreground">{member.phone_number}</Text>
            </View>
          )}
          <View className="flex-row items-center px-4 py-3">
            <Ionicons name="time-outline" size={18} color={colors.muted} />
            <Text className="text-sm text-muted ml-3 flex-1">Member since</Text>
            <Text className="text-sm font-medium text-foreground">{formatMemberSince(member.created_at)}</Text>
          </View>
        </View>

        {/* Signup code — unclaimed, admin only */}
        {!isClaimed && member.signup_code && isAdmin && (
          <View className="mb-3">
            <Text className="text-xs text-muted mb-1.5 px-1">Invite code</Text>
            <Pressable
              onPress={handleCopy}
              className="flex-row items-center justify-between px-4 py-3 rounded-xl border border-border"
              style={{ backgroundColor: colors.background, borderColor: colors.border }}
            >
              <Text className="text-base font-bold tracking-widest text-foreground">{member.signup_code}</Text>
              <View className="flex-row items-center">
                {copied && <Text className="text-xs text-primary font-medium mr-1.5">Copied!</Text>}
                <Ionicons name="copy-outline" size={16} color={colors.muted} />
              </View>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View className="gap-2 mt-2">
          {!isMe && isClaimed && (
            <Pressable
              onPress={() => router.push(`/dm?userId=${member.user_id}`)}
              className="flex-row items-center justify-center rounded-xl border border-primary bg-primary/10 py-3"
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text className="ml-2 text-sm font-semibold text-primary">Send Message</Text>
            </Pressable>
          )}

          {member.role === 'member' && isAdmin && (
            <Pressable
              onPress={confirmPromote}
              className="flex-row items-center justify-center rounded-xl border border-primary py-3"
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text className="ml-2 text-sm font-semibold text-primary">Make Admin</Text>
            </Pressable>
          )}

          {member.role === 'admin' && !member.is_founding_admin && isAdmin && (
            <Pressable
              onPress={confirmDemote}
              className="flex-row items-center justify-center rounded-xl border border-red-500 py-3"
            >
              <Text className="text-sm font-semibold text-red-400">Remove Admin Access</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}