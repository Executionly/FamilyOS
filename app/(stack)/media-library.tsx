import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
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

const SOURCE_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  memory: { label: 'Memory', icon: 'images-outline' },
  group_chat: { label: 'Family Chat', icon: 'chatbubbles-outline' },
  dm: { label: 'Direct Message', icon: 'chatbubble-outline' },
  avatar: { label: 'Avatar', icon: 'person-outline' },
  family_photo: { label: 'Family Photo', icon: 'home-outline' },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryScreen() {
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBytes, setTotalBytes] = useState(0);
  const [filter, setFilter] = useState<string>('all');

  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    if (family?.id) loadMedia();
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
          const { data: signed } = await supabase.storage.from(item.bucket).createSignedUrl(item.storage_path, 60 * 60);
          return { ...item, signed_url: signed?.signedUrl };
        })
      );

      setItems(enriched);
      setTotalBytes(enriched.reduce((sum, i) => sum + i.size_bytes, 0));
    } catch (err) {
      console.error('Failed to load media library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    try {
      await deleteMediaFile(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotalBytes((prev) => prev - item.size_bytes);
    } catch (err) {
      console.error('Failed to delete media:', err);
      alert('Failed to delete. Please try again.');
    }
  };

  const filteredItems = filter === 'all' ? items : items.filter((i) => i.source_type === filter);

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Media" showBack />

      <View className="border-b border-border px-4 py-3">
        <Text className="text-xs text-muted">
          {items.length} files · {formatBytes(totalBytes)} used
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ padding: 8 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="images-outline" size={28} color={colors.muted} />
              <Text className="mt-2 text-sm text-muted">No media yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = SOURCE_LABELS[item.source_type] ?? { label: item.source_type, icon: 'document-outline' as const };
            return (
              <View className="w-1/3 p-1">
                <View className="aspect-square overflow-hidden rounded-xl bg-border">
                  {item.signed_url ? (
                    <Image source={{ uri: item.signed_url }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Ionicons name={meta.icon} size={20} color={colors.muted} />
                    </View>
                  )}
                  <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1">
                    <Text className="text-[9px] font-semibold text-white" numberOfLines={1}>{meta.label}</Text>
                  </View>
                  {isEditor && (
                    <Pressable
                      onPress={() => handleDelete(item)}
                      className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                    >
                      <Ionicons name="trash-outline" size={12} color="#fff" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}