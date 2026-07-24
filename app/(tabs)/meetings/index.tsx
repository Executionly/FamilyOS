import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { MaterialIcons } from '@expo/vector-icons';

export default function MeetingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family } = useFamilyStore();
  const { meetings, loading: meetingsLoading, error: meetingsError, fetchMeetings } = useMeetingStore();
  const { commitments, loading: commitmentsLoading, error: commitmentsError, fetchCommitments, updateCommitment } = useCommitmentStore();

  const handleFetch = () => {
    if(!family?.id) return
    fetchMeetings(family.id);
    fetchCommitments(family.id);
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
console.log('commitments',commitments)
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
console.log('openCommitments',openCommitments)
  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">
          <View className='flex-row items-center justify-between'>
            <Text className="text-2xl font-bold text-foreground mb-6">Meetings & Commitments</Text>
            <TouchableOpacity
              onPress={handleFetch}
            >
              {loading ? <ActivityIndicator size={"small"}/> : <MaterialIcons name="refresh" size={24} color="black" />}
            </TouchableOpacity>
          </View>
          {(meetingsError || commitmentsError) && (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-800 text-sm">{meetingsError || commitmentsError}</Text>
            </View>
          )}

          {/* Meetings Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-foreground">Family Meetings</Text>
              <Pressable onPress={handleStartMeeting}>
                <Text className="text-primary font-semibold">+ New</Text>
              </Pressable>
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
                data={meetings}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleMeetingPress(item.id)}
                    className="mb-3 p-4 rounded-lg border border-border"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {item.title}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          {formatDate(item.scheduled_date)} • {item.duration_minutes} min
                        </Text>
                      </View>
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: getStatusBadgeColor(item.status) }}
                      >
                        <Text className="text-white text-xs font-semibold capitalize">
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>

          {/* Open Commitments Section */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-foreground">Open Commitments</Text>
              <Pressable onPress={handleAddCommitment}>
                <Text className="text-primary font-semibold">+ Add</Text>
              </Pressable>
            </View>

            {openCommitments.length === 0 ? (
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

      {meetings.length > 0 && (
        <View className="px-6 pb-8">
          <Pressable
            onPress={handleStartMeeting}
            className="py-4 rounded-lg items-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold text-lg">Start New Meeting</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}
