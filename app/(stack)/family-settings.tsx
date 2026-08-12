import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { isAdminAccess } from '@/utils';
import { StorageLimitError } from '@/utils/storage-gate';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function FamilySettingsScreen() {
    const colors = useColors();
    const {user} = useAuthStore()
    const { family, uploadFamilyPhoto, getFamilyPhotoSignedUrl, updateFamilyName, loading, error, currentMember} = useFamilyStore();

    const [name, setName] = useState(family?.name ?? '');
    const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'storage_limit'>('ai_feature');

    const isAdmin = isAdminAccess(currentMember?.role)

    useEffect(() => {
        const resolvePhoto = async () => {
            if (family?.photo_url) {
                const url = await getFamilyPhotoSignedUrl(family.photo_url);
                setPhotoSignedUrl(url);
            }
        };
        resolvePhoto();
    }, [family?.photo_url]);

    const handlePickPhoto = async () => {
        if (!family?.id || !user?.id) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [16, 9],
        });
        if (result.canceled || !result.assets?.[0]) return;

        setUploadingPhoto(true);
        try {
            const asset = result.assets[0];
            const fileExt = asset.uri.split('.').pop();
            const fileName = `cover.${fileExt}`;
            await uploadFamilyPhoto(family.id, user?.id, asset.uri, asset.mimeType ?? 'image/jpeg', fileName);
        } catch (err) {
          if (err instanceof StorageLimitError) {
            setUpgradePromptVisible(true);
            setUpgradeReason('storage_limit');
            return;
          }
            console.error('Failed to upload family photo:', err);
            alert('Something went wrong uploading the photo.');
        } finally {
        setUploadingPhoto(false);
        }
    };

    const handleSaveName = async () => {
        setValidationError(null);
        if (!name.trim()) {
            setValidationError('Family name is required');
            return;
        }
        if (!family?.id) return;

        try {
            await updateFamilyName(family.id, name.trim());
            setSuccessMessage('Family name updated');
            setTimeout(() => setSuccessMessage(null), 2500);
        } catch {
        // error already in store
        }
    };

    const displayError = validationError || error;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Settings" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {displayError && (
          <View className="mb-4 rounded-xl border border-error/20 bg-error/10 p-4">
            <Text className="text-sm font-medium text-error">{displayError}</Text>
          </View>
        )}
        {successMessage && (
          <View className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <Text className="text-sm font-medium text-emerald-700">{successMessage}</Text>
          </View>
        )}

        <Text className="mb-2 text-xs font-semibold text-muted">Family Photo</Text>
        <Pressable
          onPress={handlePickPhoto}
          disabled={uploadingPhoto}
          className="mb-6 h-40 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface"
        >
          {uploadingPhoto ? (
            <ActivityIndicator color={colors.primary} />
          ) : photoSignedUrl ? (
            <Image source={{ uri: photoSignedUrl }} className="h-40 w-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Ionicons name="camera-outline" size={28} color={colors.muted} />
              <Text className="mt-2 text-xs text-muted">Tap to add a family photo</Text>
            </View>
          )}
          {photoSignedUrl && <View className='absolute bottom-2 right-4'>
            <Ionicons name="camera-outline" size={28} color={"#fff"} />
          </View>}
        </Pressable>

        <Text className="mb-2 text-xs font-semibold text-muted">Family Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={isAdmin}
          placeholder="Family name"
          placeholderTextColor={colors.muted}
          className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
        />
        
      </ScrollView>
      <View className='px-6 mb-10'>
        <Pressable
          onPress={handleSaveName}
          disabled={loading}
          className="items-center rounded-xl bg-primary py-3.5"
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Save</Text>}
        </Pressable>
      </View>

      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        reason={upgradeReason}
      />
    </ScreenContainer>
  );
}