import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image, Alert, KeyboardAvoidingView } from 'react-native';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {id, memberId, isAdmin} = useLocalSearchParams()
  const { user, updateProfile, loading, error, setError } = useAuthStore();
  const { family, currentMember, updateMember, fetchFamilyForUser, uploadAvatar, getAvatarSignedUrl } = useFamilyStore();

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [memberAvatar, setMemberAvatar] = useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'storage_limit'>('ai_feature');
  const userId = isAdmin === "true" ? id?.toString() : user?.id
  const memberProfileId = isAdmin === "true" ? memberId?.toString() : currentMember?.id

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId || !memberProfileId) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, country, ethnicity')
          .eq('id', userId)
          .single();
  
        if (data) {
          setFullName(data.full_name ?? '');
          setCountry(data.country ?? null);
          setEthnicity(data.ethnicity ?? '');
        }
  
        // Personal fields live on member, not profiles
        const { data: memberData } = await supabase
          .from('member')
          .select('date_of_birth, bio, phone_number, avatar_url')
          .eq('id', memberProfileId)
          .single();

        if (memberData) {
          setMemberAvatar(memberData?.avatar_url)
          setDateOfBirth(memberData.date_of_birth ? new Date(memberData.date_of_birth) : null);
          setBio(memberData.bio ?? '');
          setPhoneNumber(memberData.phone_number ?? '');
        }
        
      } catch (error) {
        console.log("ERROR", error)
        Alert.alert("There was an error processing your request, try again later.")
      }finally{
        setInitialLoading(false);
      }
    };
    loadProfile();
  }, [userId, memberProfileId]);

  useEffect(() => {
    const resolveAvatar = async () => {
      if (memberAvatar) {
        const url = await getAvatarSignedUrl(memberAvatar);
        setAvatarSignedUrl(url);
      }
    };
    resolveAvatar();
  }, [userId, memberId, memberAvatar]);

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

  const handleDobChange = (event: any, date?: Date) => {
    if (date) setDateOfBirth(date);
    if (Platform.OS !== 'ios') setShowDobPicker(false);
  };

  const handleSaveProfile = async () => {
    setValidationError(null);
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setValidationError('Name is required');
      return;
    }
    if (!userId || !user?.id || !memberProfileId) return;

    try {
      await updateProfile(userId, {
        fullName: fullName.trim(),
        country: country ?? undefined,
        ethnicity: ethnicity.trim() || undefined,
      });
      await updateMember(memberProfileId, {
        date_of_birth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : null,
        bio: bio.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
      });
      await fetchFamilyForUser(user?.id);
      setSuccessMessage('Profile updated');
      setShowDobPicker(false)
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : "height"}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 10 }}>
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

          <Text className="mb-2 text-xs font-semibold text-muted">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="A little about yourself"
            placeholderTextColor={colors.muted}
            multiline
            className="mb-6 min-h-[70px] rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
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
      
          <Text className="mb-2 text-xs font-semibold text-muted">Date of Birth</Text>
          <Pressable
            onPress={() => setShowDobPicker(true)}
            className="mb-4 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <Text className={dateOfBirth ? 'text-base text-foreground' : 'text-base text-muted'}>
              {dateOfBirth ? dateOfBirth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select your date of birth'}
            </Text>
          </Pressable>
          {showDobPicker && (
            <DateTimePicker
              value={dateOfBirth ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={handleDobChange}
            />
          )}
          <Text className="mb-4 text-[11px] text-muted">
            Setting your birthday automatically adds it to your family's Special Days.
          </Text>

          <Text className="mb-2 text-xs font-semibold text-muted">Phone Number</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Optional"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            returnKeyType='done'
            className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
          />

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
      </KeyboardAvoidingView>
        <View className='px-6'
        style={{ paddingBottom: Math.max(insets.bottom, 13) }}>
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