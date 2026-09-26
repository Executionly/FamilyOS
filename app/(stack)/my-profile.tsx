import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import {
  ProductivityEnergy,
  TemperamentType,
} from '@/types';
import {
  PRODUCTIVITY_ENERGY_CONTENT,
  TEMPERAMENT_CONTENT,
} from '@/lib/result-content';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const router = useRouter();
  const colors = useColors();

  const {
    members,
    fetchMembers,
    currentMember,
    family,
  } = useFamilyStore();

  const [loading, setLoading] = useState(true);

  const targetId = memberId || currentMember?.id;
  const member = members.find((m) => m.id === targetId);

  useEffect(() => {
    setLoading(false);

    if (family?.id) {
      fetchMembers(family.id);
    }
  }, [members, family]);

  if (loading) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!member) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <AppHeader title="My Profile" showBack />

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
                size={26}
                color={colors.primary}
              />
            </View>

            <Text className="text-center text-base font-black text-foreground">
              Profile unavailable
            </Text>

            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              This member could not be found.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const temperament = member.temperament_type as TemperamentType | null;
  const energy = member.productivity_energy as ProductivityEnergy | null;

  const temperamentContent = temperament
    ? TEMPERAMENT_CONTENT[temperament]
    : null;

  const energyContent = energy
    ? PRODUCTIVITY_ENERGY_CONTENT[energy]
    : null;

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="My Profile" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {/* Profile introduction */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
          className="mb-5 overflow-hidden rounded-[26px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}0C`,
              borderBottomColor: `${colors.primary}18`,
            }}
            className="px-5 pb-5 pt-5"
          >
            <View className="flex-row items-center">
              <View
                style={{
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 0.22,
                  shadowRadius: 10,
                  elevation: 4,
                }}
                className="mr-3.5 h-14 w-14 items-center justify-center rounded-2xl"
              >
                <Ionicons name="person" size={26} color="#FFFFFF" />
              </View>

              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted">
                  Personal profile
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-1 text-2xl font-black tracking-tight text-foreground"
                >
                  {member.name}
                </Text>
              </View>
            </View>

            <Text className="mt-5 text-sm font-medium leading-5 text-muted">
              Discover how you are naturally wired and what you bring to the
              family.
            </Text>
          </View>

          <View className="flex-row px-5 py-3.5">
            <ProfileStatus
              label="Temperament"
              complete={!!temperament}
              colors={colors}
            />

            <View
              style={{ backgroundColor: colors.border }}
              className="mx-4 w-px"
            />

            <ProfileStatus
              label="Productivity energy"
              complete={!!energy}
              colors={colors}
            />
          </View>
        </View>

        <ResultBlock
          title="My Temperament"
          eyebrow="PERSONALITY PATTERN"
          icon="compass-outline"
          content={temperamentContent}
          colors={colors}
          onTakeAssessment={() =>
            router.push(
              `/(stack)/assessment?memberId=${member.id}&dimension=temperament`,
            )
          }
        />

        <ResultBlock
          title="My Productivity Energy"
          eyebrow="WORKING STYLE"
          icon="flash-outline"
          content={energyContent}
          colors={colors}
          onTakeAssessment={() =>
            router.push(
              `/(stack)/assessment?memberId=${member.id}&dimension=productivity_energy`,
            )
          }
        />

        {temperament && energy && (
          <View className=''
          style={{ paddingBottom: Math.max(insets.bottom, 14) }}>
            <Pressable
              onPress={() => router.push('/(stack)/family-dynamics')}
              style={({
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 4,
              })}
              className="mt-1 flex-row items-center justify-center rounded-2xl py-4"
            >
              <Ionicons name="people-outline" size={18} color="#FFFFFF" />

              <Text className="ml-2 text-sm font-black text-white">
                See Our Family Dynamics
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function ProfileStatus({
  label,
  complete,
  colors,
}: {
  label: string;
  complete: boolean;
  colors: any;
}) {
  return (
    <View className="flex-1 flex-row items-center">
      <Ionicons
        name={complete ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={complete ? colors.primary : colors.muted}
      />

      <Text
        numberOfLines={1}
        className="ml-2 flex-1 text-[10px] font-bold uppercase tracking-wider text-muted"
      >
        {label}
      </Text>
    </View>
  );
}

function ResultBlock({
  title,
  eyebrow,
  icon,
  content,
  colors,
  onTakeAssessment,
}: {
  title: string;
  eyebrow: string;
  icon: keyof typeof Ionicons.glyphMap;
  content:
    | (typeof TEMPERAMENT_CONTENT)[TemperamentType]
    | (typeof PRODUCTIVITY_ENERGY_CONTENT)[ProductivityEnergy]
    | null
    | undefined;
  colors: any;
  onTakeAssessment: () => void;
}) {
  if (!content) {
    return (
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
        className="mb-4 overflow-hidden rounded-[24px] border"
      >
        <View className="flex-row items-start px-5 pb-5 pt-5">
          <View
            style={{
              backgroundColor: `${colors.primary}12`,
              borderColor: `${colors.primary}25`,
            }}
            className="mr-3.5 h-11 w-11 items-center justify-center rounded-xl border"
          >
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>

          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-muted">
              {eyebrow}
            </Text>

            <Text className="mt-1 text-lg font-black text-foreground">
              {title}
            </Text>

            <Text className="mt-2 text-sm leading-5 text-muted">
              Take a short assessment to discover this about yourself.
            </Text>
          </View>
        </View>

        <View
          style={{
            borderTopColor: colors.border,
            backgroundColor: `${colors.primary}06`,
          }}
          className="border-t px-5 py-4"
        >
          <Pressable
            onPress={onTakeAssessment}
            style={({
              backgroundColor: colors.primary,
            })}
            className="flex-row items-center justify-center rounded-xl py-3"
          >
            <Text className="text-sm font-black text-white">
              Take Assessment
            </Text>

            <Ionicons
              name="arrow-forward"
              size={15}
              color="#FFFFFF"
              style={{ marginLeft: 7 }}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
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
      className="mb-4 overflow-hidden rounded-[24px] border"
    >
      {/* Section header */}
      <View
        style={{
          backgroundColor: `${colors.primary}08`,
          borderBottomColor: `${colors.primary}16`,
        }}
        className="flex-row items-center border-b px-5 py-4"
      >
        <View
          style={{
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 7,
            elevation: 3,
          }}
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
        >
          <Ionicons name={icon} size={21} color="#FFFFFF" />
        </View>

        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-muted">
            {eyebrow}
          </Text>

          <Text className="mt-0.5 text-lg font-black text-foreground">
            {title}
          </Text>
        </View>

        <View
          style={{ backgroundColor: `${colors.primary}15` }}
          className="rounded-full px-2.5 py-1"
        >
          <Text
            style={{ color: colors.primary }}
            className="text-[9px] font-black uppercase tracking-wider"
          >
            Complete
          </Text>
        </View>
      </View>

      {/* Result content */}
      <View className="px-5 pb-5 pt-5">
        <Text className="text-2xl font-black tracking-tight text-foreground">
          {content.label}
        </Text>

        <Text className="mt-2 text-sm leading-5 text-muted">
          {content.summary}
        </Text>

        {/* Strengths */}
        <View
          style={{
            backgroundColor: `${colors.primary}07`,
            borderColor: `${colors.primary}18`,
          }}
          className="mt-5 rounded-2xl border px-4 py-4"
        >
          <View className="mb-3 flex-row items-center">
            <Ionicons
              name="sparkles-outline"
              size={15}
              color={colors.primary}
            />

            <Text className="ml-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
              My strengths
            </Text>
          </View>

          <View className="gap-2.5">
            {content.strengths.map((strength, index) => (
              <View key={index} className="flex-row items-start">
                <View
                  style={{ backgroundColor: colors.primary }}
                  className="mt-1.5 mr-2 h-1.5 w-1.5 rounded-full"
                />

                <Text className="flex-1 text-sm leading-5 text-foreground">
                  {strength}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Practical insights */}
        <View className="mt-5 gap-4">
          <InsightRow
            icon="add-circle-outline"
            label="How I may contribute"
            value={content.howIMayContribute}
            colors={colors}
          />

          <InsightRow
            icon="briefcase-outline"
            label="How I may prefer to work"
            value={content.howIMayPreferToWork}
            colors={colors}
          />

          <InsightRow
            icon="hand-left-outline"
            label="What I may need from others"
            value={content.whatIMayNeedFromOthers}
            colors={colors}
          />

          <InsightRow
            icon="trending-up-outline"
            label="Growth opportunity"
            value={content.growthOpportunity}
            colors={colors}
          />
        </View>
      </View>
    </View>
  );
}

function InsightRow({
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
    <View className="flex-row items-start">
      <Ionicons
        name={icon}
        size={17}
        color={colors.primary}
        style={{ marginTop: 2, marginRight: 10 }}
      />

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
