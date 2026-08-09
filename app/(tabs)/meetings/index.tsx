import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { isAdminAccess } from '@/utils';
import * as WebBrowser from "expo-web-browser";

export default function MeetingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { meetings, loading: meetingsLoading, error: meetingsError, fetchMeetings } = useMeetingStore();
  const { commitments, loading: commitmentsLoading, error: commitmentsError, fetchCommitments, updateCommitment } = useCommitmentStore();
  const [refreshing, setRefreshing] = useState(false)
  const isEditor = isAdminAccess(currentMember?.role)

  const handleFetch = () => {
    if(!family?.id) return
    setRefreshing(true)
    try {
      fetchMeetings(family.id);
      fetchCommitments(family.id);
    } finally {
      setRefreshing(false)
    }
  }
  useEffect(() => {
    if (family?.id) {
      handleFetch()
    }
  }, [family?.id, fetchMeetings, fetchCommitments]);


  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#F59E0B';
      case 'in_progress':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return colors.primary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleStartMeeting = () => {
    router.push('/meetings/setup');
  };

  const handleMeetingPress = (meetingId: string) => {
    router.push(`/meetings/${meetingId}`);
  };

  const handleMarkCommitmentDone = async (commitmentId: string) => {
    try {
      await updateCommitment(commitmentId, { status: 'completed' });
    } catch (error) {
      console.error('Error marking commitment done:', error);
    }
  };

  const handleAddCommitment = () => {
    router.push('/meetings/create-commitment');
  };

  const openCommitments = commitments.filter((c) => c.status === 'open');
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleFetch} />}>
        <View className="flex-1 px-6 pb-8">
            <Text className="text-2xl font-bold text-foreground mb-6 text-center">Meetings & Commitments</Text>
          {(meetingsError || commitmentsError) && (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-800 text-sm">{meetingsError || commitmentsError}</Text>
            </View>
          )}

          {/* Meetings Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-foreground">Family Meetings</Text>
              {isEditor && <Pressable onPress={handleStartMeeting}>
                <Text className="text-primary font-semibold">+ New</Text>
              </Pressable>}
            </View>

            {meetings.length === 0 ? (
              <View 
                className="rounded-lg border border-border p-6 items-center"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-muted text-center">
                  No meetings yet. Run your first family meeting!
                </Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={meetings?.slice(0,2)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleMeetingPress(item.id)}
                    className="mb-3 rounded-2xl border border-border bg-surface p-4"
                  >
                    {/* Top row: title + status */}
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-base font-bold text-foreground">{item.title}</Text>
                        <Text className="mt-1 text-xs text-muted">
                          {formatDate(item.scheduled_date)} · {item.duration_minutes} min
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-2.5 py-1"
                        style={{ backgroundColor: getStatusBadgeColor(item.status) }}
                      >
                        <Text className="text-xs font-semibold capitalize text-white">{item.status}</Text>
                      </View>
                    </View>

                    {/* Meta row: occurrence + link indicator */}
                    {(item.occurrence || item.meeting_link) && (
                      <View className="mt-3 flex-row flex-wrap items-center gap-2 border-t border-border pt-3">
                        {item.occurrence && (
                          <View className="flex-row items-center rounded-full bg-primary/10 px-2.5 py-1">
                            <Ionicons name="repeat-outline" size={12} color={colors.primary} />
                            <Text className="ml-1 text-[11px] font-semibold capitalize text-primary">
                              {item.occurrence}
                            </Text>
                          </View>
                        )}
                        {item.meeting_link && (
                          <View className="flex-row items-center rounded-full bg-primary/10 px-2.5 py-1">
                            <Ionicons name="videocam-outline" size={12} color={colors.primary} />
                            <Text className="ml-1 text-[11px] font-semibold text-primary">Video link</Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View className='flex-row items-center mt-2 gap-2 flex-wrap'>
                      {/* Join button — only when there's a link and the meeting hasn't happened yet */}
                      {item.meeting_link && item.status !== 'completed' && item.status !== 'cancelled' && (
                        <Pressable
                          onPress={async(e) => {
                            e.stopPropagation();
                            if(item.meeting_link)
                              await WebBrowser.openBrowserAsync(item.meeting_link);
                          }}
                          className="flex-1 flex-row items-center justify-center rounded-xl bg-primary py-2.5"
                        >
                          <Ionicons name="videocam" size={15} color="#fff" />
                          <Text className="ml-1.5 text-xs font-bold text-white">Join Meeting</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/meetings/edit?meetingId=${item.id}`);
                        }}
                        className="flex-row items-center self-start rounded-lg border border-border px-3 py-2.5"
                      >
                        <Ionicons name="pencil-outline" size={13} color={colors.foreground} />
                        <Text className="ml-1.5 text-xs font-semibold text-foreground">Edit</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>

          {
            meetings?.length > 2 && 
            <View className="px-6 pb-4 -mt-8">
              <Pressable
                onPress={()=>router.push('/member-list')}
                className="py-2 rounded-lg items-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-white font-semibold text-xs">View all meetings</Text>
              </Pressable>
            </View>
          }

          {/* Open Commitments Section */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-foreground">Open Commitments</Text>
              {isEditor && <Pressable onPress={handleAddCommitment}>
                <Text className="text-primary font-semibold">+ Add</Text>
              </Pressable>}
            </View>

            {openCommitments?.length === 0 ? (
              <View 
                className="rounded-lg border border-border p-6 items-center"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-muted text-center">
                  No open commitments. Great job!
                </Text>
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
                      className="rounded-2xl border p-4"
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      }}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text
                            className="text-[15px] font-semibold text-foreground leading-tight"
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>

                          {item.description ? (
                            <Text
                              className="text-[13px] text-muted mt-1 leading-relaxed"
                              numberOfLines={3}
                            >
                              {item.description}
                            </Text>
                          ) : null}

                          {item.due_date && (
                            <View
                              className="flex-row items-center self-start mt-2.5 px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: isOverdue
                                  ? `${colors.error}1A`
                                  : `${colors.primary}14`,
                              }}
                            >
                              <Text
                                className="text-[11px] font-semibold"
                                style={{
                                  color: isOverdue ? colors.error : colors.primary,
                                }}
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
                            {
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              borderWidth: 1.5,
                              borderColor: colors.primary,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: pressed ? 0.6 : 1,
                            },
                          ]}
                        >
                          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>
                            Mark Done
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {meetings?.length > 0 && isEditor && (
        <View className="px-6 pb-4">
          <Pressable
            onPress={handleStartMeeting}
            className="py-3 rounded-lg items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold text-base">Start New Meeting</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}
