import { ScrollView, Text, View, Pressable, ActivityIndicator, Share, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { AppHeader } from '@/components/app-header';
import { useFamilyStore } from '@/lib/stores/family-store';

export default function MeetingSummaryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { meetingId } = useLocalSearchParams();
  const {members} = useFamilyStore()
  const { currentMeeting, summary, fetchMeeting, fetchSummary } = useMeetingStore();
  const { commitments, fetchCommitments } = useCommitmentStore();

  const [loading, setLoading] = useState(true);

  const memberName = (id?: string | null) => members?.find((m) => m.id === id)?.name ?? null;

  useEffect(() => {
    if (meetingId && typeof meetingId === 'string') {
      setLoading(true);
      Promise.all([
        fetchMeeting(meetingId),
        fetchSummary(meetingId),
      ]).finally(() => setLoading(false));
    }
  }, [meetingId, fetchMeeting, fetchSummary]);

  const handleShare = async () => {
    if (!summary || !currentMeeting) return;
    try {
      const message = [
        `Meeting Summary: ${currentMeeting.title}`,
        `Date: ${new Date(currentMeeting.scheduled_date).toLocaleDateString()}`,
        '',
        summary.summary_text,
        '',
        summary.key_decisions?.length
          ? `Key Decisions:\n${summary.key_decisions.map((d) => `• ${d}`).join('\n')}`
          : '',
        '',
        summary.action_items?.length
          ? `Action Items:\n${summary.action_items.map((a) => `→ ${a}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n');
 
      await Share.share({ message, title: `${currentMeeting.title} Summary` });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDone = () => {
    router.replace('/meetings');
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

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Meeting Summary" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">
          <Text className="text-sm text-muted mb-6">
            {currentMeeting && new Date(currentMeeting.scheduled_date).toLocaleDateString()}
          </Text>

          {/* Summary Text */}
          {summary && (
            <>
              <View className="mb-6 p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
                <Text className="text-foreground leading-relaxed">{summary.summary_text}</Text>
              </View>

              {/* Key Decisions */}
              {summary.key_decisions && summary.key_decisions.length > 0 && (
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-foreground mb-3">Key Decisions</Text>
                  <FlatList
                    scrollEnabled={false}
                    data={summary.key_decisions}
                    keyExtractor={(item, index) => `decision-${index}`}
                    renderItem={({ item }) => (
                      <View className="flex-row mb-2">
                        <Text className="text-primary font-bold mr-2">•</Text>
                        <Text className="flex-1 text-foreground">{item}</Text>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Action Items */}
              {summary.action_items && summary.action_items.length > 0 && (
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-foreground mb-3">Action Items</Text>
                  <FlatList
                    scrollEnabled={false}
                    data={summary.action_items}
                    keyExtractor={(item, index) => `action-${index}`}
                    renderItem={({ item }) => (
                      <View className="flex-row mb-2">
                        <Text className="text-primary font-bold mr-2">→</Text>
                        <Text className="flex-1 text-foreground">{item}</Text>
                      </View>
                    )}
                  />
                </View>
              )}
            </>
          )}

          {/* Commitments Made */}
          {commitments.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-foreground mb-3">Commitments Made</Text>
              <FlatList
                scrollEnabled={false}
                data={commitments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View className="mb-2 p-3 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
                    <Text className="font-semibold text-foreground">{item.title}</Text>
                    {item.assigned_to && (
                      <Text className="text-sm text-muted mt-1">Assigned to: {memberName(item.assigned_to)}</Text>
                    )}
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-6 pb-8 gap-3">
        <Pressable
          onPress={handleShare}
          className="py-3 px-4 rounded-lg border border-border items-center"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          <Text className="text-foreground font-semibold">Share Summary</Text>
        </Pressable>
        <Pressable
          onPress={handleDone}
          className="py-3 px-4 rounded-lg items-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white font-semibold">Done</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
