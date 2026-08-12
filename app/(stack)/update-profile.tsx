import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { supabase } from '@/lib/_core/supabase';
import { CountryPickerModal } from '@/components/modals/country-picker';
import { StorageLimitError } from '@/utils/storage-gate';
import { UpgradePrompt } from '@/components/upgrade-prompt';

export default function AccountSettingsScreen() {
  const colors = useColors();
  const { user, updateProfile, loading, error, setError } = useAuthStore();
  const { family, currentMember, fetchFamilyForUser, uploadAvatar, getAvatarSignedUrl } = useFamilyStore();

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'storage_limit'>('ai_feature');

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, country, ethnicity')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name ?? '');
        setCountry(data.country ?? null);
        setEthnicity(data.ethnicity ?? '');
      }
      setInitialLoading(false);
    };
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    const resolveAvatar = async () => {
      if (currentMember?.avatar_url) {
        const url = await getAvatarSignedUrl(currentMember.avatar_url);
        setAvatarSignedUrl(url);
      }
    };
    resolveAvatar();
  }, [currentMember?.avatar_url]);

  const handlePickAvatar = async () => {
    if (!currentMember?.id || !family?.id || !user?.id) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      await uploadAvatar(family.id, currentMember.id, user.id, asset.uri, asset.mimeType ?? 'image/jpeg', fileName);

      if (user?.id) await fetchFamilyForUser(user.id);
    } catch (err) {
      if (err instanceof StorageLimitError) {
        setUpgradePromptVisible(true);
        setUpgradeReason('storage_limit');
        return;
      }
      console.error('Failed to upload avatar:', err);
      alert('Something went wrong uploading your photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setValidationError(null);
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setValidationError('Name is required');
      return;
    }
    if (!user?.id) return;

    try {
      await updateProfile(user.id, {
        fullName: fullName.trim(),
        country: country ?? undefined,
        ethnicity: ethnicity.trim() || undefined,
      });
      await fetchFamilyForUser(user.id);
      setSuccessMessage('Profile updated');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch {
      // error already in store
    }
  };

  const displayError = validationError || error;

  if (initialLoading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Account Settings" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {displayError && (
          <View className="mb-4 rounded-xl p-4">
            <Text className="text-sm font-medium text-error">{displayError}</Text>
          </View>
        )}
        {successMessage && (
          <View className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <Text className="text-sm font-medium text-emerald-700">{successMessage}</Text>
          </View>
        )}

        {/* Avatar */}
        <View className="mb-6 items-center">
          <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} className="relative">
            {avatarSignedUrl ? (
              <Image source={{ uri: avatarSignedUrl }} className="h-24 w-24 rounded-full" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <Text className="text-3xl font-bold text-primary">
                  {fullName?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary">
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text className="mt-2 text-xs text-muted">Tap to change photo</Text>
        </View>

        {/* Profile section */}
        <Text className="mb-3 text-sm font-bold text-foreground">Profile</Text>

        <Text className="mb-2 text-xs font-semibold text-muted">Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
        />

        <Text className="mb-2 text-xs font-semibold text-muted">Country</Text>
        <Pressable
          onPress={() => setCountryModalVisible(true)}
          className="mb-4 rounded-xl border border-border bg-surface px-4 py-3"
        >
          <Text className={country ? 'text-base text-foreground' : 'text-base text-muted'}>
            {country || 'Select your country'}
          </Text>
        </Pressable>

        <Text className="mb-2 text-xs font-semibold text-muted">
          Ethnicity <Text className="font-normal text-muted">(optional)</Text>
        </Text>
        <TextInput
          value={ethnicity}
          onChangeText={setEthnicity}
          placeholder="e.g. Yoruba, Igbo, Fulani"
          placeholderTextColor={colors.muted}
          className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
        />

        
      </ScrollView>
        <View className='px-6 mb-10'>
            <Pressable
            onPress={handleSaveProfile}
            disabled={loading}
            className="items-center rounded-xl bg-primary py-3.5"
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Save Profile</Text>}
            </Pressable>
        </View>
      <CountryPickerModal
        visible={countryModalVisible}
        selected={country}
        onSelect={setCountry}
        onClose={() => setCountryModalVisible(false)}
      />

      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        reason={upgradeReason}
      />
    </ScreenContainer>
  );
}