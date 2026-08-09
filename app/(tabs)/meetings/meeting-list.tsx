import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { isAdminAccess } from '@/utils';
import * as WebBrowser from "expo-web-browser";
import { AppHeader } from '@/components/app-header';

export default function MeetingsListScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { meetings, loading: meetingsLoading, error: meetingsError, fetchMeetings } = useMeetingStore();

  const isEditor = isAdminAccess(currentMember?.role)

  const handleFetch = () => {
    if(!family?.id) return
    fetchMeetings(family.id);
  }
  useEffect(() => {
    if (family?.id) {
      handleFetch()
    }
  }, [family?.id, fetchMeetings]);

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

  const loading = meetingsLoading;

  if (loading && meetings.length === 0) {
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
        <AppHeader title='Meetings' showBack
        right={
            <TouchableOpacity
              onPress={handleFetch}
            >
              {loading ? <ActivityIndicator size={"small"}/> : <MaterialIcons name="refresh" size={24} color="black" />}
            </TouchableOpacity>
        }/>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">

          {(meetingsError) && (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-800 text-sm">{meetingsError}</Text>
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
                data={meetings}
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

                    {/* Join button — only when there's a link and the meeting hasn't happened yet */}
                    {item.meeting_link && item.status !== 'completed' && item.status !== 'cancelled' && (
                      <Pressable
                        onPress={async(e) => {
                          e.stopPropagation();
                          if(item.meeting_link)
                            await WebBrowser.openBrowserAsync(item.meeting_link);
                        }}
                        className="mt-3 flex-row items-center justify-center rounded-xl bg-primary py-2.5"
                      >
                        <Ionicons name="videocam" size={15} color="#fff" />
                        <Text className="ml-1.5 text-xs font-bold text-white">Join Meeting</Text>
                      </Pressable>
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>

        </View>
      </ScrollView>

      {meetings.length > 0 && isEditor && (
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
