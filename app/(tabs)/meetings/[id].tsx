import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { AppHeader } from '@/components/app-header';
import { useFamilyStore } from '@/lib/stores/family-store';
import { isAdminAccess } from '@/utils';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

const CTA_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 5,
};

export default function MeetingDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams();
  const { currentMeeting, agendaItems, summary, fetchMeeting, fetchAgenda, fetchSummary, deleteMeeting } = useMeetingStore();
  const { currentMember } = useFamilyStore();
  const [loading, setLoading] = useState(true);

  const isEditor = isAdminAccess(currentMember?.role);

  useEffect(() => {
    if (id && typeof id === 'string') {
      setLoading(true);
      Promise.all([fetchMeeting(id), fetchAgenda(id), fetchSummary(id)]).finally(() => setLoading(false));
    }
  }, [id, fetchMeeting, fetchAgenda, fetchSummary]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Meeting',
      'Are you sure you want to delete this meeting? This action cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            if (id && typeof id === 'string') {
              try {
                await deleteMeeting(id);
                router.back();
              } catch (error) {
                console.error('Error deleting meeting:', error);
                alert('Failed to delete meeting');
              }
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!currentMeeting) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 justify-center items-center px-8">
          <View
            style={{ backgroundColor: colors.primary + '14' }}
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
          >
            <Ionicons name="calendar-outline" size={28} color={colors.primary} />
          </View>
          <Text className="text-foreground text-lg font-bold">Meeting not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: '#10B981', icon: 'checkmark-circle-outline' as const };
      case 'in_progress':
        return { color: '#3B82F6', icon: 'play-circle-outline' as const };
      case 'cancelled':
        return { color: '#EF4444', icon: 'close-circle-outline' as const };
      default:
        return { color: '#F59E0B', icon: 'time-outline' as const };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const meta = getStatusMeta(currentMeeting.status);

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Meeting Details" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-5 pt-4 pb-8">
          {/* Hero Header */}
          <View style={[CTA_SHADOW, { borderRadius: 26 }]} className="mb-6 overflow-hidden">
            <LinearGradient
              colors={[colors.primary, colors.primary + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 22 }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <View className="flex-row items-center justify-between mb-4">
                <View
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  className="w-12 h-12 rounded-2xl items-center justify-center"
                >
                  <Ionicons name="calendar-outline" size={22} color="#fff" />
                </View>
                <View
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  className="flex-row items-center px-3 py-1.5 rounded-full"
                >
                  <Ionicons name={meta.icon} size={13} color="#fff" />
                  <Text className="text-[11px] font-bold text-white capitalize ml-1.5">
                    {currentMeeting.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <Text className="text-xl font-extrabold text-white mb-1.5">{currentMeeting.title}</Text>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={{ color: 'rgba(255,255,255,0.85)' }} className="text-xs font-medium ml-1.5">
                  {formatDate(currentMeeting.scheduled_date)}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Meeting Details */}
          <View
            style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
            className="mb-6 rounded-2xl p-5 border"
          >
            <View className="flex-row items-center mb-4">
              <View
                style={{ backgroundColor: colors.primary + '14' }}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
              >
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              </View>
              <Text className="text-xs font-bold text-muted tracking-wider">MEETING DETAILS</Text>
            </View>

            <View className="flex-row items-center mb-1">
              <Ionicons name="hourglass-outline" size={14} color={colors.muted} style={{ marginRight: 8 }} />
              <Text className="text-xs font-semibold text-muted">Duration</Text>
            </View>
            <Text className="text-foreground text-sm mb-4 pl-[22px]">
              {currentMeeting.duration_minutes} minutes
            </Text>

            {currentMeeting.description && (
              <>
                <View style={{ backgroundColor: colors.border }} className="h-px w-full mb-4" />
                <View className="flex-row items-center mb-1">
                  <Ionicons name="document-text-outline" size={14} color={colors.muted} style={{ marginRight: 8 }} />
                  <Text className="text-xs font-semibold text-muted">Description</Text>
                </View>
                <Text className="text-foreground text-sm leading-relaxed pl-[22px]">
                  {currentMeeting.description}
                </Text>
              </>
            )}
          </View>

          {/* Agenda Items */}
          {agendaItems.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  style={{ backgroundColor: colors.primary + '14' }}
                  className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
                >
                  <Ionicons name="list-outline" size={16} color={colors.primary} />
                </View>
                <Text className="text-base font-bold text-foreground">Agenda</Text>
              </View>
              <FlatList
                scrollEnabled={false}
                data={agendaItems}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item, index }) => (
                  <View
                    style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    className="rounded-2xl p-4 border flex-row"
                  >
                    <View
                      style={{ backgroundColor: colors.primary }}
                      className="w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5"
                    >
                      <Text className="text-[11px] font-bold text-background">{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">{item.title}</Text>
                      {item.description && (
                        <Text className="text-sm text-muted mt-1 leading-relaxed">{item.description}</Text>
                      )}
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          {/* Summary */}
          {summary && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  style={{ backgroundColor: colors.primary + '14' }}
                  className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
                >
                  <Ionicons name="reader-outline" size={16} color={colors.primary} />
                </View>
                <Text className="text-base font-bold text-foreground">Summary</Text>
              </View>

              <View
                style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                className="rounded-2xl p-5 border"
              >
                <Text className="text-foreground leading-relaxed mb-4">{summary.summary_text}</Text>

                {summary.key_decisions && summary.key_decisions.length > 0 && (
                  <View className="mb-4">
                    <View className="flex-row items-center mb-2.5">
                      <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text className="text-sm font-bold text-foreground">Key Decisions</Text>
                    </View>
                    {summary.key_decisions.map((decision, index) => (
                      <View key={index} className="flex-row items-start mb-1.5 pl-1">
                        <View
                          style={{ backgroundColor: colors.primary }}
                          className="w-1.5 h-1.5 rounded-full mt-1.5 mr-2.5"
                        />
                        <Text className="text-sm text-muted flex-1 leading-relaxed">{decision}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {summary.action_items && summary.action_items.length > 0 && (
                  <View>
                    <View className="flex-row items-center mb-2.5">
                      <Ionicons name="flag-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text className="text-sm font-bold text-foreground">Action Items</Text>
                    </View>
                    {summary.action_items.map((item, index) => (
                      <View key={index} className="flex-row items-start mb-1.5 pl-1">
                        <Ionicons
                          name="arrow-forward-circle-outline"
                          size={14}
                          color={colors.primary}
                          style={{ marginRight: 8, marginTop: 1 }}
                        />
                        <Text className="text-sm text-muted flex-1 leading-relaxed">{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={{ borderTopColor: colors.border }} className="px-5 pt-3 pb-4 border-t flex-row items-center gap-3">
        {currentMeeting.status === 'scheduled' && isEditor && (
          <Pressable onPress={() => router.push(`/meetings/run?meetingId=${currentMeeting.id}`)} className="flex-1">
            {({ pressed }) => (
              <View style={[CTA_SHADOW, { opacity: pressed ? 0.9 : 1, borderRadius: 16 }]} className="overflow-hidden">
                <LinearGradient
                  colors={[colors.primary, colors.primary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  
                >
                  <View className="py-3.5 items-center flex-row justify-center">
                    <Ionicons name="play" size={16} color={colors.background} style={{ marginRight: 6 }} />
                    <Text className="text-background font-bold text-sm">Start Meeting</Text>
                  </View>
                </LinearGradient>
              </View>
            )}
          </Pressable>
        )}

        {currentMeeting.status === 'completed' && (
          <Pressable onPress={() => router.push(`/meetings/summary?meetingId=${currentMeeting.id}`)} className="flex-1">
            {({ pressed }) => (
              <View style={[CTA_SHADOW, { opacity: pressed ? 0.9 : 1, borderRadius: 16 }]} className="overflow-hidden">
                <LinearGradient
                  colors={[colors.primary, colors.primary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  
                >
                  <View className="py-3.5 items-center flex-row justify-center">
                    <Ionicons name="document-text-outline" size={16} color={colors.background} style={{ marginRight: 6 }} />
                    <Text className="text-background font-bold text-sm">View Summary</Text>
                  </View>
                </LinearGradient>
              </View>
            )}
          </Pressable>
        )}

        {isEditor && (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', opacity: pressed ? 0.8 : 1 },
            ]}
            className="flex-1 py-3.5 rounded-2xl items-center border flex-row justify-center"
          >
            <Ionicons name="trash-outline" size={15} color="#B91C1C" style={{ marginRight: 6 }} />
            <Text className="text-red-700 font-bold text-sm">Delete</Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}
