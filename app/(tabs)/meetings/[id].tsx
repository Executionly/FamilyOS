import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { AppHeader } from '@/components/app-header';
import { useFamilyStore } from '@/lib/stores/family-store';
import { isAdminAccess } from '@/utils';

export default function MeetingDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams();
  const { currentMeeting, agendaItems, summary, fetchMeeting, fetchAgenda, fetchSummary, deleteMeeting } = useMeetingStore();
  const {currentMember} = useFamilyStore()
  const [loading, setLoading] = useState(true);

  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    if (id && typeof id === 'string') {
      setLoading(true);
      Promise.all([
        fetchMeeting(id),
        fetchAgenda(id),
        fetchSummary(id),
      ]).finally(() => setLoading(false));
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
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg">Meeting not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Meeting Details" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-foreground mb-2">{currentMeeting.title}</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-sm text-muted">{formatDate(currentMeeting.scheduled_date)}</Text>
              <View
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor:
                    currentMeeting.status === 'completed'
                      ? '#10B981'
                      : currentMeeting.status === 'in_progress'
                      ? '#3B82F6'
                      : '#F59E0B',
                }}
              >
                <Text className="text-white text-xs font-semibold capitalize">
                  {currentMeeting.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Meeting Details */}
          <View className="mb-6 p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
            <View className="mb-3">
              <Text className="text-xs font-semibold text-muted uppercase">Duration</Text>
              <Text className="text-foreground mt-1">{currentMeeting.duration_minutes} minutes</Text>
            </View>
            {currentMeeting.description && (
              <View>
                <Text className="text-xs font-semibold text-muted uppercase">Description</Text>
                <Text className="text-foreground mt-1">{currentMeeting.description}</Text>
              </View>
            )}
          </View>

          {/* Agenda Items */}
          {agendaItems.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-foreground mb-3">Agenda</Text>
              <FlatList
                scrollEnabled={false}
                data={agendaItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View className="mb-2 p-3 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
                    <Text className="font-semibold text-foreground">{item.title}</Text>
                    {item.description && (
                      <Text className="text-sm text-muted mt-1">{item.description}</Text>
                    )}
                  </View>
                )}
              />
            </View>
          )}

          {/* Summary */}
          {summary && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-foreground mb-3">Summary</Text>
              <View className="p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
                <Text className="text-foreground leading-relaxed mb-3">{summary.summary_text}</Text>

                {summary.key_decisions && summary.key_decisions.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-sm font-semibold text-foreground mb-2">Key Decisions</Text>
                    {summary.key_decisions.map((decision, index) => (
                      <Text key={index} className="text-sm text-muted mb-1">
                        • {decision}
                      </Text>
                    ))}
                  </View>
                )}

                {summary.action_items && summary.action_items.length > 0 && (
                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-2">Action Items</Text>
                    {summary.action_items.map((item, index) => (
                      <Text key={index} className="text-sm text-muted mb-1">
                        → {item}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delete Button */}
      <View className="px-6 pb-5 flex-row items-center">
        {currentMeeting.status === 'scheduled' && isEditor && (
          <Pressable
            onPress={() => router.push(`/meetings/run?meetingId=${currentMeeting.id}`)}
            className="py-3 px-4 flex-1 rounded-lg items-center mr-2 text-white"
            style={{ backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }}
          >
            <Text>Start Meeting</Text>
          </Pressable>
        )}

        {currentMeeting.status === 'completed' && (
          <Pressable
            onPress={() => router.push(`/meetings/summary?meetingId=${currentMeeting.id}`)}
            className="py-3 px-4 rounded-lg items-center mr-2 text-white flex-1"
            style={{ backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }}
          >
            <Text>View Summary</Text>
          </Pressable>
        )}
        {isEditor && <Pressable
          onPress={handleDelete}
          className="py-3 px-4 rounded-lg items-center border border-red-300 flex-1"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <Text className="text-red-700 font-semibold">Delete Meeting</Text>
        </Pressable>}
      </View>
    </ScreenContainer>
  );
}
