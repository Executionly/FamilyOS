import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput, FlatList, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import * as KeepAwake from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { Member, useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { generateMeetingSummary } from '@/lib/services/meeting-ai';
import { AppHeader } from '@/components/app-header';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { Ionicons } from '@expo/vector-icons';
import LinearButton from '@/components/ui/LinearButton';

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

const avatarUrlCache = new Map<string, string>();

function MemberAvatar({ member, colors, selected }: { 
  member: Member; 
  colors: ReturnType<typeof useColors>;
  selected?: boolean
}) {
  const { getAvatarSignedUrl } = useFamilyStore();
  const [signedUrl, setSignedUrl] = useState<string | null>(
    member.avatar_url ? avatarUrlCache.get(member.avatar_url) ?? null : null
  );

  useEffect(() => {
    let cancelled = false;
    if (!member.avatar_url) {
      setSignedUrl(null);
      return;
    }
    const cached = avatarUrlCache.get(member.avatar_url);
    if (cached) {
      setSignedUrl(cached);
      return;
    }
    getAvatarSignedUrl(member.avatar_url).then((url) => {
      if (url) avatarUrlCache.set(member.avatar_url!, url);
      if (!cancelled) setSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [member.avatar_url, getAvatarSignedUrl]);

  return (
    signedUrl ? (
      <Image
        source={{ uri: signedUrl }}
        className="w-9 h-9 rounded-full mr-2.5"
      />
    ) : (
      <View
        style={{
          backgroundColor: selected ? "rgba(255,255,255,0.2)" : colors.border,
        }}
        className="w-9 h-9 rounded-full items-center justify-center mr-2.5"
      >
        <Text
          style={{ color: selected ? colors.background : colors.foreground }}
          className="font-bold text-xs"
        >
          {member.name ? member.name.slice(0, 2).toUpperCase() : ""}
        </Text>
      </View>
    )
  );
}

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
        await updateMeeting(meetingId, { status: 'completed' });
        router.push(`/meetings/summary?meetingId=${meetingId}`);
      } else {
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
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{ backgroundColor: colors.primary + '14' }}
            className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text className="text-lg font-bold text-foreground text-center">
            Generating your meeting summary...
          </Text>
          <Text className="text-[13px] text-muted mt-2 text-center leading-relaxed">
            Reviewing decisions and commitments made today.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const progressPct = ((currentItemIndex + 1) / agendaItems.length) * 100;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title={currentMeeting.title} showBack />
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Progress card */}
        <View
          style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
          className="rounded-2xl p-4 border mb-6"
        >
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center">
              <Ionicons name="flag-outline" size={13} color={colors.primary} style={{ marginRight: 6 }} />
              <Text className="text-xs font-bold text-muted">
                Step {currentItemIndex + 1} of {agendaItems.length}
              </Text>
            </View>
            <View
              style={{ backgroundColor: colors.primary + '14' }}
              className="rounded-full px-2.5 py-1"
            >
              <Text style={{ color: colors.primary }} className="text-xs font-extrabold">
                {Math.round(progressPct)}%
              </Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
            <LinearGradient
              colors={[colors.primary, colors.primary + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: '100%', width: `${progressPct}%`, borderRadius: 4 }}
            />
          </View>
        </View>

        {/* Current agenda item */}
        {currentItem && (
          <View
            style={[CTA_SHADOW, { borderRadius: 24 }]}
            className="mb-6 overflow-hidden"
          >
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
              <View
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                className="w-11 h-11 rounded-2xl items-center justify-center mb-4"
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
              </View>
              <Text className="text-2xl font-extrabold text-white mb-2 leading-tight">
                {currentItem.title}
              </Text>
              {currentItem.description ? (
                <Text style={{ color: 'rgba(255,255,255,0.88)' }} className="text-sm leading-relaxed">
                  {currentItem.description}
                </Text>
              ) : null}
            </LinearGradient>
          </View>
        )}

        {/* Key Decisions — capture what was decided */}
        {currentItem?.title.toLowerCase().includes('decision') && (
          <View
            style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
            className="rounded-2xl p-5 border mb-6"
          >
            <View className="flex-row items-center mb-3">
              <View
                style={{ backgroundColor: colors.primary + '14' }}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
              >
                <Ionicons name="checkbox-outline" size={16} color={colors.primary} />
              </View>
              <Text className="text-sm font-bold text-foreground">Record Decisions Made</Text>
            </View>
            <TextInput
              placeholder="Type the decisions your family made..."
              value={decisionNotes}
              onChangeText={setDecisionNotes}
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="rounded-xl px-4 py-3 text-sm border"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
                minHeight: 100,
              }}
            />
          </View>
        )}

        {/* New Commitments — add live commitments */}
        {currentItem?.title.toLowerCase().includes('commitment') && (
          <View
            style={[CARD_SHADOW, { backgroundColor: colors.surface, borderColor: colors.border }]}
            className="rounded-2xl p-5 border mb-6"
          >
            <View className="flex-row items-center mb-3">
              <View
                style={{ backgroundColor: colors.primary + '14' }}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2.5"
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              </View>
              <Text className="text-sm font-bold text-foreground">Add a Commitment</Text>
            </View>
            <TextInput
              placeholder="What is the commitment?"
              value={newCommitmentTitle}
              onChangeText={setNewCommitmentTitle}
              placeholderTextColor={colors.muted}
              className="rounded-xl px-4 py-3 text-sm border mb-4"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
              }}
            />

            <View className="mb-4">
              <Text className="text-xs font-bold text-muted tracking-wide mb-2.5">ASSIGN TO</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={members}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                renderItem={({ item }) => {
                  const selected = newCommitmentAssignee === item.id;
                  const photoUrl = item.avatar_url;
                  const role = item.role;

                  return (
                    <Pressable
                      onPress={() => setNewCommitmentAssignee(item.id)}
                      style={{
                        backgroundColor: selected ? colors.primary : colors.background,
                        borderColor: selected ? colors.primary : colors.border,
                      }}
                      className="flex-row items-center p-2.5 pr-3.5 rounded-xl border"
                    >
                      <MemberAvatar member={item} selected={selected} colors={colors}/>
                      <View className="justify-center">
                        <Text
                          style={{ color: selected ? colors.background : colors.foreground }}
                          className="font-semibold text-sm"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {role && (
                          <Text
                            style={{
                              color: selected ? colors.background : colors.muted,
                              opacity: selected ? 0.85 : 1,
                            }}
                            className="text-xs"
                            numberOfLines={1}
                          >
                            {role}
                          </Text>
                        )}
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={colors.background}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </Pressable>
                  );
                }}
              />
            </View>

            <LinearButton
            title='Add Commitment'
            onPress={handleAddCommitment}
            icon='add'
            />

            {/* Show commitments added so far this session */}
            {sessionCommitments.length > 0 && (
              <View
                style={{ borderTopColor: colors.border }}
                className="mt-4 pt-4 border-t"
              >
                <Text className="text-xs font-bold text-muted tracking-wide mb-2.5">
                  ADDED THIS MEETING
                </Text>
                {sessionCommitments.map((c, i) => (
                  <View key={i} className="flex-row items-center mb-2">
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" style={{ marginRight: 8 }} />
                    <Text className="text-sm text-foreground flex-1">{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Upgrade notice */}
        {isLastItem && family?.subscription_tier !== 'premium' && (
          <View
            style={{ backgroundColor: colors.primary + '0D', borderColor: colors.primary + '30' }}
            className="mb-6 flex-row items-start gap-2.5 rounded-2xl p-4 border"
          >
            <Ionicons name="sparkles" size={15} color={colors.primary} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-xs leading-5 text-muted">
              Free plan includes one AI-generated agenda and one AI meeting summary. Upgrade to Premium for
              unlimited agendas and summaries.
            </Text>
          </View>
        )}

        {/* Navigation */}
        <View className="flex-row gap-3">
          {currentItemIndex > 0 && (
            <Pressable
              onPress={() => setCurrentItemIndex(currentItemIndex - 1)}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="flex-1 py-4 rounded-2xl items-center border flex-row justify-center"
            >
              <Ionicons name="arrow-back" size={15} color={colors.foreground} style={{ marginRight: 6 }} />
              <Text className="font-bold text-foreground text-sm">Previous</Text>
            </Pressable>
          )}

          {isLastItem ? (
            <LinearButton
            title='End Meeting'
            onPress={handleEndMeeting}
            icon='checkmark-circle'
            />
          ) : (
            <LinearButton
            title='Next'
            onPress={() => setCurrentItemIndex(currentItemIndex + 1)}
            icon='arrow-forward'
            />
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