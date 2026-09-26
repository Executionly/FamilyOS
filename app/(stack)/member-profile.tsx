import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { isAdminAccess } from '@/utils';
import { AppHeader } from '@/components/app-header';
import { ScreenContainer } from '@/components/screen-container';
import {
  PRODUCTIVITY_ENERGY_CONTENT,
  TEMPERAMENT_CONTENT,
} from '@/lib/result-content';
import {
  ProductivityEnergy,
  TemperamentType,
} from '@/types';

function formatMemberRole(role?: string) {
  if (!role) return 'Not specified';

  return role
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAgeBand(ageBand?: string) {
  if (!ageBand) return 'Not specified';

  return ageBand
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;

  const birth = new Date(dateOfBirth);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatMemberSince(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function formatAssessmentDate(dateString?: string | null) {
  if (!dateString) return 'Completed';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Completed';
  }

  return `Completed ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function ProfileStatus({
  completed,
  colors,
}: {
  completed: boolean;
  colors: any;
}) {
  return (
    <View
      style={{
        backgroundColor: completed
          ? '#10B98112'
          : `${colors.muted}12`,
        borderColor: completed
          ? '#10B98135'
          : `${colors.muted}25`,
      }}
      className="flex-row items-center rounded-full border px-3 py-1.5"
    >
      <Ionicons
        name={completed ? 'checkmark-circle' : 'ellipse-outline'}
        size={13}
        color={completed ? '#10B981' : colors.muted}
      />

      <Text
        style={{
          color: completed ? '#059669' : colors.muted,
        }}
        className="ml-1.5 text-[9px] font-black uppercase tracking-wider"
      >
        {completed ? 'Assessment complete' : 'Assessment pending'}
      </Text>
    </View>
  );
}

function InsightTile({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: `${colors.primary}22`,
      }}
      className="min-w-0 flex-1 rounded-2xl border px-3 py-3"
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={15} color={colors.primary} />

        <Text className="ml-1.5 flex-1 text-[9px] font-black uppercase tracking-wider text-muted">
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        className="mt-2 text-sm font-black leading-5 text-foreground"
      >
        {value}
      </Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  colors,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  last?: boolean;
}) {
  return (
    <View
      style={{
        borderBottomColor: colors.border,
        borderBottomWidth: last ? 0 : 1,
      }}
      className="flex-row items-start px-4 py-3.5"
    >
      <View
        style={{ backgroundColor: `${colors.primary}12` }}
        className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>

      <View className="flex-1">
        <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-muted">
          {label}
        </Text>

        <Text className="mt-1 text-sm leading-5 text-foreground">
          {value}
        </Text>
      </View>
    </View>
  );
}

function KnowYourFamilySummary({
  member,
  isMe,
  colors,
  router,
}: {
  member: any;
  isMe: boolean;
  colors: any;
  router: any;
}) {
  const hasResult = Boolean(
    member.temperament_type && member.productivity_energy,
  );

  const isVisibleToOthers =
    member.sharing_preference === 'family';

  // Do not expose whether another member has completed an assessment
  // when their profile is private or incomplete.
  if (!isMe && (!isVisibleToOthers || !hasResult)) {
    return null;
  }

  if (!hasResult) {
    return (
      <Pressable
        onPress={() =>
          router.push(`/(stack)/my-profile?memberId=${member.id}`)
        }
        style={({
          backgroundColor: colors.surface,
        })}
        className="mb-4 overflow-hidden rounded-[24px] border border-gray-200"
      >
        <View
          style={{ backgroundColor: `${colors.primary}09` }}
          className="flex-row items-center px-5 py-4"
        >
          <View
            style={{
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 3,
            }}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
          >
            <Ionicons name="sparkles" size={19} color="#FFFFFF" />
          </View>

          <View className="flex-1">
            <Text className="text-sm font-black text-foreground">
              Discover how you&apos;re wired
            </Text>

            <Text className="mt-1 text-xs leading-4 text-muted">
              Take a short assessment to see your temperament and productivity
              energy.
            </Text>
          </View>

          <Ionicons
            name="arrow-forward"
            size={17}
            color={colors.primary}
          />
        </View>
      </Pressable>
    );
  }

  const temperament =
    TEMPERAMENT_CONTENT[
      member.temperament_type as TemperamentType
    ];

  const energy =
    PRODUCTIVITY_ENERGY_CONTENT[
      member.productivity_energy as ProductivityEnergy
    ];

  return (
    <Pressable
      onPress={() =>
        router.push(`/(stack)/my-profile?memberId=${member.id}`)
      }
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderColor: colors.border,
        opacity: pressed ? 0.82 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      })}
      className="mb-4 overflow-hidden rounded-[24px] border"
    >
      <View
        style={{
          backgroundColor: `${colors.primary}08`,
          borderBottomColor: `${colors.primary}18`,
        }}
        className="flex-row items-center border-b px-5 py-4"
      >
        <View
          style={{ backgroundColor: `${colors.primary}15` }}
          className="mr-3 h-9 w-9 items-center justify-center rounded-xl"
        >
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={colors.primary}
          />
        </View>

        <View className="flex-1">
          <Text className="text-[10px] font-black uppercase tracking-[1.4px] text-muted">
            Know Your Family
          </Text>

          <Text className="mt-0.5 text-base font-black text-foreground">
            Personal profile
          </Text>
        </View>

        <Ionicons
          name="arrow-forward"
          size={16}
          color={colors.primary}
        />
      </View>

      <View className="flex-row gap-2.5 px-5 py-4">
        <InsightTile
          icon="compass-outline"
          label="Temperament"
          value={temperament?.label ?? 'Not available'}
          colors={colors}
        />

        <InsightTile
          icon="flash-outline"
          label="Energy"
          value={energy?.label ?? 'Not available'}
          colors={colors}
        />
      </View>

      {isMe && (
        <View
          style={{ borderTopColor: colors.border }}
          className="flex-row items-center border-t px-5 py-3"
        >
          <Ionicons
            name={
              member.sharing_preference === 'family'
                ? 'people-outline'
                : 'lock-closed-outline'
            }
            size={14}
            color={colors.muted}
          />

          <Text className="ml-2 text-[11px] font-semibold text-muted">
            {member.sharing_preference === 'family'
              ? 'Shared with the family'
              : 'Only visible to you'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const {
    family,
    members,
    currentMember,
    promoteMember,
    demoteMember,
    getAvatarSignedUrl,
  } = useFamilyStore();

  const [copied, setCopied] = useState(false);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(
    null,
  );

  const member = members.find((item) => item.id === id);

  const isAdmin = isAdminAccess(currentMember?.role);
  const isMe = member?.user_id === currentMember?.user_id;
  const isClaimed = Boolean(member?.user_id);
  const age = getAge(member?.date_of_birth);

  useEffect(() => {
    const resolveAvatar = async () => {
      if (!member?.avatar_url) {
        setAvatarSignedUrl(null);
        return;
      }

      const url = await getAvatarSignedUrl(member.avatar_url);
      setAvatarSignedUrl(url);
    };

    resolveAvatar();
  }, [member?.avatar_url]);

  if (!member) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <AppHeader title="Member" showBack />

        <View className="flex-1 items-center justify-center px-6">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="w-full items-center rounded-3xl border px-6 py-8"
          >
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="person-outline"
                size={27}
                color={colors.primary}
              />
            </View>

            <Text className="text-center text-base font-black text-foreground">
              Member unavailable
            </Text>

            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              This member couldn&apos;t be found. They may have been removed.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const hasAssessmentResults = Boolean(
    member.temperament_type && member.productivity_energy,
  );

  const temperament = member.temperament_type
    ? TEMPERAMENT_CONTENT[
        member.temperament_type as TemperamentType
      ]
    : null;

  const energy = member.productivity_energy
    ? PRODUCTIVITY_ENERGY_CONTENT[
        member.productivity_energy as ProductivityEnergy
      ]
    : null;

  const handleCopy = async () => {
    if (!member.signup_code) return;

    await Clipboard.setStringAsync(member.signup_code);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  const confirmPromote = () => {
    if (!family?.id) return;

    Alert.alert(
      'Make Admin',
      `Make ${member.name} an admin? They'll be able to manage chores, meals, calendar, and members.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Make Admin',
          onPress: () => promoteMember(member.id, family.id),
        },
      ],
    );
  };

  const confirmDemote = () => {
    if (!family?.id) return;

    Alert.alert(
      'Remove Admin',
      `Remove admin access from ${member.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => demoteMember(member.id, family.id),
        },
      ],
    );
  };

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader
        title="Profile"
        showBack
        right={
          isMe || isAdmin ? (
            <Pressable
              onPress={() =>
                router.push(
                  `/(stack)/update-profile?id=${member.user_id}&memberId=${member.id}&isAdmin=${
                    isAdmin ? 'true' : 'false'
                  }`,
                )
              }
              hitSlop={10}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={colors.primary}
              />
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 36,
        }}
      >
        {/* Profile hero */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 3,
          }}
          className="mb-5 overflow-hidden rounded-[28px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}0C`,
              borderBottomColor: `${colors.primary}18`,
            }}
            className="items-center border-b px-5 pb-6 pt-6"
          >
            <View
              style={{
                backgroundColor: colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.14,
                shadowRadius: 10,
                elevation: 4,
              }}
              className="mb-4 rounded-full p-1.5"
            >
              <View
                style={{
                  backgroundColor: colors.primary,
                }}
                className="rounded-full p-1"
              >
                {avatarSignedUrl ? (
                  <Image
                    source={{ uri: avatarSignedUrl }}
                    className="h-24 w-24 rounded-full"
                  />
                ) : (
                  <View
                    style={{
                      backgroundColor: `${colors.primary}20`,
                    }}
                    className="h-24 w-24 items-center justify-center rounded-full"
                  >
                    <Text
                      style={{ color: colors.primary }}
                      className="text-3xl font-black"
                    >
                      {getInitials(member.name)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text className="text-2xl font-black tracking-tight text-foreground">
              {member.name}
            </Text>

            <View className="mt-3 flex-row items-center gap-2">
              <View
                style={{
                  backgroundColor: `${colors.primary}15`,
                  borderColor: `${colors.primary}28`,
                }}
                className="rounded-full border px-3 py-1.5"
              >
                <Text
                  style={{ color: colors.primary }}
                  className="text-[10px] font-black uppercase tracking-wider"
                >
                  {formatMemberRole(member.role)}
                </Text>
              </View>

              {member.is_founding_admin && (
                <View
                  style={{
                    backgroundColor: '#F59E0B15',
                    borderColor: '#F59E0B35',
                  }}
                  className="flex-row items-center rounded-full border px-3 py-1.5"
                >
                  <Ionicons name="star" size={11} color="#D97706" />

                  <Text className="ml-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                    Owner
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-4">
              <ProfileStatus
                completed={member.assessment_completed}
                colors={colors}
              />
            </View>
          </View>

          <View className="flex-row px-5 py-4">
            <View className="flex-1 items-center">
              <Text className="text-[10px] font-black uppercase tracking-wider text-muted">
                Age group
              </Text>

              <Text className="mt-1 text-sm font-black text-foreground">
                {formatAgeBand(member.age_band)}
              </Text>
            </View>

            <View
              style={{ backgroundColor: colors.border }}
              className="w-px"
            />

            <View className="flex-1 items-center">
              <Text className="text-[10px] font-black uppercase tracking-wider text-muted">
                Member since
              </Text>

              <Text className="mt-1 text-sm font-black text-foreground">
                {new Date(member.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        {!!member.bio && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="mb-4 overflow-hidden rounded-[24px] border"
          >
            <View
              style={{
                backgroundColor: `${colors.primary}08`,
                borderBottomColor: `${colors.primary}15`,
              }}
              className="flex-row items-center border-b px-5 py-4"
            >
              <View
                style={{ backgroundColor: `${colors.primary}15` }}
                className="h-9 w-9 items-center justify-center rounded-xl"
              >
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <Text className="ml-3 text-base font-black text-foreground">
                About {isMe ? 'me' : member.name}
              </Text>
            </View>

            <Text className="px-5 py-5 text-sm leading-6 text-foreground">
              {member.bio}
            </Text>
          </View>
        )}

        {/* Know Your Family */}
        <KnowYourFamilySummary
          member={member}
          isMe={isMe}
          colors={colors}
          router={router}
        />

        {/* Assessment results */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          }}
          className="mb-4 overflow-hidden rounded-[24px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}08`,
              borderBottomColor: `${colors.primary}15`,
            }}
            className="flex-row items-center border-b px-5 py-4"
          >
            <View
              style={{ backgroundColor: `${colors.primary}15` }}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="analytics-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-black uppercase tracking-[1.4px] text-muted">
                Know Your Family
              </Text>

              <Text className="mt-0.5 text-base font-black text-foreground">
                Assessment profile
              </Text>
            </View>

            <Ionicons
              name={
                member.assessment_completed
                  ? 'checkmark-circle'
                  : 'time-outline'
              }
              size={19}
              color={
                member.assessment_completed
                  ? '#10B981'
                  : colors.muted
              }
            />
          </View>

          <View className="flex-row gap-2.5 px-5 py-5">
            <InsightTile
              icon="compass-outline"
              label="Temperament"
              value={temperament?.label ?? 'Not completed'}
              colors={colors}
            />

            <InsightTile
              icon="flash-outline"
              label="Energy"
              value={energy?.label ?? 'Not completed'}
              colors={colors}
            />
          </View>

          <View
            style={{ borderTopColor: colors.border }}
            className="border-t px-5 py-3"
          >
            <Text className="text-xs font-medium text-muted">
              {member.assessment_completed
                ? formatAssessmentDate(member.assessment_date)
                : 'Complete the assessment to unlock this profile'}
            </Text>
          </View>
        </View>

        {/* Personal details */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          }}
          className="mb-4 overflow-hidden rounded-[24px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}08`,
              borderBottomColor: `${colors.primary}15`,
            }}
            className="flex-row items-center border-b px-5 py-4"
          >
            <View
              style={{ backgroundColor: `${colors.primary}15` }}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="person-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <Text className="ml-3 text-base font-black text-foreground">
              Personal details
            </Text>
          </View>

          {age !== null && (
            <DetailRow
              icon="calendar-outline"
              label="Age"
              value={`${age} years old`}
              colors={colors}
            />
          )}

          {!!member.date_of_birth && (
            <DetailRow
              icon="gift-outline"
              label="Date of birth"
              value={new Date(
                member.date_of_birth,
              ).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              colors={colors}
            />
          )}

          <DetailRow
            icon="people-outline"
            label="Family role"
            value={formatMemberRole(member.role)}
            colors={colors}
          />

          <DetailRow
            icon="layers-outline"
            label="Age group"
            value={formatAgeBand(member.age_band)}
            colors={colors}
          />

          {!!member.phone_number && (
            <DetailRow
              icon="call-outline"
              label="Phone"
              value={member.phone_number}
              colors={colors}
            />
          )}

          <DetailRow
            icon={
              member.sharing_preference === 'family'
                ? 'people-outline'
                : 'lock-closed-outline'
            }
            label="Profile sharing"
            value={
              member.sharing_preference === 'family'
                ? 'Shared with family'
                : 'Private'
            }
            colors={colors}
          />

          {!!member.dietary_notes && (
            <DetailRow
              icon="restaurant-outline"
              label="Dietary notes"
              value={member.dietary_notes}
              colors={colors}
              last
            />
          )}

          {!member.dietary_notes && (
            <DetailRow
              icon="time-outline"
              label="Member since"
              value={formatMemberSince(member.created_at)}
              colors={colors}
              last
            />
          )}
        </View>

        {/* Invite code */}
        {!isClaimed && member.signup_code && isAdmin && (
          <View className="mb-4">
            <View className="mb-2 flex-row items-center px-1">
              <Ionicons
                name="key-outline"
                size={15}
                color={colors.primary}
              />

              <Text className="ml-2 text-[10px] font-black uppercase tracking-[1.4px] text-muted">
                Invite code
              </Text>
            </View>

            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.76 : 1,
              })}
              className="flex-row items-center justify-between rounded-2xl border px-4 py-4"
            >
              <Text className="text-lg font-black tracking-[4px] text-foreground">
                {member.signup_code}
              </Text>

              <View className="flex-row items-center">
                {copied && (
                  <Text
                    style={{ color: colors.primary }}
                    className="mr-2 text-xs font-black"
                  >
                    Copied
                  </Text>
                )}

                <View
                  style={{ backgroundColor: `${colors.primary}14` }}
                  className="h-9 w-9 items-center justify-center rounded-xl"
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={17}
                    color={colors.primary}
                  />
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View className="gap-3">
          {!isMe && isClaimed && (
            <Pressable
              onPress={() =>
                router.push(`/dm?userId=${member.user_id}`)
              }
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                opacity: pressed ? 0.82 : 1,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                elevation: 3,
              })}
              className="flex-row items-center justify-center rounded-2xl py-4"
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text className="ml-2 text-sm font-black text-white">
                Send Message
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          )}

          {member.role === 'member' && isAdmin && isClaimed && (
            <Pressable
              onPress={confirmPromote}
              style={({ pressed }) => ({
                backgroundColor: `${colors.primary}08`,
                borderColor: `${colors.primary}45`,
                opacity: pressed ? 0.72 : 1,
              })}
              className="flex-row items-center justify-center rounded-2xl border py-3.5"
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={colors.primary}
              />

              <Text
                style={{ color: colors.primary }}
                className="ml-2 text-sm font-black"
              >
                Make Admin
              </Text>
            </Pressable>
          )}

          {member.role === 'admin' &&
            !member.is_founding_admin &&
            isAdmin && (
              <Pressable
                onPress={confirmDemote}
                style={({ pressed }) => ({
                  backgroundColor: '#EF444408',
                  borderColor: '#EF444450',
                  opacity: pressed ? 0.72 : 1,
                })}
                className="flex-row items-center justify-center rounded-2xl border py-3.5"
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={17}
                  color="#EF4444"
                />

                <Text className="ml-2 text-sm font-black text-red-500">
                  Remove Admin Access
                </Text>
              </Pressable>
            )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
