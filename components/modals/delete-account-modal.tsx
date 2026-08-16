
import { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ActivityIndicator, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/_core/supabase';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  isFoundingAdmin: boolean;
}

type Step = 'warning' | 'confirm-type' | 'submitting' | 'error';

const CONFIRM_WORD = 'DELETE';
const IOS_MANAGE_SUBSCRIPTIONS_URL = 'itms-apps://apps.apple.com/account/subscriptions';

export function DeleteAccountModal({ visible, onClose, isFoundingAdmin }: DeleteAccountModalProps) {
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useAuthStore();

  const [step, setStep] = useState<Step>('warning');
  const [confirmText, setConfirmText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetAndClose = () => {
    setStep('warning');
    setConfirmText('');
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async () => {
    setStep('submitting');
    setErrorMessage(null);

    try {
      const { error } = await supabase.functions.invoke('request-account-deletion');
      if (error) throw error;

      await signOut();
      router.replace('/(auth)/sign-in'); // adjust to your actual auth route
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      setErrorMessage('Something went wrong. Please try again, or contact support if this persists.');
      setStep('error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full rounded-3xl bg-background p-6">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <Ionicons name="warning-outline" size={22} color="#EF4444" />
          </View>

          {(step === 'warning' || step === 'error') && (
            <>
              <Text className="text-lg font-bold text-foreground">Delete your account?</Text>

              <Text className="mt-3 text-sm leading-6 text-muted">
                {isFoundingAdmin
                  ? "You're the founding admin for this family. If another member is eligible to " +
                    'take over, they\'ll automatically become the new admin and only your personal ' +
                    "account will be deleted. If no one else can take over, deleting your account will " +
                    'permanently delete your entire family — all members, chores, calendar events, chat, ' +
                    'and memories — in 7 days.'
                  : 'Your profile and personal data will be permanently deleted in 7 days. You can sign ' +
                    "up again with this email right away, but your history with this family won't be " +
                    'recoverable.'}
              </Text>

              {isFoundingAdmin && (
                <View className="mt-4 rounded-xl bg-primary/5 p-3">
                  {Platform.OS === 'ios' ? (
                    <>
                      <Text className="text-xs leading-5 text-muted">
                        If this deletes your entire family, it won't cancel your App Store subscription
                        automatically — Apple doesn't allow that. Cancel it yourself to avoid future
                        charges.
                      </Text>
                      <Pressable
                        onPress={() => Linking.openURL(IOS_MANAGE_SUBSCRIPTIONS_URL)}
                        className="mt-2 self-start"
                      >
                        <Text className="text-xs font-semibold text-primary">Manage Subscription →</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text className="text-xs leading-5 text-muted">
                      If this deletes your entire family, your Play Store subscription will be cancelled
                      automatically as part of the deletion.
                    </Text>
                  )}
                </View>
              )}

              {step === 'error' && errorMessage && (
                <View className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3">
                  <Text className="text-xs text-red-800">{errorMessage}</Text>
                </View>
              )}

              <View className="mt-6 gap-2">
                <Pressable
                  onPress={() => setStep('confirm-type')}
                  className="items-center rounded-xl bg-red-500 py-3"
                >
                  <Text className="text-sm font-bold text-white">Continue</Text>
                </Pressable>
                <Pressable onPress={resetAndClose} className="items-center rounded-xl py-3">
                  <Text className="text-sm font-semibold text-muted">Cancel</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'confirm-type' && (
            <>
              <Text className="text-lg font-bold text-foreground">Type DELETE to confirm</Text>
              <Text className="mt-2 text-sm leading-6 text-muted">
                This can't be undone once the 7-day window passes. Type "{CONFIRM_WORD}" below to confirm.
              </Text>

              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                placeholder={CONFIRM_WORD}
                placeholderTextColor={colors.muted}
                className="mt-4 rounded-xl border border-border px-4 py-3 text-foreground"
                style={{ borderColor: colors.border, color: colors.foreground }}
              />

              <View className="mt-6 gap-2">
                <Pressable
                  onPress={handleDelete}
                  disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD}
                  className="items-center rounded-xl bg-red-500 py-3"
                  style={{ opacity: confirmText.trim().toUpperCase() === CONFIRM_WORD ? 1 : 0.4 }}
                >
                  <Text className="text-sm font-bold text-white">Delete My Account</Text>
                </Pressable>
                <Pressable onPress={resetAndClose} className="items-center rounded-xl py-3">
                  <Text className="text-sm font-semibold text-muted">Cancel</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'submitting' && (
            <View className="items-center py-6">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-3 text-sm text-muted">Deleting your account...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}