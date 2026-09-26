import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { supabase } from '@/lib/_core/supabase';
import { CountryPickerModal } from '@/components/modals/country-picker';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { StorageLimitError } from '@/utils/storage-gate';

function formatDate(date: Date | null) {
  if (!date) return 'Select your date of birth';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

function SectionHeader({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  colors: any;
}) {
  return (
    <View className="mb-4 flex-row items-start">
      <View
        style={{
          backgroundColor: `${colors.primary}14`,
          borderColor: `${colors.primary}28`,
        }}
        className="mr-3 h-10 w-10 items-center justify-center rounded-xl border"
      >
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>

      <View className="flex-1">
        <Text className="text-base font-black text-foreground">
          {title}
        </Text>

        {description && (
          <Text className="mt-1 text-xs leading-4 text-muted">
            {description}
          </Text>
        )}
      </View>
    </View>
  );
}

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Text className="mb-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
      {children}
    </Text>
  );
}

function InputField({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  multiline = false,
  keyboardType,
  colors,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  colors: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      multiline={multiline}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        minHeight: multiline ? 92 : undefined,
      }}
      className={`rounded-2xl border px-4 text-sm text-foreground ${
        multiline ? 'py-3.5' : 'py-3.5'
      }`}
    />
  );
}

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { id, memberId, isAdmin } = useLocalSearchParams();

  const { user, updateProfile, loading, error, setError } =
    useAuthStore();

  const {
    family,
    currentMember,
    updateMember,
    fetchFamilyForUser,
    uploadAvatar,
    getAvatarSignedUrl,
  } = useFamilyStore();

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [memberAvatar, setMemberAvatar] = useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(
    null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null,
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<
    'ai_feature' | 'storage_limit'
  >('ai_feature');

  const userId =
    isAdmin === 'true' ? id?.toString() : user?.id;

  const memberProfileId =
    isAdmin === 'true'
      ? memberId?.toString()
      : currentMember?.id;

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId || !memberProfileId) {
        setInitialLoading(false);
        return;
      }

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, country, ethnicity')
          .eq('id', userId)
          .single();

        if (profileData) {
          setCountry(profileData.country ?? null);
          setEthnicity(profileData.ethnicity ?? '');
        }

        const { data: memberData } = await supabase
          .from('member')
          .select(
            'name, date_of_birth, bio, phone_number, avatar_url',
          )
          .eq('id', memberProfileId)
          .single();

        if (memberData) {
          setFullName(memberData.name ?? '');
          setMemberAvatar(memberData.avatar_url ?? null);
          setDateOfBirth(
            memberData.date_of_birth
              ? new Date(memberData.date_of_birth)
              : null,
          );
          setBio(memberData.bio ?? '');
          setPhoneNumber(memberData.phone_number ?? '');
        }
      } catch {
        Alert.alert(
          'Unable to load profile',
          'There was an error processing your request. Please try again later.',
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, [userId, memberProfileId]);

  useEffect(() => {
    const resolveAvatar = async () => {
      if (!memberAvatar) {
        setAvatarSignedUrl(null);
        return;
      }

      const url = await getAvatarSignedUrl(memberAvatar);
      setAvatarSignedUrl(url);
    };

    resolveAvatar();
  }, [memberAvatar, getAvatarSignedUrl]);

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
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `avatar.${fileExt}`;

      await uploadAvatar(
        family.id,
        currentMember.id,
        user.id,
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
        fileName,
      );

      await fetchFamilyForUser(user.id);
    } catch (err) {
      if (err instanceof StorageLimitError) {
        setUpgradePromptVisible(true);
        setUpgradeReason('storage_limit');
        return;
      }

      console.error('Failed to upload avatar:', err);

      Alert.alert(
        'Upload failed',
        'Something went wrong uploading your photo.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDobChange = (event: any, date?: Date) => {
    if (date) {
      setDateOfBirth(date);
    }

    if (Platform.OS !== 'ios') {
      setShowDobPicker(false);
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

    if (!userId || !user?.id || !memberProfileId) return;

    try {
      await updateProfile(userId, {
        fullName: fullName.trim(),
        country: country ?? undefined,
        ethnicity: ethnicity.trim() || undefined,
      });

      await updateMember(memberProfileId, {
        date_of_birth: dateOfBirth
          ? dateOfBirth.toISOString().split('T')[0]
          : null,
        bio: bio.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
      });

      await fetchFamilyForUser(user.id);

      setSuccessMessage('Profile updated successfully');
      setShowDobPicker(false);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch {
      // Store error is already handled by useAuthStore.
    }
  };

  const displayError = validationError || error;

  if (initialLoading) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <View className="flex-1 items-center justify-center">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="items-center rounded-3xl border px-8 py-7"
          >
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-4 h-12 w-12 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <ActivityIndicator color={colors.primary} />

            <Text className="mt-4 text-sm font-black text-foreground">
              Loading your profile
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Just a moment
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Account Settings" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 4,
            flex: 1
          }}
        >
          {/* Page introduction */}
          <View className="mb-5 flex-row items-end justify-between">
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
                Personal information
              </Text>

              <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
                Your profile
              </Text>

              <Text className="mt-1 text-xs font-medium leading-5 text-muted">
                Keep your family profile accurate and up to date.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: `${colors.primary}14`,
                borderColor: `${colors.primary}28`,
              }}
              className="ml-4 h-12 w-12 items-center justify-center rounded-2xl border"
            >
              <Ionicons
                name="person-outline"
                size={23}
                color={colors.primary}
              />
            </View>
          </View>

          {displayError && (
            <View
              style={{
                backgroundColor: '#EF44440D',
                borderColor: '#EF444440',
              }}
              className="mb-4 flex-row items-start rounded-2xl border px-4 py-3.5"
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#EF4444"
              />

              <Text className="ml-3 flex-1 text-sm leading-5 text-red-500">
                {displayError}
              </Text>
            </View>
          )}

          {successMessage && (
            <View
              style={{
                backgroundColor: '#10B9810D',
                borderColor: '#10B98135',
              }}
              className="mb-4 flex-row items-center rounded-2xl border px-4 py-3.5"
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#10B981"
              />

              <Text className="ml-3 flex-1 text-sm font-semibold text-emerald-600">
                {successMessage}
              </Text>
            </View>
          )}

          {/* Profile photo */}
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
            className="mb-5 items-center rounded-[26px] border px-5 py-6"
          >
            <Pressable
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
              className="relative"
            >
              <View
                style={{
                  backgroundColor: colors.surface,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.14,
                  shadowRadius: 12,
                  elevation: 4,
                }}
                className="rounded-full p-1.5"
              >
                <View
                  style={{ backgroundColor: colors.primary }}
                  className="rounded-full p-1"
                >
                  {avatarSignedUrl ? (
                    <Image
                      source={{ uri: avatarSignedUrl }}
                      className="h-24 w-24 rounded-full"
                    />
                  ) : (
                    <View
                      style={{
                        backgroundColor: `${colors.primary}18`,
                      }}
                      className="h-24 w-24 items-center justify-center rounded-full"
                    >
                      <Text
                        style={{ color: colors.primary }}
                        className="text-3xl font-black"
                      >
                        {getInitials(fullName)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View
                style={{
                  backgroundColor: colors.primary,
                  borderColor: colors.surface,
                }}
                className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2"
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={15} color="#FFFFFF" />
                )}
              </View>
            </Pressable>

            <Text className="mt-3 text-sm font-black text-foreground">
              Profile photo
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Tap to choose a new photo
            </Text>
          </View>

          {/* Basic information */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
            className="mb-4 rounded-[26px] border px-5 py-5"
          >
            <SectionHeader
              icon="person-outline"
              title="Basic information"
              description="The details your family uses to recognise you."
              colors={colors}
            />

            <FieldLabel>Full name</FieldLabel>

            <View className="mb-4">
              <InputField
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
                colors={colors}
              />
            </View>

            <FieldLabel>Bio</FieldLabel>

            <View className="mb-1">
              <InputField
                value={bio}
                onChangeText={setBio}
                placeholder="A little about yourself"
                placeholderTextColor={colors.muted}
                multiline
                colors={colors}
              />
            </View>
          </View>

          {/* Personal details */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
            className="mb-4 rounded-[26px] border px-5 py-5"
          >
            <SectionHeader
              icon="globe-outline"
              title="Personal details"
              description="Optional details that help personalise your family experience."
              colors={colors}
            />

            <FieldLabel>Country</FieldLabel>

            <Pressable
              onPress={() => setCountryModalVisible(true)}
              style={({ pressed }) => ({
                backgroundColor: colors.background,
                opacity: pressed ? 0.75 : 1,
              })}
              className="mb-4 flex-row items-center justify-between rounded-2xl border border-gray-200 px-4 py-3.5"
            >
              <Text
                className={
                  country
                    ? 'text-sm text-foreground'
                    : 'text-sm text-muted'
                }
              >
                {country || 'Select your country'}
              </Text>

              <Ionicons
                name="chevron-down"
                size={17}
                color={colors.muted}
              />
            </Pressable>

            <FieldLabel>Date of birth</FieldLabel>

            <Pressable
              onPress={() => setShowDobPicker(true)}
              style={({ pressed }) => ({
                backgroundColor: colors.background,
                opacity: pressed ? 0.75 : 1,
              })}
              className="mb-3 flex-row items-center justify-between rounded-2xl border border-gray-200 px-4 py-4"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={colors.primary}
                />

                <Text
                  className={`ml-2 text-sm ${
                    dateOfBirth
                      ? 'text-foreground'
                      : 'text-muted'
                  }`}
                >
                  {formatDate(dateOfBirth)}
                </Text>
              </View>

              <Ionicons
                name="chevron-down"
                size={17}
                color={colors.muted}
              />
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

            <Text className="mb-4 text-[11px] leading-4 text-muted">
              Your birthday is automatically added to your family&apos;s
              Special Days.
            </Text>

            <FieldLabel>Phone number</FieldLabel>

            <View className="mb-4">
              <InputField
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Optional"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                colors={colors}
              />
            </View>

            <FieldLabel>
              Ethnicity{' '}
              <Text className="font-medium text-muted">
                (optional)
              </Text>
            </FieldLabel>

            <InputField
              value={ethnicity}
              onChangeText={setEthnicity}
              placeholder="e.g. Yoruba, Igbo, Fulani"
              placeholderTextColor={colors.muted}
              colors={colors}
            />
          </View>

          <View className="flex-row items-start px-1">
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color={colors.muted}
            />

            <Text className="ml-2 flex-1 text-[11px] leading-4 text-muted">
              Your information is used to personalise your family experience
              and is handled according to your account settings.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save action */}
      <View
        className="px-4 pt-2"
        style={{
          paddingBottom: Math.max(insets.bottom, 13),
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          onPress={handleSaveProfile}
          disabled={loading}
          style={({ pressed }) => ({
            backgroundColor: colors.primary,
            opacity: loading ? 0.6 : pressed ? 0.82 : 1,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 12,
            elevation: 4,
          })}
          className="flex-row items-center justify-center rounded-2xl py-4"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text className="ml-2 text-sm font-black text-white">
                Save Profile
              </Text>
            </>
          )}
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
