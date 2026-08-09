import { useEffect } from 'react';
import { ScrollView, Text, View, Switch, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, value, onValueChange, disabled }: ToggleRowProps) {
  const colors = useColors();
  return (
    <View
      className="flex-row items-center justify-between py-4 border-b"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-1 mr-4">
        <Text className="text-sm font-semibold" style={{ color: disabled ? colors.muted : colors.foreground }}>
          {label}
        </Text>
        {description && (
          <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#E5E7EB', true: '#0a7ea4' }}
        thumbColor={value ? '#fff' : '#9CA3AF'}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  return (
    <View className="pt-6 pb-2">
      <Text className="text-base font-bold" style={{ color: colors.foreground }}>
        {title}
      </Text>
      {subtitle && (
        <Text className="text-xs mt-1" style={{ color: colors.muted }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { family } = useFamilyStore();
  const { preferences, prefsLoading, fetchPreferences, updatePreferences } = useNotificationStore();

  useEffect(() => {
    if (user?.id && family?.id) {
      fetchPreferences(user.id, family.id);
    }
  }, [user?.id, family?.id]);

  const update = (key: string, value: boolean) => {
    updatePreferences({ [key]: value } as any);
  };

  if (prefsLoading || !preferences) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm mt-3" style={{ color: colors.muted }}>
            Loading preferences...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      {/* Header */}
      <View
        className="flex-row items-center px-6 py-4 border-b"
        style={{ borderColor: colors.border }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: colors.primary, fontSize: 16, marginRight: 12 }}>‹ Back</Text>
        </Pressable>
        <Text className="text-xl font-bold" style={{ color: colors.foreground }}>
          Notification Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Push Notifications ── */}
        <SectionHeader
          title="Push Notifications"
          subtitle="Alerts that appear on your device"
        />

        <View
          className="bg-surface rounded-xl px-4 border"
          style={{ borderColor: colors.border }}
        >
          <ToggleRow
            label="Enable Push Notifications"
            description="Master switch for all push alerts"
            value={preferences.push_enabled}
            onValueChange={(v) => update('push_enabled', v)}
          />
          <ToggleRow
            label="Tasks & Chores"
            description="Assigned tasks, due soon, overdue"
            value={preferences.push_tasks}
            onValueChange={(v) => update('push_tasks', v)}
            disabled={!preferences.push_enabled}
          />
          <ToggleRow
            label="Calendar Events"
            description="Event reminders and meeting alerts"
            value={preferences.push_events}
            onValueChange={(v) => update('push_events', v)}
            disabled={!preferences.push_enabled}
          />
          <ToggleRow
            label="Family Updates"
            description="When family members make changes"
            value={preferences.push_family_updates}
            onValueChange={(v) => update('push_family_updates', v)}
            disabled={!preferences.push_enabled}
          />
          <ToggleRow
            label="AI Suggestions"
            description="Smart recommendations and insights"
            value={preferences.push_ai_suggestions}
            onValueChange={(v) => update('push_ai_suggestions', v)}
            disabled={!preferences.push_enabled}
          />
          <ToggleRow
            label="Security Alerts"
            description="Login activity and account changes"
            value={preferences.push_security}
            onValueChange={(v) => update('push_security', v)}
            disabled={!preferences.push_enabled}
          />
        </View>

        {/* ── Email Notifications ── */}
        <SectionHeader
          title="✉️ Email Notifications"
          subtitle="Delivered to your registered email"
        />

        <View
          className="bg-surface rounded-xl px-4 border"
          style={{ borderColor: colors.border }}
        >
          <ToggleRow
            label="Enable Email Notifications"
            description="Master switch for all emails"
            value={preferences.email_enabled}
            onValueChange={(v) => update('email_enabled', v)}
          />
          <ToggleRow
            label="Weekly Family Summary"
            description="Every Sunday — this week's highlights"
            value={preferences.email_weekly_summary}
            onValueChange={(v) => update('email_weekly_summary', v)}
            disabled={!preferences.email_enabled}
          />
          <ToggleRow
            label="Monthly Intelligence Report"
            description="First of the month — trends and AI insights"
            value={preferences.email_monthly_report}
            onValueChange={(v) => update('email_monthly_report', v)}
            disabled={!preferences.email_enabled}
          />
          <ToggleRow
            label="Security Emails"
            description="Password resets and login alerts"
            value={preferences.email_security}
            onValueChange={(v) => update('email_security', v)}
            disabled={!preferences.email_enabled}
          />
        </View>

        {/* Info note */}
        <View
          className="mt-6 p-4 rounded-xl border"
          style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
        >
          <Text className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
            💡 Security emails (password resets, login alerts) are always sent regardless of preferences to keep your account safe.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}