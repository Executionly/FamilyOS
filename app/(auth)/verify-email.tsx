import { useState, useEffect } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useColors } from '@/hooks/use-colors';
import { supabase } from '@/lib/_core/supabase';
import { notifyAdmins } from '@/lib/services/notify';


type VerifyMode = "signup" | "reset-password" | "join-family";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { email: paramEmail, source = "signup" } = useLocalSearchParams<{ email: string,source?: VerifyMode  }>();
  const { initialize, verifyOTP, loading, error, setError } = useAuthStore();

  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerifyCode = async () => {
  setValidationError(null);
  setError(null);

  if (!code.trim()) {
    setValidationError('Verification code is required');
    return;
  }

  if (code.length !== 6) {
    setValidationError('Code must be 6 digits');
    return;
  }

  try {
    const type = source === "reset-password" ? "recovery" : "email"
    await verifyOTP(
      paramEmail, 
      code,
      type
    );

    if (source === "signup" || source === "join-family") {
      initialize();

      if (source === "join-family") {
        // Fetch the member row that was just claimed to get name/role/family_id
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: member } = await supabase
            .from('member')
            .select('name, role, family_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (member) {
            try {
              await notifyAdmins({
                familyId: member.family_id,
                type: 'member_joined',
                priority: 'important',
                title: 'New family member joined',
                body: `${member.name} has joined as a ${member.role}.`,
                actionRoute: '/(profile)/members',
                excludeUserId: user.id,
              });
            } catch (error) {
              console.error('Failed to notify admins:', error);
            }

            try {
              await supabase.functions.invoke('member-joined-email', {
                body: {
                  family_id: member.family_id,
                  new_member_name: member.name,
                  new_member_role: member.role,
                },
              });
            } catch (error) {
              console.error('Failed to send join email:', error);
            }
          }
        }
        
        router.replace("/(tabs)");

      }else{
        router.replace("/(onboarding)/welcome");
      }
    }

    if (source === "reset-password") {
      router.replace('/reset-password');
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Invalid or already used signup code')) {
      setValidationError(
        'This code was just claimed by someone else. Please check with your family admin for a new code.'
      );
    }
    // Other errors are already set in store via setError
  }
};

  const handleResendCode = async () => {
    setResendLoading(true);
    setError(null);
    try {
      setResendCountdown(60);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend code';
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  const config = {
    "signup": {
      title: "Verify Email",
      subtitle: `We sent a 6-digit code to\n${paramEmail}`,
      button: "Verify Email",
    },
    "reset-password": {
      title: "Verify Recovery Code",
      subtitle: `Enter the recovery code sent to\n${paramEmail}`,
      button: "Continue",
    },
    "join-family": {
      title: "Verify Email",
      subtitle: `We sent a 6-digit code to\n${paramEmail}`,
      button: "Join Family",
    },
  }[source];

  const displayError = validationError || error;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Header */}
          <View className="mb-8 items-center">
            <Text className="text-4xl mb-4">✉️</Text>
            <Text className="text-3xl font-bold text-foreground mb-2">{config.title}</Text>
            <Text className="text-base text-muted text-center">
              {config.subtitle}
            </Text>
          </View>

          {/* Error Message */}
          {displayError && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{displayError}</Text>
            </View>
          )}

          {/* Code Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Verification Code</Text>
            <TextInput
              placeholder="000000"
              placeholderTextColor={colors.muted}
              value={code}
              onChangeText={(text) => {
                // Only allow numbers, max 6 digits
                const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(numericText);
              }}
              editable={!loading}
              keyboardType="number-pad"
              maxLength={6}
              style={{
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 16,
                fontSize: 32,
                textAlign: 'center',
                letterSpacing: 8,
                fontWeight: '600',
              }}
            />
            <Text className="text-xs text-muted mt-2 text-center">
              Enter the 6-digit code sent to your email
            </Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
          onPress={handleVerifyCode}
            disabled={loading || code.length !== 6}
          className='py-4 items-center bg-primary rounded-lg mb-8'>
              {loading ? (
                <ActivityIndicator color={"#fff"} />
              ) : (
                <Text className='text-foreground text-base font-semibold'>
                  Verify Code
                </Text>
              )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 12 }}>
              Didn't receive the code?
            </Text>
            <Pressable
              onPress={handleResendCode}
              disabled={resendLoading || resendCountdown > 0}
              style={({ pressed }) => [
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  color: resendCountdown > 0 ? colors.muted : colors.primary,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
