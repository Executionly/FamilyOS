
import { useEffect, useState } from 'react';
import {
  ScrollView, Text, View, Pressable,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useMemoriesStore, Memory } from '@/lib/stores/memories-store';
import { useColors } from '@/hooks/use-colors';
import { supabase } from '@/lib/_core/supabase';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';

const TYPE_ICON: Record<Memory['type'], keyof typeof Ionicons.glyphMap> = {
  photo: 'image-outline',
  clip: 'videocam-outline',
  note: 'document-text-outline',
};

export default function MemoryDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams();
  const { memories, loading, deleteMemory, getSignedUrl } = useMemoriesStore();

  const [memory, setMemory] = useState<Memory | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

const player = useVideoPlayer(
  memory?.type === 'clip' && signedUrl ? signedUrl : null,
  (p) => { p.loop = false; }
);
  // Find memory from store
  useEffect(() => {
  if (!id || typeof id !== 'string') return;

  // Try store first (instant if already loaded)
  const found = memories.find((m) => m.id === id);

  if (found) {
    setMemory(found);
    setMemoryLoading(false);
    return;
  }

  // Fall back to direct Supabase fetch
  supabase
    .from('memory')
    .select('*')
    .eq('id', id)
    .single()
    .then(({ data, error }) => {
      if (!error && data) setMemory(data);
      setMemoryLoading(false);
    });
}, [id, memories]);

  // Resolve storage path → signed URL
  useEffect(() => {
    if (!memory?.media_url) return;
    setUrlLoading(true);
    getSignedUrl(memory.media_url)
      .then((url) => {
        console.log('signedUrl', url); // check this
        setSignedUrl(url);
        })
      .finally(() => setUrlLoading(false));
  }, [memory?.media_url]);

  const handleDelete = () => {
    if (!memory) return;
    Alert.alert(
      'Delete Memory',
      'This will permanently delete this memory and its media. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteMemory(memory.id);
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete memory. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };
console.log("memory",memory)
    if (memoryLoading) {
        return (
            <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
            </ScreenContainer>
        );
    }

    if (!memory) {
        return (
            <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
            <AppHeader title="Memory" showBack />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <Ionicons name="image-outline" size={48} color={colors.muted} />
                <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center' }}>
                Memory not found.
                </Text>
            </View>
            </ScreenContainer>
        );
    }

    return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader
        title="Memory"
        showBack
        right={
          <Pressable
            onPress={handleDelete}
            disabled={deleting}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({ opacity: pressed || deleting ? 0.5 : 1 })}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            )}
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Media area ─────────────────────────────────── */}
        {memory.media_url ? (
          <View style={{ width: '100%', height: 300, backgroundColor: '#0F172A' }}>
            {urlLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>
                  Loading media...
                </Text>
              </View>
            ) : signedUrl ? (
              memory.type === 'clip' ? (
                <VideoView
                    player={player}
                    style={{ width: '100%', height: 300 }}
                    allowsFullscreen
                    allowsPictureInPicture
                />
              ) : (
                <Image
                  source={{ uri: signedUrl }}
                  style={{ width: '100%', height: 300 }}
                  transition={300}
                    onLoad={() => console.log('image loaded ✅')}
                    onError={(e) => console.log('image error ❌', e)}
                />
              )
            ) : (
              // Signed URL failed
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>
                  Media unavailable
                </Text>
              </View>
            )}
          </View>
        ) : (
          // Note type — no media, show icon banner
          <View style={{
            width: '100%', height: 160,
            backgroundColor: colors.surface,
            justifyContent: 'center', alignItems: 'center',
            borderBottomWidth: 1, borderColor: colors.border,
          }}>
            <Ionicons name={TYPE_ICON[memory.type]} size={52} color={colors.muted} />
          </View>
        )}

        {/* ── Content ────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>

          {/* Type badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            marginBottom: 12,
          }}>
            <Ionicons name={TYPE_ICON[memory.type]} size={14} color={colors.primary} />
            <Text style={{
              fontSize: 11, fontWeight: '700', color: colors.primary,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              {memory.type}
            </Text>
          </View>

          {/* Caption */}
          <Text style={{
            fontSize: 20, fontWeight: '700', color: colors.foreground,
            lineHeight: 28, marginBottom: 20,
          }}>
            {memory.caption || 'No caption'}
          </Text>

          {/* Metadata card */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 14, padding: 16,
            borderWidth: 1, borderColor: colors.border,
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="calendar-outline" size={16} color={colors.muted} />
              <Text style={{ fontSize: 14, color: colors.muted }}>
                {new Date(memory.event_date).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </Text>
            </View>

            {memory.member_tags && memory.member_tags.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Ionicons name="people-outline" size={16} color={colors.muted} />
                  <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '600' }}>
                    Tagged members
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {memory.member_tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 4,
                        borderRadius: 20, backgroundColor: colors.primary,
                      }}
                    >
                      <Text className='capitalize'
                      style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
