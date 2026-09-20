import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useCharterStore } from '@/lib/stores/charter-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';
import { isAdminAccess } from '@/utils';

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 1,
};

export default function FoundationBuilderScreen() {
  const router = useRouter();
  const colors = useColors();
  const { charter, fetchCharter, loading: charterLoading } = useCharterStore();
  const { family, currentMember } = useFamilyStore();
  const [loading, setLoading] = useState(true);
  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    const loadCharter = async () => {
      if (family) {
        try {
          await fetchCharter(family.id);
        } catch (err) {
          console.error('Error loading charter:', err);
        }
      }
      setLoading(false);
    };

    loadCharter();
  }, [family, fetchCharter]);

  const handleStartCharter = () => {
    router.push('/(tabs)/foundation/mission-vision');
  };

  const handleEditCharter = () => {
    router.push('/(tabs)/foundation/mission-vision');
  };

  const handleViewCharter = () => {
    router.push('/(tabs)/foundation/preview');
  };

  if (loading || charterLoading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-muted mt-4 text-center">
            Loading your family charter…
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const steps = [
    {
      icon: 'document-text-outline' as const,
      title: 'Mission & Vision',
      description: "Define your family's core purpose and long-term aspirations",
    },
    {
      icon: 'diamond-outline' as const,
      title: 'Core Values',
      description: "Identify the principles that guide your family's decisions",
    },
    {
      icon: 'scale-outline' as const,
      title: 'Constitution',
      description: "Establish your family's operating rules and commitments",
    },
  ];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 px-5 py-6">
          {/* Hero Header */}
          <View style={[SHADOW, { borderRadius: 28 }]} className="mb-6 overflow-hidden">
            <LinearGradient
              colors={[colors.primary, colors.primary + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 24, paddingVertical: 32 }}
            >
              {/* Decorative accents */}
              <View
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: -40,
                  left: -20,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              />

              <View className="flex-row items-center justify-between mb-5">
                <View
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  className="w-14 h-14 rounded-2xl items-center justify-center"
                >
                  <Ionicons name="ribbon-outline" size={26} color="#FFFFFF" />
                </View>

                <View
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  className="flex-row items-center px-3 py-1.5 rounded-full"
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: charter ? '#4ADE80' : 'rgba(255,255,255,0.7)',
                      marginRight: 6,
                    }}
                  />
                  <Text className="text-[11px] font-bold tracking-wide text-white">
                    {charter ? 'ACTIVE CHARTER' : 'NOT STARTED'}
                  </Text>
                </View>
              </View>

              <Text className="text-[26px] font-extrabold text-white mb-1.5">
                Foundation Builder
              </Text>
              <Text
                style={{ color: 'rgba(255,255,255,0.88)' }}
                className="text-sm leading-relaxed pr-4"
              >
                Create your family's shared identity and operating principles
              </Text>
            </LinearGradient>
          </View>

          {charter ? (
            // Charter exists
            <>
              {/* Quick Stats */}
              <View className="flex-row gap-3 mb-6">
                <View
                  style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  className="flex-1 rounded-2xl p-4 border items-center"
                >
                  <Ionicons name="flag" size={16} color={colors.primary} />
                  <Text className="text-[11px] font-semibold text-muted mt-2">Mission</Text>
                  <Text className="text-xs font-bold text-foreground mt-0.5">Defined</Text>
                </View>
                <View
                  style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  className="flex-1 rounded-2xl p-4 border items-center"
                >
                  <Ionicons name="telescope" size={16} color={colors.primary} />
                  <Text className="text-[11px] font-semibold text-muted mt-2">Vision</Text>
                  <Text className="text-xs font-bold text-foreground mt-0.5">Defined</Text>
                </View>
                <View
                  style={[SOFT_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  className="flex-1 rounded-2xl p-4 border items-center"
                >
                  <Ionicons name="diamond" size={16} color={colors.primary} />
                  <Text className="text-[11px] font-semibold text-muted mt-2">Values</Text>
                  <Text className="text-xs font-bold text-foreground mt-0.5">
                    {charter.values.length}
                  </Text>
                </View>
              </View>

              {/* Charter Summary */}
              <View
                style={[SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                className="mb-6 rounded-3xl p-5 border"
              >
                <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center">
                    <View
                      style={{ backgroundColor: colors.primary }}
                      className="w-8 h-8 rounded-full items-center justify-center mr-2.5"
                    >
                      <Ionicons name="checkmark" size={16} color={colors.background} />
                    </View>
                    <Text
                      style={{ color: colors.primary }}
                      className="text-xs font-bold tracking-wider"
                    >
                      YOUR FAMILY CHARTER
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleViewCharter}
                    hitSlop={8}
                    style={{ backgroundColor: colors.primary + '14' }}
                    className="w-8 h-8 rounded-full items-center justify-center"
                  >
                    <Ionicons name="expand-outline" size={15} color={colors.primary} />
                  </Pressable>
                </View>

                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <View
                      style={{ backgroundColor: colors.primary + '14' }}
                      className="w-7 h-7 rounded-lg items-center justify-center mr-2"
                    >
                      <Ionicons name="flag-outline" size={13} color={colors.primary} />
                    </View>
                    <Text className="text-xs font-bold text-muted tracking-wide">MISSION</Text>
                  </View>
                  <Text className="text-sm text-foreground leading-relaxed line-clamp-2 pl-9">
                    {charter.mission}
                  </Text>
                </View>

                <View style={{ backgroundColor: colors.border }} className="h-px w-full mb-5" />

                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <View
                      style={{ backgroundColor: colors.primary + '14' }}
                      className="w-7 h-7 rounded-lg items-center justify-center mr-2"
                    >
                      <Ionicons name="telescope-outline" size={13} color={colors.primary} />
                    </View>
                    <Text className="text-xs font-bold text-muted tracking-wide">VISION</Text>
                  </View>
                  <Text className="text-sm text-foreground leading-relaxed line-clamp-2 pl-9">
                    {charter.vision}
                  </Text>
                </View>

                <View style={{ backgroundColor: colors.border }} className="h-px w-full mb-5" />

                <View>
                  <View className="flex-row items-center mb-3">
                    <View
                      style={{ backgroundColor: colors.primary + '14' }}
                      className="w-7 h-7 rounded-lg items-center justify-center mr-2"
                    >
                      <Ionicons name="diamond-outline" size={13} color={colors.primary} />
                    </View>
                    <Text className="text-xs font-bold text-muted tracking-wide">CORE VALUES</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2 pl-9">
                    {charter.values.slice(0, 3).map((value, index) => (
                      <View
                        key={index}
                        style={{ backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' }}
                        className="rounded-full px-3 py-1.5 border"
                      >
                        <Text style={{ color: colors.primary }} className="text-xs font-semibold">
                          {value}
                        </Text>
                      </View>
                    ))}
                    {charter.values.length > 3 && (
                      <View
                        style={{ backgroundColor: colors.primary }}
                        className="rounded-full px-3 py-1.5"
                      >
                        <Text className="text-xs font-semibold text-background">
                          +{charter.values.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="gap-3">
                <Pressable onPress={handleViewCharter}>
                  {({ pressed }) => (
                    <View style={[SHADOW, { opacity: pressed ? 0.9 : 1, borderRadius: 18 }]} className="overflow-hidden">
                      <LinearGradient
                        colors={[colors.primary, colors.primary + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className=""
                      >
                        <View className='py-4 items-center flex-row justify-center'>
                          <Ionicons
                            name="book-outline"
                            size={18}
                            color={colors.background}
                            style={{ marginRight: 8 }}
                          />
                          <Text className="text-base font-bold text-background">View Full Charter</Text>
                        </View>
                      </LinearGradient>
                    </View>
                  )}
                </Pressable>

                {isEditor && (
                  <Pressable
                    onPress={handleEditCharter}
                    style={({ pressed }) => [
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                    className="border rounded-2xl py-4 items-center flex-row justify-center"
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={colors.foreground}
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-base font-semibold text-foreground">Edit Charter</Text>
                  </Pressable>
                )}
              </View>

              {/* Last Updated */}
              <View className="mt-6 flex-row items-center justify-center">
                <Ionicons name="time-outline" size={13} color={colors.muted} style={{ marginRight: 5 }} />
                <Text className="text-xs text-muted">
                  Last updated {new Date(charter.updated_at).toLocaleDateString()}
                </Text>
              </View>
            </>
          ) : (
            // No charter yet
            <>
              {/* Journey / Steps */}
              <View
                style={[SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                className="mb-6 rounded-3xl p-5 border"
              >
                <Text className="text-xs font-bold text-muted tracking-wider mb-5">
                  WHAT YOU'LL BUILD
                </Text>
                {steps.map((step, index) => (
                  <View key={step.title} className="flex-row">
                    <View className="items-center mr-4">
                      <View
                        style={{ backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }}
                        className="w-11 h-11 rounded-xl items-center justify-center border"
                      >
                        <Ionicons name={step.icon} size={19} color={colors.primary} />
                      </View>
                      {index < steps.length - 1 && (
                        <View
                          style={{ backgroundColor: colors.border }}
                          className="w-px flex-1 my-1.5"
                        />
                      )}
                    </View>
                    <View className={index < steps.length - 1 ? 'flex-1 mb-5' : 'flex-1'}>
                      <View className="flex-row items-center mb-1">
                        <View
                          style={{ backgroundColor: colors.primary }}
                          className="w-4 h-4 rounded-full items-center justify-center mr-1.5"
                        >
                          <Text className="text-[9px] font-bold text-background">{index + 1}</Text>
                        </View>
                        <Text className="text-sm font-bold text-foreground">{step.title}</Text>
                      </View>
                      <Text className="text-xs text-muted leading-relaxed">{step.description}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Start Button */}
              {isEditor && (
                <Pressable onPress={handleStartCharter}>
                  {({ pressed }) => (
                    <View style={[SHADOW, { opacity: pressed ? 0.9 : 1, borderRadius: 18 }]} className="overflow-hidden">
                      <LinearGradient
                        colors={[colors.primary, colors.primary + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="py-4 items-center flex-row justify-center"
                      >
                        <Ionicons
                          name="rocket-outline"
                          size={18}
                          color={colors.background}
                          style={{ marginRight: 8 }}
                        />
                        <Text className="text-base font-bold text-background">
                          Start Building Charter
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={colors.background}
                          style={{ marginLeft: 8 }}
                        />
                      </LinearGradient>
                    </View>
                  )}
                </Pressable>
              )}

              {!isEditor && (
                <View
                  style={{ backgroundColor: colors.primary + '0F', borderColor: colors.primary + '30' }}
                  className="rounded-2xl p-4 border flex-row items-center"
                >
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text className="text-xs text-muted ml-2.5 flex-1 leading-relaxed">
                    Only family admins can start building the charter.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}