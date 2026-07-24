import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useStoriesStore } from '@/lib/stores/stories-store';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { AppHeader } from '@/components/app-header';

export default function AddStoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family } = useFamilyStore();
  const { user } = useAuthStore();
  const { createStory, loading: storiesLoading } = useStoriesStore();
  const { createTimelineEvent, loading: timelineLoading } = useTimelineStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateStory = async () => {
    if (!title.trim()) {
      setError('Please add a title');
      return;
    }

    if (!body.trim()) {
      setError('Please write the story');
      return;
    }

    if (!family?.id || !user?.id) {
      setError('Family or user not found');
      return;
    }

    try {
      setError(null);
      const story = await createStory({
        family_id: family.id,
        created_by: user.id,
        title: title.trim(),
        body: body.trim(),
        member_tags: [],
      });

      // Create timeline event for the story
      await createTimelineEvent({
        family_id: family.id,
        ref_type: 'story',
        ref_id: story.id,
        date: new Date().toISOString(),
        title: title.trim(),
        description: body.trim().substring(0, 100) + '...',
      });

      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
    }
  };

  const loading = storiesLoading || timelineLoading;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Write Story" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 py-8">

          {error && (
            <View className="bg-red-100 rounded-lg p-3 mb-4">
              <Text className="text-red-800 text-sm">{error}</Text>
            </View>
          )}

          {/* Title Input */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-2">Story Title</Text>
            <TextInput
              placeholder="Give your story a title..."
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              className="p-4 rounded-lg border border-border text-foreground"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
              }}
            />
          </View>

          {/* Story Body Input */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-foreground mb-2">Your Story</Text>
            <TextInput
              placeholder="Write your family's story here. Share memories, lessons, and traditions..."
              placeholderTextColor={colors.muted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              className="p-4 rounded-lg border border-border text-foreground"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
              }}
            />
            <Text className="text-xs text-muted mt-2">
              {body.length} characters
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 py-4 rounded-lg items-center border border-border"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-foreground font-semibold">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreateStory}
              disabled={loading}
              className="flex-1 py-4 rounded-lg items-center"
              style={{ backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Save Story</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
