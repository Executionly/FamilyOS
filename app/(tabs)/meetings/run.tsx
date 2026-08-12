import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import * as KeepAwake from 'expo-keep-awake';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { generateMeetingSummary } from '@/lib/services/meeting-ai';
import { AppHeader } from '@/components/app-header';
import { UpgradePrompt } from '@/components/upgrade-prompt';

export default function RunMeetingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { meetingId } = useLocalSearchParams();
  const { family, members } = useFamilyStore();
  const { currentMeeting, agendaItems, fetchMeeting, fetchAgenda, updateMeeting } = useMeetingStore();
  const { createCommitment } = useCommitmentStore();

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [newCommitmentTitle, setNewCommitmentTitle] = useState('');
  const [newCommitmentAssignee, setNewCommitmentAssignee] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [sessionCommitments, setSessionCommitments] = useState<string[]>([]);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'quota_exceeded'>('ai_feature');


  // Keep screen awake during meeting
  useEffect(() => {
    KeepAwake.activateKeepAwakeAsync();
    return () => {
      KeepAwake.deactivateKeepAwake();
    };
  }, []);

  // Load meeting and agenda
  useEffect(() => {
    if (meetingId && typeof meetingId === 'string') {
      fetchMeeting(meetingId);
      fetchAgenda(meetingId);
    }
  }, [meetingId, fetchMeeting, fetchAgenda]);

  const currentItem = agendaItems[currentItemIndex];
  const isLastItem = currentItemIndex === agendaItems.length - 1;

  const handleAddCommitment = async () => {
    if (!newCommitmentTitle.trim() || !family?.id) return;

    try {
      await createCommitment(family.id, family.created_by, {
        title: newCommitmentTitle,
        assigned_to: newCommitmentAssignee || undefined,
        status: 'open',
        priority: 'medium',
        description: 'Created during meeting',
        meeting_id: meetingId.toString(),
      });

      setSessionCommitments((prev) => [...prev, newCommitmentTitle.trim()]);

      setNewCommitmentTitle('');
      setNewCommitmentAssignee('');
    } catch (error) {
      console.error('Error adding commitment:', error);
    }
  };

  const handleEndMeeting = async () => {
    if (!meetingId || typeof meetingId !== 'string' || !currentMeeting || !family?.id) return;
    setIsGeneratingSummary(true);
    try {

      const result = await generateMeetingSummary(
        family.id,
        meetingId,
        decisionNotes.trim() ? [decisionNotes.trim()] : [],
        sessionCommitments,
      );

      if (result.upgradeReason) {
        setUpgradeReason(result.upgradeReason);
        setUpgradePromptVisible(true);
        return;
      }

      if (result.success) {
        // Update meeting status to completed
        await updateMeeting(meetingId, { status: 'completed' });

        // Navigate to summary screen
        router.push(`/meetings/summary?meetingId=${meetingId}`);
      }else{
        alert('Failed to generate summary. Please try again.');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!currentMeeting || agendaItems.length === 0) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (isGeneratingSummary) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, marginTop: 24, textAlign: 'center' }}>
            Generating your meeting summary...
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8, textAlign: 'center' }}>
            Reviewing decisions and commitments made today.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

    return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title={currentMeeting.title} showBack />
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
 
        {/* Progress bar */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '600' }}>
              Step {currentItemIndex + 1} of {agendaItems.length}
            </Text>
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>
              {Math.round(((currentItemIndex + 1) / agendaItems.length) * 100)}%
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{
              height: '100%', borderRadius: 3,
              backgroundColor: colors.primary,
              width: `${((currentItemIndex + 1) / agendaItems.length) * 100}%`,
            }} />
          </View>
        </View>
 
        {/* Current agenda item */}
        {currentItem && (
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground, marginBottom: 12, lineHeight: 34 }}>
              {currentItem.title}
            </Text>
            <Text style={{ fontSize: 16, color: colors.muted, lineHeight: 24 }}>
              {currentItem.description}
            </Text>
          </View>
        )}
 
        {/* Key Decisions — capture what was decided */}
        {currentItem?.title.toLowerCase().includes('decision') && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 14,
            padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 24,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
              Record Decisions Made
            </Text>
            <TextInput
              placeholder="Type the decisions your family made..."
              value={decisionNotes}
              onChangeText={setDecisionNotes}
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10,
                color: colors.foreground, fontSize: 14, lineHeight: 20,
                minHeight: 100,
              }}
            />
          </View>
        )}
 
        {/* New Commitments — add live commitments */}
        {currentItem?.title.toLowerCase().includes('commitment') && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 14,
            padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 24,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
              Add a Commitment
            </Text>
            <TextInput
              placeholder="What is the commitment?"
              value={newCommitmentTitle}
              onChangeText={setNewCommitmentTitle}
              placeholderTextColor={colors.muted}
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10,
                color: colors.foreground, fontSize: 14, marginBottom: 10,
              }}
            />
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-2">Assign To</Text>
              <FlatList
                scrollEnabled={false}
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setNewCommitmentAssignee(item.id)}
                    className={`p-2 rounded-lg border mb-1.5 ${
                      newCommitmentAssignee === item.id ? 'border-primary' : 'border-border'
                    }`}
                    style={{
                      backgroundColor: newCommitmentAssignee === item.id ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      className={newCommitmentAssignee === item.id ? 'text-white font-semibold' : 'text-foreground'}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
            <Pressable
              onPress={handleAddCommitment}
              className='py-2 bg-primary-dark px-4 rounded-lg'
              style={({ pressed }) => ({
                paddingVertical: 10, borderRadius: 10,
                alignItems: 'center',
              })}
            >
              <Text className='text-white text-center text-sm' style={{fontWeight: '700' }}>Add Commitment</Text>
            </Pressable>
 
            {/* Show commitments added so far this session */}
            {sessionCommitments.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>
                  Added this meeting:
                </Text>
                {sessionCommitments.map((c, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
                    <Text style={{ fontSize: 13, color: colors.foreground }}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
 
        {/* Navigation */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          {currentItemIndex > 0 && (
            <Pressable
              onPress={() => setCurrentItemIndex(currentItemIndex - 1)}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12,
                alignItems: 'center', borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontWeight: '600', color: colors.foreground }}>← Previous</Text>
            </Pressable>
          )}
 
          {isLastItem ? (
            <Pressable
              onPress={handleEndMeeting}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12,
                alignItems: 'center', backgroundColor: '#16A34A',
              }}
            >
              <Text style={{ fontWeight: '700', color: '#fff', fontSize: 15 }}>End Meeting ✓</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setCurrentItemIndex(currentItemIndex + 1)}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12,
                alignItems: 'center', backgroundColor: colors.primary,
              }}
            >
              <Text style={{ fontWeight: '700', color: '#fff', fontSize: 15 }}>Next →</Text>
            </Pressable>
          )}
        </View>
 
      </ScrollView>

      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        reason={upgradeReason}
      />
    </ScreenContainer>
  );
}
