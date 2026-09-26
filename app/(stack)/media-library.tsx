import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { supabase } from '@/lib/_core/supabase';
import { deleteMediaFile } from '@/utils/storage-gate';
import { isAdminAccess } from '@/utils';

interface MediaItem {
  id: string;
  bucket: string;
  storage_path: string;
  size_bytes: number;
  source_type: string;
  created_at: string;
  signed_url?: string;
}

const SOURCE_LABELS: Record<
  string,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  memory: {
    label: 'Memory',
    icon: 'images-outline',
  },
  group_chat: {
    label: 'Family Chat',
    icon: 'chatbubbles-outline',
  },
  dm: {
    label: 'Direct Message',
    icon: 'chatbubble-outline',
  },
  avatar: {
    label: 'Avatar',
    icon: 'person-outline',
  },
  family_photo: {
    label: 'Family Photo',
    icon: 'home-outline',
  },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Recently added';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MediaLibraryScreen() {
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBytes, setTotalBytes] = useState(0);
  const [filter, setFilter] = useState<string>('all');

  const isEditor = isAdminAccess(currentMember?.role);

  useEffect(() => {
    if (family?.id) {
      loadMedia();
    }
  }, [family?.id]);

  const loadMedia = async () => {
    if (!family?.id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('family_media')
        .select('*')
        .eq('family_id', family.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data ?? []).map(async (item) => {
          const { data: signed } = await supabase.storage
            .from(item.bucket)
            .createSignedUrl(item.storage_path, 60 * 60);

          return {
            ...item,
            signed_url: signed?.signedUrl,
          };
        }),
      );

      setItems(enriched);
      setTotalBytes(
        enriched.reduce((sum, item) => sum + item.size_bytes, 0),
      );
    } catch (error) {
      console.error('Failed to load media library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item: MediaItem) => {
    Alert.alert(
      'Delete media',
      'Are you sure you want to permanently delete this file?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMediaFile(item.id);

              setItems((previous) =>
                previous.filter((media) => media.id !== item.id),
              );

              setTotalBytes((previous) =>
                Math.max(previous - item.size_bytes, 0),
              );
            } catch (error) {
              console.error('Failed to delete media:', error);
              Alert.alert(
                'Unable to delete',
                'The file could not be deleted. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const filterOptions = useMemo(() => {
    const availableSources = Array.from(
      new Set(items.map((item) => item.source_type)),
    );

    return [
      {
        key: 'all',
        label: 'All files',
        count: items.length,
      },
      ...availableSources.map((source) => ({
        key: source,
        label: SOURCE_LABELS[source]?.label ?? source,
        count: items.filter((item) => item.source_type === source).length,
      })),
    ];
  }, [items]);

  const filteredItems =
    filter === 'all'
      ? items
      : items.filter((item) => item.source_type === filter);

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Family Media" showBack />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{
          paddingHorizontal: 16,
          gap: 12,
        }}
        contentContainerStyle={{
          paddingBottom: 32,
        }}
        ListHeaderComponent={
          <View className="px-4 pt-4">
            {/* Page introduction */}
            <View className="mb-5 flex-row items-end justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
                  Shared library
                </Text>

                <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
                  Family media
                </Text>

                <Text className="mt-1 text-xs font-medium leading-4 text-muted">
                  Photos and files shared across your family space.
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: `${colors.primary}14`,
                  borderColor: `${colors.primary}28`,
                }}
                className="ml-4 h-11 w-11 items-center justify-center rounded-2xl border"
              >
                <Ionicons
                  name="images-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>
            </View>

            {/* Storage overview */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 2,
              }}
              className="mb-5 overflow-hidden rounded-[24px] border"
            >
              <View className="flex-row items-center px-4 py-4">
                <View
                  style={{ backgroundColor: `${colors.primary}14` }}
                  className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                >
                  <Ionicons
                    name="cloud-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                    Library storage
                  </Text>

                  <Text className="mt-1 text-lg font-black text-foreground">
                    {formatBytes(totalBytes)}
                  </Text>
                </View>

                <View className="items-end">
                  <Text
                    style={{ color: colors.primary }}
                    className="text-lg font-black"
                  >
                    {items.length}
                  </Text>

                  <Text className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {items.length === 1 ? 'file' : 'files'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: `${colors.primary}08`,
                  borderTopColor: colors.border,
                }}
                className="border-t px-4 py-3"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={colors.primary}
                  />

                  <Text className="ml-2 text-[10px] font-semibold text-muted">
                    Media is available to your family space
                  </Text>
                </View>
              </View>
            </View>

            {/* Filters */}
            {filterOptions.length > 1 && (
              <View className="mb-5">
                <Text className="mb-2 px-1 text-[10px] font-black uppercase tracking-[1.4px] text-muted">
                  Browse by source
                </Text>

                <FlatList
                  horizontal
                  data={filterOptions}
                  keyExtractor={(item) => item.key}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item }) => {
                    const selected = filter === item.key;

                    return (
                      <Pressable
                        onPress={() => setFilter(item.key)}
                        style={{
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        }}
                        className="flex-row items-center rounded-full border px-3.5 py-2"
                      >
                        <Text
                          style={{
                            color: selected
                              ? '#FFFFFF'
                              : colors.foreground,
                          }}
                          className="text-xs font-black"
                        >
                          {item.label}
                        </Text>

                        <View
                          style={{
                            backgroundColor: selected
                              ? 'rgba(255,255,255,0.2)'
                              : `${colors.primary}12`,
                          }}
                          className="ml-2 min-w-[20px] items-center rounded-full px-1.5 py-0.5"
                        >
                          <Text
                            style={{
                              color: selected
                                ? '#FFFFFF'
                                : colors.primary,
                            }}
                            className="text-[9px] font-black"
                          >
                            {item.count}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  }}
                />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center justify-center px-4 py-20">
              <View
                style={{ backgroundColor: `${colors.primary}14` }}
                className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
              >
                <Ionicons
                  name="images-outline"
                  size={27}
                  color={colors.primary}
                />
              </View>

              <ActivityIndicator color={colors.primary} />

              <Text className="mt-4 text-sm font-black text-foreground">
                Loading your media
              </Text>

              <Text className="mt-1 text-xs text-muted">
                Preparing your family library
              </Text>
            </View>
          ) : (
            <View className="items-center px-8 py-16">
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
                className="h-16 w-16 items-center justify-center rounded-2xl border"
              >
                <Ionicons
                  name="images-outline"
                  size={29}
                  color={colors.muted}
                />
              </View>

              <Text className="mt-4 text-base font-black text-foreground">
                {filter === 'all'
                  ? 'No media yet'
                  : 'No media in this category'}
              </Text>

              <Text className="mt-1 text-center text-xs leading-5 text-muted">
                {filter === 'all'
                  ? 'Photos and files shared with your family will appear here.'
                  : 'Try another category to view more of your family media.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const meta =
            SOURCE_LABELS[item.source_type] ?? {
              label: item.source_type,
              icon: 'document-outline' as const,
            };

          return (
            <View className="mb-4 flex-1">
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 2,
                }}
                className="overflow-hidden rounded-[20px] border"
              >
                {/* Media preview */}
                <View className="aspect-square overflow-hidden bg-border">
                  {item.signed_url ? (
                    <Image
                      source={{ uri: item.signed_url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <View
                        style={{
                          backgroundColor: `${colors.primary}14`,
                        }}
                        className="h-11 w-11 items-center justify-center rounded-xl"
                      >
                        <Ionicons
                          name={meta.icon}
                          size={21}
                          color={colors.primary}
                        />
                      </View>
                    </View>
                  )}

                  <View className="absolute inset-x-0 bottom-0 bg-black/55 px-2.5 py-2">
                    <View className="flex-row items-center">
                      <Ionicons
                        name={meta.icon}
                        size={11}
                        color="#FFFFFF"
                      />

                      <Text
                        numberOfLines={1}
                        className="ml-1.5 flex-1 text-[9px] font-black uppercase tracking-wider text-white"
                      >
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  {isEditor && (
                    <Pressable
                      onPress={() => handleDelete(item)}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        backgroundColor: pressed
                          ? '#EF4444'
                          : 'rgba(0,0,0,0.62)',
                        opacity: pressed ? 0.85 : 1,
                      })}
                      className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  )}
                </View>

                {/* Media metadata */}
                <View className="px-3 py-3">
                  <Text className="text-[10px] font-bold text-foreground">
                    {formatDate(item.created_at)}
                  </Text>

                  <View className="mt-1 flex-row items-center justify-between">
                    <Text className="text-[10px] font-medium text-muted">
                      {formatBytes(item.size_bytes)}
                    </Text>

                    {item.source_type === 'family_photo' && (
                      <Ionicons
                        name="home-outline"
                        size={13}
                        color={colors.primary}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}
