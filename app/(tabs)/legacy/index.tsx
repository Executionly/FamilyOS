import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMemoriesStore } from '@/lib/stores/memories-store';
import { useStoriesStore } from '@/lib/stores/stories-store';
import { useTimelineStore } from '@/lib/stores/timeline-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';

function MemoryThumbnail({ storagePath, colors }: { storagePath: string; colors: any }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const { getSignedUrl } = useMemoriesStore();

  useEffect(() => {
    getSignedUrl(storagePath).then(setSignedUrl);
  }, [storagePath]);

  if (!signedUrl) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }} className="animate-pulse">
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
  const [refreshing, setRefreshing] = useState(false);

  const handleFetch = () => {
    if (!family?.id) return;
    setRefreshing(true);
    try {
      fetchMemories(family.id);
      fetchStories(family.id);
      fetchTimeline(family.id);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (family?.id) {
      handleFetch();
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleFetch} tintColor={colors.primary} />}
      >
        <View className="flex-1 px-5 pt-4">
          
          {/* Header Area */}
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Preserving History</Text>
              <Text className="text-3xl font-black text-foreground">Family Legacy</Text>
            </View>
            <View className="bg-primary/10 rounded-2xl p-2.5">
              <Ionicons name="library-outline" size={20} color={colors.primary} />
            </View>
          </View>

          {/* Premium Tab Navigation Row */}
          <View 
            style={{ backgroundColor: colors.surface, borderColor: colors.border }} 
            className="flex-row rounded-2xl p-1.5 mb-7 border"
          >
            {(['vault', 'stories', 'timeline'] as const).map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  }}
                  className="flex-1 py-3.5 rounded-xl items-center justify-center flex-row"
                >
                  <Ionicons 
                    name={tab === 'vault' ? 'images' : tab === 'stories' ? 'book' : 'trail-sign'} 
                    size={13} 
                    color={isSelected ? '#fff' : colors.muted} 
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{ color: isSelected ? '#ffffff' : colors.foreground }}
                    className="text-[11px] font-bold uppercase tracking-wider"
                  >
                    {tab === 'vault' ? 'Vault' : tab === 'stories' ? 'Stories' : 'Timeline'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Error Banner */}
          {(memoriesError || storiesError) && (
            <View className="flex-row items-center rounded-2xl border border-error/20 bg-error/10 p-4 mb-6">
              <Ionicons name="alert-circle" size={20} color={colors.error || '#ef4444'} />
              <Text className="ml-3 flex-1 text-xs font-semibold text-error">{memoriesError || storiesError}</Text>
            </View>
          )}

          {/* VAULT TAB CONTENT */}
          {activeTab === 'vault' && (
            <View>
              <View className="flex-row justify-between items-center mb-5 px-1">
                <View>
                  <Text className="text-sm font-black text-foreground">Digital Treasure Vault</Text>
                  <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mt-0.5">{memories.length} item(s) secured</Text>
                </View>
                <Pressable
                  onPress={handleAddMemory}
                  style={{ backgroundColor: `${colors.primary}12` }}
                  className="flex-row items-center rounded-xl px-3 py-2"
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text className="text-xs font-bold ml-1" style={{ color: colors.primary }}>
                    Upload
                  </Text>
                </Pressable>
              </View>

              {memories.length === 0 ? (
                <View
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-3xl border p-8 items-center justify-center min-h-[280px]"
                >
                  <View style={{ backgroundColor: `${colors.primary}10` }} className="w-16 h-16 rounded-3xl items-center justify-center mb-4">
                    <Ionicons name="image-outline" size={28} color={colors.primary} />
                  </View>
                  <Text className="text-lg font-black text-foreground mb-1.5 text-center">Capture Your First Snapshot</Text>
                  <Text className="text-xs text-muted text-center leading-relaxed mb-6 px-4">
                    Every family has a story. Begin preserving yours by archiving meaningful photos into the vault.
                  </Text>
                  <Pressable
                    onPress={handleAddMemory}
                    style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
                    className="px-6 py-4 rounded-2xl flex-row items-center shadow-xs"
                  >
                    <Ionicons name="cloud-upload" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text className="text-white text-xs font-bold">Upload to Vault</Text>
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
                      style={{ backgroundColor: colors.surface, borderColor: colors.border, aspectRatio: 1 }}
                      className="flex-1 rounded-2xl overflow-hidden border relative shadow-xs"
                    >
                      {item.media_url ? (
                        <MemoryThumbnail storagePath={item.media_url} colors={colors} />
                      ) : (
                        <View className="flex-1 justify-center items-center">
                          <Ionicons name="image-outline" size={28} color={colors.muted} />
                        </View>
                      )}
                      
                      {/* Gradient Backdrop Mask for Text */}
                      <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent justify-end p-3">
                        <Text className="text-white text-[11px] font-bold leading-tight" numberOfLines={2}>
                          {item.caption || 'Untitled Snapshot'}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  contentContainerStyle={{ gap: 12 }}
                />
              )}
            </View>
          )}

          {/* STORIES TAB CONTENT */}
          {activeTab === 'stories' && (
            <View>
              <View className="flex-row justify-between items-center mb-5 px-1">
                <View>
                  <Text className="text-sm font-black text-foreground">Written Lore & Stories</Text>
                  <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mt-0.5">{stories.length} chronicles(s)</Text>
                </View>
                <Pressable
                  onPress={handleAddStory}
                  style={{ backgroundColor: `${colors.primary}12` }}
                  className="flex-row items-center rounded-xl px-3 py-2"
                >
                  <Ionicons name="pencil" size={12} color={colors.primary} />
                  <Text className="text-xs font-bold ml-1" style={{ color: colors.primary }}>
                    Write
                  </Text>
                </Pressable>
              </View>

              {stories.length === 0 ? (
                <View
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-3xl border p-8 items-center justify-center min-h-[280px]"
                >
                  <View style={{ backgroundColor: `${colors.primary}10` }} className="w-16 h-16 rounded-3xl items-center justify-center mb-4">
                    <Ionicons name="book-outline" size={28} color={colors.primary} />
                  </View>
                  <Text className="text-lg font-black text-foreground mb-1.5 text-center">No Stories Written Yet</Text>
                  <Text className="text-xs text-muted text-center leading-relaxed mb-6 px-4">
                    Record oral histories, heritage facts, and recipes to hand down generations.
                  </Text>
                  <Pressable
                    onPress={handleAddStory}
                    style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
                    className="px-6 py-4 rounded-2xl flex-row items-center shadow-xs"
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text className="text-white text-xs font-bold">Write First Story</Text>
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
                      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                      className="mb-4 p-5 rounded-3xl border shadow-xs"
                    >
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                          <View style={{ backgroundColor: `${colors.primary}12` }} className="w-8 h-8 rounded-xl items-center justify-center mr-2.5">
                            <Ionicons name="bookmark" size={14} color={colors.primary} />
                          </View>
                          <Text className="text-xs font-bold text-primary uppercase tracking-wider">CHRONICLE</Text>
                        </View>
                        <Text className="text-[10px] font-bold text-muted">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                      
                      <Text className="text-base font-black text-foreground mb-2 leading-tight">{item.title}</Text>
                      <Text className="text-xs text-muted leading-relaxed" numberOfLines={3}>
                        {item.body}
                      </Text>

                      <View className="h-[1px] w-full my-4" style={{ backgroundColor: colors.border }} />

                      <View className="flex-row items-center justify-between">
                        <Text className="text-[10px] font-bold text-muted uppercase">Read fully</Text>
                        <Ionicons name="arrow-forward-outline" size={14} color={colors.muted} />
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          {/* TIMELINE TAB CONTENT */}
          {activeTab === 'timeline' && (
            <View>
              <Text className="text-xs font-extrabold text-muted tracking-widest uppercase mb-5 ml-1">Event Chronicle</Text>

              {timelineEvents.length === 0 ? (
                <View
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-3xl border p-8 items-center justify-center min-h-[280px]"
                >
                  <View style={{ backgroundColor: `${colors.primary}10` }} className="w-16 h-16 rounded-3xl items-center justify-center mb-4">
                    <Ionicons name="time-outline" size={28} color={colors.primary} />
                  </View>
                  <Text className="text-lg font-black text-foreground mb-1.5 text-center">Timeline is Empty</Text>
                  <Text className="text-xs text-muted text-center leading-relaxed">
                    Once you upload memories or write stories, they will automatically arrange chronologically right here.
                  </Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={timelineEvents}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <View className="flex-row">
                      
                      {/* Premium Timeline Tracker Design */}
                      <View className="items-center mr-4.5 w-6">
                        <View
                          style={{
                            backgroundColor: colors.background,
                            borderColor: colors.primary,
                          }}
                          className="w-4 h-4 rounded-full border-4 items-center justify-center"
                        />
                        {index < timelineEvents.length - 1 && (
                          <View
                            className="w-0.5 flex-1 my-1.5"
                            style={{ backgroundColor: colors.border, minHeight: 70 }}
                          />
                        )}
                      </View>

                      {/* Timeline Data Card */}
                      <View
                        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                        className="flex-1 p-5 rounded-3xl border mb-5 shadow-xs"
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View style={{ backgroundColor: `${colors.primary}10` }} className="px-2.5 py-1 rounded-lg">
                            <Text style={{ color: colors.primary }} className="text-[10px] font-black uppercase tracking-wider">
                              {new Date(item.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                          <Ionicons name="hourglass-outline" size={12} color={colors.muted} />
                        </View>
                        
                        <Text className="text-base font-black text-foreground mb-1.5 leading-tight">{item.title}</Text>
                        
                        {item.description && (
                          <Text className="text-xs text-muted leading-relaxed" numberOfLines={3}>
                            {item.description}
                          </Text>
                        )}
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