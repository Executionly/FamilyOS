import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMemoriesStore } from '@/lib/stores/memories-store';
import { useStoriesStore } from '@/lib/stores/stories-store';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';


function MemoryThumbnail({ storagePath, colors }: { storagePath: string, colors: any }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const { getSignedUrl } = useMemoriesStore();

  useEffect(() => {
    getSignedUrl(storagePath).then(setSignedUrl);
  }, [storagePath]);

  if (!signedUrl) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: signedUrl }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
    />
  );
}

export default function LegacyScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family } = useFamilyStore();
  const { memories, loading: memoriesLoading, error: memoriesError, fetchMemories } = useMemoriesStore();
  const { stories, loading: storiesLoading, error: storiesError, fetchStories } = useStoriesStore();
  const { events: timelineEvents, loading: timelineLoading, fetchTimeline } = useTimelineStore();
  const [activeTab, setActiveTab] = useState<'vault' | 'stories' | 'timeline'>('vault');
  const [refreshing, setRefreshing] = useState(false)

  const handleFetch = () => {
    if(!family?.id) return
    setRefreshing(true)
    try {
      fetchMemories(family.id);
      fetchStories(family.id);
      fetchTimeline(family.id);
    } finally {
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    if (family?.id) {
      handleFetch()
    }
  }, [family?.id, fetchMemories, fetchStories, fetchTimeline]);

  const handleAddMemory = () => {
    router.push('/legacy/add-memory');
  };

  const handleAddStory = () => {
    router.push('/legacy/add-story');
  };

  const handleMemoryPress = (memoryId: string) => {
    router.push(`/(stack)/memory-details?id=${memoryId}`);
  };

  const handleStoryPress = (storyId: string) => {
    router.push(`/(stack)/story-details?id=${storyId}`);
  };

  const loading = memoriesLoading || storiesLoading || timelineLoading;

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
      <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleFetch} />}
      >
        <View className="flex-1 px-6 py-2">
          <Text className="text-2xl font-bold text-foreground mb-6 text-center">Family Legacy</Text>

          {/* Tab Navigation */}
          <View className="flex-row mb-6 gap-2">
            <Pressable
              onPress={() => setActiveTab('vault')}
              className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'vault' ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`font-semibold ${activeTab === 'vault' ? 'text-white' : 'text-foreground'}`}>
                Vault
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('stories')}
              className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'stories' ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`font-semibold ${activeTab === 'stories' ? 'text-white' : 'text-foreground'}`}>
                Stories
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('timeline')}
              className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'timeline' ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`font-semibold ${activeTab === 'timeline' ? 'text-white' : 'text-foreground'}`}>
                Timeline
              </Text>
            </Pressable>
          </View>

          {/* Error State */}
          {(memoriesError || storiesError) && (
            <View className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
              <Text className="text-red-800 text-sm">{memoriesError || storiesError}</Text>
            </View>
          )}

          {/* Memory Vault Tab */}
          {activeTab === 'vault' && (
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-foreground">Memories</Text>
                <Pressable onPress={handleAddMemory}>
                  <Text className="text-primary font-semibold">+ Add</Text>
                </Pressable>
              </View>

              {memories.length === 0 ? (
                <View
                  className="rounded-lg border border-border p-8 items-center"
                  style={{ backgroundColor: colors.surface }}
                >
                  <IconSymbol size={48} name="photo.fill" color={colors.primary} />
                  <Text className="text-lg font-semibold text-foreground mt-4 mb-2">No memories yet</Text>
                  <Text className="text-muted text-center mb-6">
                    Capture your family's special moments and preserve them forever.
                  </Text>
                  <Pressable
                    onPress={handleAddMemory}
                    className="px-6 py-3 rounded-lg"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-white font-semibold">Add First Memory</Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={memories}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 12 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleMemoryPress(item.id)}
                      className="flex-1 rounded-lg overflow-hidden border border-border"
                      style={{ backgroundColor: colors.surface, aspectRatio: 1 }}
                    >
                      {item.media_url ? (
                        <MemoryThumbnail storagePath={item.media_url} colors={colors}/>
                      ) : (
                        <View className="flex-1 justify-center items-center bg-muted">
                          <IconSymbol size={32} name="photo.fill" color={colors.primary} />
                        </View>
                      )}
                      {item.caption && (
                        <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                          <Text className="text-white text-xs font-semibold" numberOfLines={2}>
                            {item.caption}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                  contentContainerStyle={{ gap: 12 }}
                />
              )}
            </View>
          )}

          {/* Stories Tab */}
          {activeTab === 'stories' && (
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-foreground">Family Stories</Text>
                <Pressable onPress={handleAddStory}>
                  <Text className="text-primary font-semibold">+ Add</Text>
                </Pressable>
              </View>

              {stories.length === 0 ? (
                <View
                  className="rounded-lg border border-border p-8 items-center"
                  style={{ backgroundColor: colors.surface }}
                >
                  <IconSymbol size={48} name="book.fill" color={colors.primary} />
                  <Text className="text-lg font-semibold text-foreground mt-4 mb-2">No stories yet</Text>
                  <Text className="text-muted text-center mb-6">
                    Share your family's most meaningful stories and traditions.
                  </Text>
                  <Pressable
                    onPress={handleAddStory}
                    className="px-6 py-3 rounded-lg"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-white font-semibold">Write First Story</Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={stories}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleStoryPress(item.id)}
                      className="mb-4 p-4 rounded-lg border border-border"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <Text className="text-base font-semibold text-foreground mb-2">{item.title}</Text>
                      <Text className="text-sm text-muted mb-3" numberOfLines={3}>
                        {item.body}
                      </Text>
                      <Text className="text-xs text-muted">
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <View>
              <Text className="text-lg font-semibold text-foreground mb-4">Family Timeline</Text>

              {timelineEvents.length === 0 ? (
                <View
                  className="rounded-lg border border-border p-8 items-center"
                  style={{ backgroundColor: colors.surface }}
                >
                  <IconSymbol size={48} name="calendar" color={colors.primary} />
                  <Text className="text-lg font-semibold text-foreground mt-4 mb-2">No timeline events</Text>
                  <Text className="text-muted text-center">
                    Your family's memories and stories will appear here chronologically.
                  </Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={timelineEvents}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View className="flex-row mb-6">
                      {/* Timeline dot */}
                      <View className="items-center mr-4">
                        <View
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: colors.primary }}
                        />
                        <View
                          className="w-0.5 flex-1 mt-2"
                          style={{ backgroundColor: colors.border, minHeight: 40 }}
                        />
                      </View>

                      {/* Event content */}
                      <View
                        className="flex-1 p-4 rounded-lg border border-border mb-4"
                        style={{ backgroundColor: colors.surface }}
                      >
                        <Text className="text-base font-semibold text-foreground mb-1">{item.title}</Text>
                        {item.description && (
                          <Text className="text-sm text-muted mb-2">{item.description}</Text>
                        )}
                        <Text className="text-xs text-muted">
                          {new Date(item.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
