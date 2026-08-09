import { useEffect, useState } from 'react';
import {
  ScrollView, Text, View, Pressable, TextInput,
  ActivityIndicator, Image, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useMemoriesStore } from '@/lib/stores/memories-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';

type MemoryType = 'photo' | 'clip' | 'note';

const TYPE_CONFIG: Record<MemoryType, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  photo: { icon: 'image-outline', label: 'Photo' },
  clip:  { icon: 'videocam-outline', label: 'Video' },
  note:  { icon: 'document-text-outline', label: 'Note' },
};

export default function AddMemoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family } = useFamilyStore();
  const { user } = useAuthStore();
  const { createMemory, uploadMemoryMedia, fetchFamilyMembers, loading, uploading } = useMemoriesStore();

  const [caption, setCaption] = useState('');
  const [memoryType, setMemoryType] = useState<MemoryType>('photo');
  const [pickedFile, setPickedFile] = useState<{
    uri: string;
    mimeType: string;
    fileName: string;
    isVideo: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isBusy = loading || uploading;

    useEffect(() => {
        if (family?.id) {
            fetchFamilyMembers(family.id).then(setMembers).catch(() => {});
        }
    }, [family?.id]);

    const toggleTag = (memberId: string) => {
        setSelectedTags((prev) =>
            prev.includes(memberId)
            ? prev.filter((t) => t !== memberId)
            : [...prev, memberId]
        );
    };
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access photos is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: memoryType === 'clip'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: memoryType === 'photo' ? [4, 3] : undefined,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      const fileName = asset.fileName || `memory_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      const mimeType = isVideo ? 'video/mp4' : (asset.mimeType || 'image/jpeg');

      setPickedFile({ uri: asset.uri, mimeType, fileName, isVideo });
      setError(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `memory_${Date.now()}.jpg`;
      setPickedFile({ uri: asset.uri, mimeType: 'image/jpeg', fileName, isVideo: false });
      setError(null);
    }
  };

  // ── Submit ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!caption.trim()) {
      setError('Please add a caption.');
      return;
    }
    if (!family?.id || !user?.id) {
      setError('Family or user not found.');
      return;
    }
    if (memoryType !== 'note' && !pickedFile) {
      setError(`Please select a ${memoryType} to upload.`);
      return;
    }

    try {
      setError(null);
      let storagePath: string | undefined;

      if (pickedFile) {
        storagePath = await uploadMemoryMedia(
          family.id,
          pickedFile.uri,
          pickedFile.mimeType,
          pickedFile.fileName,
        );
      }

      await createMemory({
        family_id: family.id,
        created_by: user.id,
        type: memoryType,
        caption: caption.trim(),
        media_url: storagePath,
        member_tags: selectedTags,
        event_date: new Date().toISOString(),
      });

      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memory.');
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Add Memory" showBack />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Error */}
        {error && (
          <View style={{
            backgroundColor: '#FEE2E2', borderRadius: 10,
            padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA',
          }}>
            <Text style={{ color: '#DC2626', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Memory Type */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
          Memory Type
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {(Object.entries(TYPE_CONFIG) as [MemoryType, typeof TYPE_CONFIG[MemoryType]][]).map(
            ([type, config]) => {
              const active = memoryType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => {
                    setMemoryType(type);
                    setPickedFile(null);
                  }}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 12,
                    alignItems: 'center', gap: 4,
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Ionicons
                    name={config.icon}
                    size={20}
                    color={active ? '#fff' : colors.muted}
                  />
                  <Text style={{
                    fontSize: 12, fontWeight: '600',
                    color: active ? '#fff' : colors.foreground,
                  }}>
                    {config.label}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        {/* Media Picker (photo or clip) */}
        {memoryType !== 'note' && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
              {memoryType === 'photo' ? 'Photo' : 'Video'}
            </Text>

            {pickedFile ? (
              /* Preview */
              <View style={{ borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                {!pickedFile.isVideo ? (
                  <Image
                    source={{ uri: pickedFile.uri }}
                    style={{ width: '100%', height: 220, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View  
                  style={{
                    width: '100%', height: 220, borderRadius: 14,
                    backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: colors.border,
                  }}>
                    <Ionicons name="videocam" size={48} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, marginTop: 8, opacity: 0.7 }}>
                      {pickedFile.fileName}
                    </Text>
                  </View>
                )}
                {/* Remove button */}
                <TouchableOpacity
                  onPress={() => setPickedFile(null)}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    borderRadius: 20, padding: 6,
                  }}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              /* Pick / Take buttons */
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  className='flex-col items-center justify-center'
                  onPress={pickImage}
                  style={({ pressed }) => ({
                    flex: 1, paddingVertical: 16, borderRadius: 14,
                    alignItems: 'center', gap: 8,
                    backgroundColor: pressed ? '#E0F2FE' : colors.surface,
                    borderWidth: 1.5, borderColor: colors.border,
                    borderStyle: 'dashed',
                  })}
                >
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                    Choose from Library
                  </Text>
                </Pressable>

                {memoryType === 'photo' && (
                  <Pressable
                    className='flex-col items-center justify-center'
                    onPress={takePhoto}
                    style={({ pressed }) => ({
                      flex: 1, paddingVertical: 16, borderRadius: 14,
                      alignItems: 'center', gap: 8,
                      backgroundColor: pressed ? '#E0F2FE' : colors.surface,
                      borderWidth: 1.5, borderColor: colors.border,
                      borderStyle: 'dashed',
                    })}
                  >
                    <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                      Take Photo
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* Caption */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
          Caption
        </Text>
        <TextInput
          placeholder="What's the story behind this memory?"
          placeholderTextColor={colors.muted}
          value={caption}
          onChangeText={setCaption}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{
            padding: 14, borderRadius: 12,
            borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.foreground,
            fontSize: 14, lineHeight: 20,
            minHeight: 110,
            marginBottom: 28,
          }}
        />

        {members.length > 0 && (
            <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
                Tag Members
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {members.map((m) => {
                    const active = selectedTags.includes(m.id);
                    return (
                    <Pressable
                        key={m.id}
                        onPress={() => toggleTag(m.id)}
                        style={{
                        paddingHorizontal: 14, paddingVertical: 7,
                        borderRadius: 20, borderWidth: 1,
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        }}
                    >
                        <Text style={{
                        fontSize: 13, fontWeight: '600',
                        color: active ? '#fff' : colors.foreground,
                        }}>
                        {m.name}
                        </Text>
                    </Pressable>
                    );
                })}
                </View>
            </View>
        )}

        {/* Upload progress note */}
        {uploading && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 16,
          }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '500' }}>
              Uploading media...
            </Text>
          </View>
        )}

      </ScrollView>
        {/* Action buttons */}
        <View className='px-5 mb-4'
        style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            disabled={isBusy}
            style={{
              flex: 1, paddingVertical: 16, borderRadius: 12,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderWidth: 1, borderColor: colors.border,
              opacity: isBusy ? 0.5 : 1,
            }}
          >
            <Text style={{ fontWeight: '600', color: colors.foreground }}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={isBusy}
            style={{
              flex: 1, paddingVertical: 16, borderRadius: 12,
              alignItems: 'center',
              backgroundColor: colors.primary,
              opacity: isBusy ? 0.7 : 1,
            }}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontWeight: '700', color: '#fff', fontSize: 15 }}>Save Memory</Text>
            )}
          </Pressable>
        </View>
    </ScreenContainer>
  );
}