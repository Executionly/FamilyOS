import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { isAdminAccess } from '@/utils';
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from 'expo-linear-gradient';

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

type TabKey = 'meetings' | 'commitments';

export default function MeetingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { meetings, loading: meetingsLoading, error: meetingsError, fetchMeetings } = useMeetingStore();
  const { commitments, loading: commitmentsLoading, error: commitmentsError, fetchCommitments, updateCommitment } = useCommitmentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('meetings');
  const isEditor = isAdminAccess(currentMember?.role);

  const handleFetch = () => {
    if (!family?.id) return;
    setRefreshing(true);
    try {
      fetchMeetings(family.id);
      fetchCommitments(family.id);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (family?.id) {
      handleFetch();
    }
  }, [family?.id, fetchMeetings, fetchCommitments]);

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { color: '#F59E0B', bg: '#F59E0B1A', icon: 'time-outline' as const };
      case 'in_progress':
        return { color: '#3B82F6', bg: '#3B82F61A', icon: 'play-circle-outline' as const };
      case 'completed':
        return { color: '#10B981', bg: '#10B9811A', icon: 'checkmark-circle-outline' as const };
      case 'cancelled':
        return { color: '#EF4444', bg: '#EF44441A', icon: 'close-circle-outline' as const };
      default:
        return { color: colors.primary, bg: colors.primary + '1A', icon: 'ellipse-outline' as const };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleStartMeeting = () => router.push('/meetings/meeting-list');
  // const handleStartMeeting = () => router.push('/meetings/setup');
  const handleMeetingPress = (meetingId: string) => router.push(`/meetings/${meetingId}`);
  const handleAddCommitment = () => router.push('/meetings/create-commitment');

  const handleMarkCommitmentDone = async (commitmentId: string) => {
    try {
      await updateCommitment(commitmentId, { status: 'completed' });
    } catch (error) {
      console.error('Error marking commitment done:', error);
    }
  };

  const openCommitments = commitments.filter((c) => c.status === 'open');
  const overdueCount = openCommitments.filter(
    (c) => c.due_date && new Date(c.due_date) < new Date(new Date().toDateString())
  ).length;
  const upcomingMeeting = useMemo(
    () => meetings.find((m) => m.status === 'scheduled' || m.status === 'in_progress'),
    [meetings]
  );
  const loading = meetingsLoading || commitmentsLoading;

  if (loading && meetings.length === 0 && commitments.length === 0) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleFetch} tintColor={colors.primary} />}
      >
        <View className="flex-1 px-5 pt-2 pb-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-1">
            <View>
              <Text className="text-[26px] font-extrabold text-foreground">Governance</Text>
              <Text className="text-sm text-muted mt-0.5">Meetings & family commitments</Text>
            </View>
            <View
              style={{ backgroundColor: colors.primary + '14' }}
              className="w-12 h-12 rounded-2xl items-center justify-center"
            >
              <Ionicons name="people-circle-outline" size={26} color={colors.primary} />
            </View>
          </View>

          {/* Stat strip */}
          <View className="flex-row gap-3 mt-6 mb-6">
            <View
              style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
              className="flex-1 rounded-2xl p-3.5 border"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="calendar" size={15} color={colors.primary} />
              </View>
              <Text className="text-xl font-extrabold text-foreground">{meetings.length}</Text>
              <Text className="text-[11px] text-muted font-medium">Total Meetings</Text>
            </View>
            <View
              style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
              className="flex-1 rounded-2xl p-3.5 border"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="hourglass" size={15} color="#F59E0B" />
              </View>
              <Text className="text-xl font-extrabold text-foreground">{openCommitments.length}</Text>
              <Text className="text-[11px] text-muted font-medium">Open Items</Text>
            </View>
            <View
              style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
              className="flex-1 rounded-2xl p-3.5 border"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="alert-circle" size={15} color={overdueCount > 0 ? '#EF4444' : colors.muted} />
              </View>
              <Text
                style={{ color: overdueCount > 0 ? '#EF4444' : colors.foreground }}
                className="text-xl font-extrabold"
              >
                {overdueCount}
              </Text>
              <Text className="text-[11px] text-muted font-medium">Overdue</Text>
            </View>
          </View>

          {/* Next meeting banner */}
          {upcomingMeeting && (
            <Pressable onPress={() => handleMeetingPress(upcomingMeeting.id)} className="mb-6">
              <View style={[CTA_SHADOW, { borderRadius: 22 }]} className="overflow-hidden">
                <LinearGradient
                  colors={[colors.primary, colors.primary + 'B3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 18 }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 90,
                      height: 90,
                      borderRadius: 45,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }}
                  />
                  <View className="flex-row items-center justify-between mb-3">
                    <View
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                      className="flex-row items-center px-2.5 py-1 rounded-full"
                    >
                      <Ionicons name="flash" size={11} color="#fff" />
                      <Text className="text-[10px] font-bold text-white ml-1 tracking-wide">
                        NEXT UP
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                  </View>
                  <Text className="text-lg font-extrabold text-white mb-1">{upcomingMeeting.title}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)' }} className="text-xs font-medium">
                    {formatDate(upcomingMeeting.scheduled_date)} · {upcomingMeeting.duration_minutes} min
                  </Text>
                </LinearGradient>
              </View>
            </Pressable>
          )}

          {(meetingsError || commitmentsError) && (
            <View
              style={{ backgroundColor: colors.error + '14', borderColor: colors.error + '40' }}
              className="mb-6 p-4 rounded-2xl border flex-row items-center"
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={{ color: colors.error }} className="text-sm font-medium ml-2.5 flex-1">
                {meetingsError || commitmentsError}
              </Text>
            </View>
          )}

          {/* Segmented Tabs */}
          <View
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="flex-row rounded-2xl p-1 border mb-5"
          >
            {(
              [
                { key: 'meetings' as TabKey, label: 'Meetings', icon: 'calendar-outline' as const, count: meetings.length },
                { key: 'commitments' as TabKey, label: 'Commitments', icon: 'checkbox-outline' as const, count: openCommitments.length },
              ]
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={isActive ? { backgroundColor: colors.primary } : undefined}
                  className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={isActive ? colors.background : colors.muted}
                  />
                  <Text
                    style={{ color: isActive ? colors.background : colors.muted }}
                    className="text-xs font-bold ml-1.5"
                  >
                    {tab.label}
                  </Text>
                  {tab.count > 0 && (
                    <View
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.primary + '1A',
                      }}
                      className="ml-1.5 rounded-full px-1.5 py-0.5 min-w-[18px] items-center"
                    >
                      <Text
                        style={{ color: isActive ? colors.background : colors.primary }}
                        className="text-[10px] font-extrabold"
                      >
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* MEETINGS TAB */}
          {activeTab === 'meetings' && (
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xs font-bold text-muted tracking-wider">RECENT MEETINGS</Text>
                {isEditor && (
                  <Pressable
                    onPress={handleStartMeeting}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className="flex-row items-center"
                  >
                    <Ionicons name="add-circle" size={15} color={colors.primary} />
                    <Text style={{ color: colors.primary }} className="text-xs font-bold ml-1">
                      New
                    </Text>
                  </Pressable>
                )}
              </View>

              {meetings.length === 0 ? (
                <View
                  style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  className="rounded-2xl border p-8 items-center"
                >
                  <View
                    style={{ backgroundColor: colors.primary + '14' }}
                    className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
                  >
                    <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                  </View>
                  <Text className="text-muted text-center text-sm">
                    No meetings yet. Run your first family meeting!
                  </Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={meetings?.slice(0, 2)}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  renderItem={({ item }) => {
                    const meta = getStatusMeta(item.status);
                    return (
                      <Pressable
                        onPress={() => handleMeetingPress(item.id)}
                        style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        className="rounded-2xl border overflow-hidden"
                      >
                        <View style={{ backgroundColor: meta.color }} className="h-1 w-full" />
                        <View className="p-4">
                          <View className="flex-row items-start justify-between mb-1">
                            <Text className="text-base font-bold text-foreground flex-1 pr-2">{item.title}</Text>
                            <View
                              style={{ backgroundColor: meta.bg }}
                              className="flex-row items-center rounded-full px-2 py-1"
                            >
                              <Ionicons name={meta.icon} size={11} color={meta.color} />
                              <Text style={{ color: meta.color }} className="text-[10px] font-bold capitalize ml-1">
                                {item.status.replace('_', ' ')}
                              </Text>
                            </View>
                          </View>

                          <Text className="text-xs text-muted mb-3">
                            {formatDate(item.scheduled_date)} · {item.duration_minutes} min
                            {item.occurrence ? ` · Repeats ${item.occurrence}` : ''}
                          </Text>

                          <View className="flex-row items-center gap-2 flex-wrap">
                            {item.meeting_link && item.status !== 'completed' && item.status !== 'cancelled' && (
                              <Pressable
                                onPress={async (e) => {
                                  e.stopPropagation();
                                  if (item.meeting_link) await WebBrowser.openBrowserAsync(item.meeting_link);
                                }}
                                style={({ pressed }) => [
                                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                                ]}
                                className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
                              >
                                <Ionicons name="videocam" size={14} color="#fff" />
                                <Text className="ml-1.5 text-xs font-bold text-white">Join</Text>
                              </Pressable>
                            )}
                            {item.status !== 'completed' && item.status !== 'cancelled' && (
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  router.push(`/meetings/edit?meetingId=${item.id}`);
                                }}
                                style={{ borderColor: colors.border }}
                                className="flex-row items-center rounded-xl border px-3.5 py-2.5"
                              >
                                <Ionicons name="pencil-outline" size={13} color={colors.foreground} />
                                <Text className="ml-1.5 text-xs font-semibold text-foreground">Edit</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  }}
                />
              )}

              {meetings?.length > 2 && (
                <Pressable
                  onPress={() => router.push('/member-list')}
                  style={({ pressed }) => [
                    { backgroundColor: colors.primary + '14', opacity: pressed ? 0.7 : 1 },
                  ]}
                  className="mt-3 py-2.5 rounded-xl items-center flex-row justify-center"
                >
                  <Text style={{ color: colors.primary }} className="font-bold text-xs mr-1">
                    View all {meetings.length} meetings
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                </Pressable>
              )}
            </View>
          )}

          {/* COMMITMENTS TAB */}
          {activeTab === 'commitments' && (
            <View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xs font-bold text-muted tracking-wider">OPEN COMMITMENTS</Text>
                {isEditor && (
                  <Pressable
                    onPress={handleAddCommitment}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className="flex-row items-center"
                  >
                    <Ionicons name="add-circle" size={15} color={colors.primary} />
                    <Text style={{ color: colors.primary }} className="text-xs font-bold ml-1">
                      Add
                    </Text>
                  </Pressable>
                )}
              </View>

              {openCommitments?.length === 0 ? (
                <View
                  style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  className="rounded-2xl border p-8 items-center"
                >
                  <View
                    style={{ backgroundColor: '#10B98114' }}
                    className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
                  >
                    <Ionicons name="checkmark-done-outline" size={24} color="#10B981" />
                  </View>
                  <Text className="text-muted text-center text-sm">No open commitments. Great job!</Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={openCommitments}
                  keyExtractor={(item) => item.id}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  renderItem={({ item }) => {
                    const isOverdue =
                      item.due_date && new Date(item.due_date) < new Date(new Date().toDateString());

                    return (
                      <View
                        style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        className="rounded-2xl border overflow-hidden"
                      >
                        <View style={{ flexDirection: 'row' }}>
                          <View style={{ width: 4, backgroundColor: isOverdue ? '#EF4444' : colors.primary }} />
                          <View className="flex-1 p-4">
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1 pr-3">
                                <Text
                                  className="text-[15px] font-semibold text-foreground leading-tight"
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </Text>

                                {item.description ? (
                                  <Text className="text-[13px] text-muted mt-1 leading-relaxed" numberOfLines={3}>
                                    {item.description}
                                  </Text>
                                ) : null}

                                {item.due_date && (
                                  <View
                                    className="flex-row items-center self-start mt-2.5 px-2 py-1 rounded-full"
                                    style={{ backgroundColor: isOverdue ? `${colors.error}1A` : `${colors.primary}14` }}
                                  >
                                    <Ionicons
                                      name={isOverdue ? 'alert-circle-outline' : 'time-outline'}
                                      size={11}
                                      color={isOverdue ? colors.error : colors.primary}
                                      style={{ marginRight: 3 }}
                                    />
                                    <Text
                                      className="text-[11px] font-semibold"
                                      style={{ color: isOverdue ? colors.error : colors.primary }}
                                    >
                                      {isOverdue ? 'Overdue · ' : 'Due '}
                                      {new Date(item.due_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <Pressable
                                onPress={() => handleMarkCommitmentDone(item.id)}
                                hitSlop={8}
                                style={({ pressed }) => [
                                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                                ]}
                                className="flex-row items-center rounded-full px-3 py-2"
                              >
                                <Ionicons name="checkmark" size={13} color={colors.background} />
                                <Text style={{ color: colors.background }} className="text-xs font-bold ml-1">
                                  Done
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {meetings?.length > 0 && isEditor && (
        <View style={{ borderTopColor: colors.border }} className="px-5 pt-3 pb-4 border-t">
          <Pressable onPress={handleStartMeeting}>
            {({ pressed }) => (
              <View style={[CTA_SHADOW, { opacity: pressed ? 0.9 : 1, borderRadius: 18 }]} className="overflow-hidden">
                <LinearGradient
                  colors={[colors.primary, colors.primary + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  
                >
                  <View className="py-4 items-center flex-row justify-center">
                    <Ionicons name="add-circle-outline" size={18} color={colors.background} style={{ marginRight: 8 }} />
                    <Text className="text-background font-bold text-base">Start New Meeting</Text>
                  </View>
                </LinearGradient>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}