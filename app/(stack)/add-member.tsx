import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { MemberLimitError, useFamilyStore } from '@/lib/stores/family-store';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { AgeBand, memberLimit, PRESET_AGE_BANDS, PRESET_ROLES } from '@/utils';
import { ChipSelector, ROLE_COLORS,CustomInputModal } from '../(onboarding)/add-members';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function AddMemberScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter();
  const colors = useColors();
  const { family, members, addMember, loading,error } = useFamilyStore();
  const { tier } = useSubscriptionStore();

  const [name, setName] = useState('');
  const [role, setRole] = useState<(typeof PRESET_ROLES)[number]>('member');
  const [ageBand, setAgeBand] = useState<AgeBand | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);
 const [showAgeBandModal, setShowAgeBandModal] = useState(false);
 const [customAgeBands, setCustomAgeBands] = useState<string[]>([]);
 const [customRoles, setCustomRoles] = useState<string[]>([]);
 const showAgeBand = ['child', 'member', ...customRoles].includes(role) ||
    !PRESET_ROLES.includes(role);

  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);

  const atLimit = tier === 'free' && (members?.length ?? 0) >= memberLimit;

  const handleSubmit = async () => {
    setValidationError(null);
    if (!name.trim()) {
      setValidationError('Please enter a name');
      return;
    }
    if (!family?.id) return;

    if (atLimit) {
      setUpgradePromptVisible(true);
      return;
    }

    try {
      await addMember(family.id, { name: name.trim(), role, age_band: ageBand });
      router.back();
    } catch(err) {
      if (err instanceof MemberLimitError) {
        setUpgradePromptVisible(true);
        return;
      }
      // error already set in store
    }
  };

  const displayError = validationError || error;
  const allAgeBands = [...PRESET_AGE_BANDS, ...customAgeBands];


  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Add Member"
        showBack />
         <CustomInputModal
        visible={showAgeBandModal}
        title="Custom Age Band"
        placeholder="e.g. Young Adult, Senior..."
        onConfirm={(val) => {
          if (!allAgeBands.includes(val)) setCustomAgeBands((p) => [...p, val]);
          setAgeBand(val);
        }}
        onClose={() => setShowAgeBandModal(false)}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1 px-6 pt-6">
        {tier === 'free' && (
          <View className="mb-4 rounded-xl border border-border bg-surface p-3">
            <Text className="text-xs text-muted">
              {members?.length ?? 0} of {memberLimit} members used on the free plan
            </Text>
          </View>
        )}
        {displayError && (
          <View className="mb-4 p-4 bg-error/10 rounded-lg border border-error/20">
            <Text className="text-sm text-error font-medium">{displayError}</Text>
          </View>
        )}

        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Name</Text>
          <TextInput
            placeholder="e.g. Sarah"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            editable={!loading}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            style={{ color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Role</Text>
          <View style={{ marginBottom: 3 }}>
            <ChipSelector
                options={PRESET_ROLES}
                selected={role}
                onSelect={setRole}
                colorMap={ROLE_COLORS}
            />
            </View>
        </View>

        <View className="mb-8">
          {showAgeBand && (
            <>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#687076', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Age Band
                </Text>
                <View style={{ marginBottom: 18 }}>
                <ChipSelector
                    options={allAgeBands}
                    selected={ageBand || ''}
                    onSelect={(v) => setAgeBand(ageBand === v ? undefined : v)}
                    onAddCustom={() => setShowAgeBandModal(true)}
                />
                </View>
            </>
            )}
            {ageBand && ['adult', 'teen', ...customAgeBands].includes(ageBand) ? (
                <Text className="text-xs text-muted mt-2">
                A signup code will be generated so they can join with their own login.
                </Text>
            ) : (
                <Text className="text-xs text-muted mt-2">
                This will be a managed profile — no login, no signup code.
                </Text>
            )}
        </View>

      </ScrollView>
      <View className='px-4 py-4'
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="py-4 items-center bg-primary rounded-lg mb-8"
        >
            {loading ? (
            <ActivityIndicator color="#fff" />
            ) : (
            <Text className="text-white text-base font-semibold">Add Member</Text>
            )}
        </TouchableOpacity>
      </View>
      <UpgradePrompt
      visible={upgradePromptVisible}
      onClose={() => setUpgradePromptVisible(false)}
      reason="member_limit"
      />
    </ScreenContainer>
  );
}