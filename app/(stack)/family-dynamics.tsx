import { useEffect, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { supabase } from '@/lib/_core/supabase';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import {
  PRODUCTIVITY_ENERGY_CONTENT,
  TEMPERAMENT_CONTENT,
} from '@/lib/result-content';
import { ProductivityEnergy, TemperamentType } from '@/types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getBasicComparison } from '@/lib/compariso-content';

interface FamilyIntelligence {
  family_dynamics_summary: string | null;
  family_strengths: string[] | null;
  communication_guidance: string | null;
  decision_guidance: string | null;
  planning_guidance: string | null;
  change_guidance: string | null;
  generated_at: string;
}

export default function FamilyDynamicsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, members } = useFamilyStore();
  const { user } = useAuthStore();

  const [intelligence, setIntelligence] =
    useState<FamilyIntelligence | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [notEnoughProfiles, setNotEnoughProfiles] = useState(false);

  const isPremium = family?.subscription_tier === 'premium';

  const shareableMembers = members.filter(
    (m) =>
      m.sharing_preference === 'family' &&
      m.temperament_type &&
      m.productivity_energy,
  );

  useEffect(() => {
    const loadCached = async () => {
      if (!family?.id || !isPremium) return;

      const { data } = await supabase
        .from('family_intelligence')
        .select('*')
        .eq('family_id', family.id)
        .maybeSingle();

      if (data) setIntelligence(data);
    };

    loadCached();
  }, [family?.id, isPremium]);

  const handleGenerate = async () => {
    if (!family?.id || !user?.id) return;

    setAiLoading(true);
    setAiError(null);
    setNotEnoughProfiles(false);

    try {
      const { data, error } = await supabase.functions.invoke(
        'family-intelligence-ai',
        {
          body: {
            family_id: family.id,
            user_id: user.id,
          },
        },
      );

      if (error) throw error;

      if (data?.error === 'not_enough_profiles') {
        setNotEnoughProfiles(true);
        return;
      }

      if (data?.intelligence) {
        setIntelligence(data.intelligence);
      }
    } catch {
      setAiError(
        'Something went wrong generating your family insights. Try again in a moment.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Our Family Dynamics" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 34,
        }}
      >
        {/* Page introduction */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.07,
            shadowRadius: 14,
            elevation: 2,
          }}
          className="mb-6 overflow-hidden rounded-[26px] border"
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
                  shadowOpacity: 0.24,
                  shadowRadius: 9,
                  elevation: 4,
                }}
                className="mr-3.5 h-14 w-14 items-center justify-center rounded-2xl"
              >
                <Ionicons name="people" size={27} color="#FFFFFF" />
              </View>

              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted">
                  Family intelligence
                </Text>

                <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
                  How we fit together
                </Text>
              </View>
            </View>

            <Text className="mt-5 text-sm font-medium leading-5 text-muted">
              See the strengths, patterns, and working styles that shape your
              family.
            </Text>
          </View>

          <View className="flex-row items-center px-5 py-3.5">
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.primary}
            />

            <Text className="ml-2 flex-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              Shared profiles only
            </Text>

            <Text
              style={{ color: colors.primary }}
              className="text-xs font-black"
            >
              {shareableMembers.length}{' '}
              {shareableMembers.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>

        {/* Family composition */}
        <SectionHeading
          eyebrow="YOUR FAMILY"
          title="Family Composition"
          icon="layers-outline"
          colors={colors}
        />

        <View className="mb-7 gap-2.5">
          {shareableMembers.length === 0 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
              className="rounded-2xl border px-4 py-4"
            >
              <View className="flex-row items-start">
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={colors.primary}
                />

                <Text className="ml-3 flex-1 text-sm leading-5 text-muted">
                  No family members have shared their profile yet. Complete a
                  profile from Know Your Family to see it here.
                </Text>
              </View>
            </View>
          )}

          {shareableMembers.map((member, index) => {
            const temperament =
              TEMPERAMENT_CONTENT[member.temperament_type as TemperamentType];

            const energy =
              PRODUCTIVITY_ENERGY_CONTENT[
                member.productivity_energy as ProductivityEnergy
              ];

            return (
              <View
                key={member.id}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1,
                }}
                className="flex-row items-center rounded-2xl border px-4 py-3.5"
              >
                <View
                  style={{
                    backgroundColor: `${colors.primary}14`,
                    borderColor: `${colors.primary}28`,
                  }}
                  className="mr-3 h-10 w-10 items-center justify-center rounded-xl border"
                >
                  <Text
                    style={{ color: colors.primary }}
                    className="text-sm font-black"
                  >
                    {index + 1}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-black text-foreground">
                    {member.name}
                  </Text>

                  <Text className="mt-1 text-[11px] font-semibold uppercase text-primary-light">
                    {temperament?.label} + {energy?.label}
                  </Text>
                </View>

                <View
                  style={{ backgroundColor: `${colors.primary}12` }}
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color={colors.primary}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Basic comparison — free, deterministic (brief section 13) */}
        {shareableMembers.length >= 2 && (
          <>
          {/* Intelligence heading */}
            <SectionHeading
            eyebrow="BASIC COMPARISON"
            title="How You May Differ"
            icon="accessibility-outline"
            colors={colors}
            />
            <View className="mb-6 gap-3">
              {buildPairs(shareableMembers)
                .slice(0, 10)
                .map(([a, b], i) => {
                  const comparison = getBasicComparison(
                    { name: a.name, temperament_type: a.temperament_type as TemperamentType, productivity_energy: a.productivity_energy as ProductivityEnergy },
                    { name: b.name, temperament_type: b.temperament_type as TemperamentType, productivity_energy: b.productivity_energy as ProductivityEnergy },
                  );
                  return (
                    <View
                      key={i}
                      className="rounded-xl border border-border p-4"
                      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    >
                      <Text className="mb-2 text-xs font-semibold text-muted">
                        {comparison.memberAName} &amp; {comparison.memberBName}
                      </Text>
                      {comparison.temperamentBlurb ? (
                        <Text className="mb-2 text-sm leading-5 text-foreground">
                          {comparison.temperamentBlurb}
                        </Text>
                      ) : null}
                      {comparison.energyBlurb ? (
                        <Text className="text-sm leading-5 text-foreground">{comparison.energyBlurb}</Text>
                      ) : null}
                    </View>
                  );
                })}
            </View>
          </>
        )}

        {/* Intelligence heading */}
        <SectionHeading
          eyebrow="PREMIUM INSIGHT"
          title="Family Intelligence"
          icon="sparkles-outline"
          colors={colors}
        />

        {!isPremium && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: `${colors.primary}35`,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}
            className="mb-5 overflow-hidden rounded-[24px] border"
          >
            <View
              style={{ backgroundColor: `${colors.primary}0B` }}
              className="px-5 pb-5 pt-5"
            >
              <View className="mb-4 flex-row items-center">
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
                  <Ionicons name="sparkles" size={19} color="#FFFFFF" />
                </View>

                <View className="flex-1">
                  <Text className="text-base font-black text-foreground">
                    Unlock your family view
                  </Text>

                  <Text className="mt-0.5 text-xs font-medium text-muted">
                    Premium family intelligence
                  </Text>
                </View>
              </View>

              <Text className="text-sm leading-5 text-muted">
                Upgrade to see how your family&apos;s strengths and differences
                fit together, with practical guidance on communication,
                decisions, planning, and change.
              </Text>
            </View>

            <View
              style={{
                borderTopColor: colors.border,
                backgroundColor: `${colors.primary}06`,
              }}
              className="border-t px-5 py-4"
            >
              <Pressable
                onPress={() => router.push('/(stack)/paywall')}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.82 : 1,
                })}
                className="flex-row items-center justify-center rounded-xl py-3"
              >
                <Text className="text-sm font-black text-white">Upgrade</Text>

                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color="#FFFFFF"
                  style={{ marginLeft: 7 }}
                />
              </Pressable>
            </View>
          </View>
        )}

        {isPremium && !intelligence && !aiLoading && !notEnoughProfiles && (
          <Pressable
            onPress={handleGenerate}
            style={({
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 4,
            })}
            className="mb-5 mt-5 flex-row items-center justify-center rounded-2xl py-4"
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />

            <Text className="ml-2 text-sm font-black text-white">
              Generate Family Insights
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color="#FFFFFF"
              style={{ marginLeft: 8 }}
            />
          </Pressable>
        )}

        {aiLoading && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="mb-5 items-center rounded-2xl border px-5 py-7"
          >
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-3 h-11 w-11 items-center justify-center rounded-full"
            >
              <Ionicons
                name="sparkles-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <ActivityIndicator color={colors.primary} />

            <Text className="mt-3 text-sm font-bold text-foreground">
              Reading your family patterns
            </Text>

            <Text className="mt-1 text-xs text-muted">
              This may take a moment.
            </Text>
          </View>
        )}

        {notEnoughProfiles && (
          <NoticeCard
            icon="people-outline"
            message="At least two family members need to complete and share their profiles before we can show your family dynamics."
            colors={colors}
          />
        )}

        {aiError && (
          <NoticeCard
            icon="alert-circle-outline"
            message={aiError}
            colors={colors}
            error
          />
        )}

        {isPremium && intelligence && (
          <View className="gap-3.5">
            {intelligence.family_dynamics_summary && (
              <InsightSection
                title="What Your Family May Bring"
                icon="git-network-outline"
                colors={colors}
              >
                <Text className="text-sm leading-5 text-foreground">
                  {intelligence.family_dynamics_summary}
                </Text>
              </InsightSection>
            )}

            {intelligence.family_strengths &&
              intelligence.family_strengths.length > 0 && (
                <InsightSection
                  title="What Makes Our Family Strong"
                  icon="sparkles-outline"
                  colors={colors}
                >
                  <View className="gap-2.5">
                    {intelligence.family_strengths.map((strength, index) => (
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
                </InsightSection>
              )}

            <InsightSection
              title="Communication"
              icon="chatbubble-ellipses-outline"
              colors={colors}
            >
              <Text className="text-sm leading-5 text-foreground">
                {intelligence.communication_guidance}
              </Text>
            </InsightSection>

            <InsightSection
              title="Decision Making"
              icon="git-branch-outline"
              colors={colors}
            >
              <Text className="text-sm leading-5 text-foreground">
                {intelligence.decision_guidance}
              </Text>
            </InsightSection>

            <InsightSection
              title="Planning"
              icon="calendar-outline"
              colors={colors}
            >
              <Text className="text-sm leading-5 text-foreground">
                {intelligence.planning_guidance}
              </Text>
            </InsightSection>

            <InsightSection
              title="Change"
              icon="swap-horizontal-outline"
              colors={colors}
            >
              <Text className="text-sm leading-5 text-foreground">
                {intelligence.change_guidance}
              </Text>
            </InsightSection>

            <Pressable
              onPress={handleGenerate}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
              })}
              className="mt-1 flex-row items-center self-start px-1 py-2"
            >
              <Ionicons
                name="refresh-outline"
                size={15}
                color={colors.primary}
              />

              <Text
                style={{ color: colors.primary }}
                className="ml-2 text-xs font-black"
              >
                Refresh Insights
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  icon,
  colors,
}: {
  eyebrow: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: any;
}) {
  return (
    <View className="mb-3 flex-row items-center">
      <View
        style={{
          backgroundColor: `${colors.primary}14`,
          borderColor: `${colors.primary}28`,
        }}
        className="mr-2.5 h-8 w-8 items-center justify-center rounded-lg border"
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>

      <View>
        <Text className="text-[9px] font-bold uppercase tracking-[1.4px] text-muted">
          {eyebrow}
        </Text>

        <Text className="mt-0.5 text-base font-black text-foreground">
          {title}
        </Text>
      </View>
    </View>
  );
}

function InsightSection({
  title,
  icon,
  colors,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: any;
  children: ReactNode;
}) {
  return (
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
      className="overflow-hidden rounded-[22px] border"
    >
      <View
        style={{
          backgroundColor: `${colors.primary}08`,
          borderBottomColor: `${colors.primary}15`,
        }}
        className="flex-row items-center border-b px-4 py-3.5"
      >
        <Ionicons name={icon} size={17} color={colors.primary} />

        <Text className="ml-2.5 text-sm font-black text-foreground">
          {title}
        </Text>
      </View>

      <View className="px-4 py-4">{children}</View>
    </View>
  );
}

function NoticeCard({
  icon,
  message,
  colors,
  error = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  colors: any;
  error?: boolean;
}) {
  const accent = error ? '#EF4444' : colors.primary;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: `${accent}35`,
      }}
      className="mb-5 flex-row items-start rounded-2xl border px-4 py-4"
    >
      <Ionicons name={icon} size={19} color={accent} />

      <Text
        style={{ color: error ? '#EF4444' : colors.muted }}
        className="ml-3 flex-1 text-sm leading-5"
      >
        {message}
      </Text>
    </View>
  );
}

function buildPairs<T>(items: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

