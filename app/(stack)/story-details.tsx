import { ScrollView, Text, View, Pressable, ActivityIndicator, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStoriesStore, Story } from '@/lib/stores/stories-store';
import { AppHeader } from '@/components/app-header';
import { isAdminAccess } from '@/utils';
import { useFamilyStore } from '@/lib/stores/family-store';

export default function StoryDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams();
  const { stories, loading, deleteStory } = useStoriesStore();
  const [story, setStory] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {currentMember} = useFamilyStore()
  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    if (id && typeof id === 'string') {
      const found = stories.find((s) => s.id === id);
      setStory(found || null);
    }
  }, [id, stories]);

  const handleDelete = async () => {
    if (!story) return;
    setDeleting(true);
    try {
      await deleteStory(story.id);
      router.back();
    } catch (error) {
      console.error('Error deleting story:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!story) return;
    try {
      await Share.share({
        message: `${story.title}\n\n${story.body}`,
        title: story.title,
      });
    } catch (error) {
      console.error('Error sharing story:', error);
    }
  };

  console.log("story",story)
  if (loading || !story) {
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
        <AppHeader title="Memory Details" showBack 
        right={
          <>
            {
              currentMember?.user_id === story.created_by || isEditor ? (
                <Pressable onPress={handleDelete} disabled={deleting}>
                  <Text className="text-red-500 font-semibold">{deleting ? 'Deleting...' : 'Delete'}</Text>
                </Pressable>
            ) : null
            }
          </>
        }
        />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">

          {/* Title */}
          <Text className="text-3xl font-bold text-foreground mb-2">{story.title}</Text>

          {/* Metadata */}
          <Text className="text-sm text-muted mb-6">
            {new Date(story.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>

          {/* Story Body */}
          <Text className="text-base text-foreground leading-7 mb-8">{story.body}</Text>

          {/* Member Tags */}
          {story.member_tags && story.member_tags.length > 0 && (
            <View className="mb-8">
              <Text className="text-sm font-semibold text-foreground mb-3">People in this story</Text>
              <View className="flex-row flex-wrap gap-2">
                {story.member_tags.map((tag) => (
                  <View
                    key={tag}
                    className="px-4 py-2 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-white text-sm font-semibold">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-auto">
            <Pressable
              onPress={handleShare}
              className="flex-1 py-4 rounded-lg items-center border border-border"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-foreground font-semibold">Share</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              className="flex-1 py-4 rounded-lg items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-white font-semibold">Close</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
