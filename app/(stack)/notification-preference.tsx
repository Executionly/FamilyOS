import { useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  Switch,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/screen-container';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  last = false,
}: ToggleRowProps) {
  const colors = useColors();

  return (
    <View
      style={{
        borderBottomColor: colors.border,
        borderBottomWidth: last ? 0 : 1,
        opacity: disabled ? 0.52 : 1,
      }}
      className="flex-row items-center py-4"
    >
      <View
        style={{
          backgroundColor: disabled
            ? `${colors.muted}10`
            : `${colors.primary}12`,
        }}
        className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
      >
        <Ionicons
          name={icon}
          size={18}
          color={disabled ? colors.muted : colors.primary}
        />
      </View>

      <View className="flex-1 pr-3">
        <Text
          className="text-sm font-black"
          style={{
            color: disabled ? colors.muted : colors.foreground,
          }}
        >
          {label}
        </Text>

        {description && (
          <Text
            className="mt-1 text-[11px] leading-4"
            style={{ color: colors.muted }}
          >
            {description}
          </Text>
        )}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: colors.border,
          true: colors.primary,
        }}
        thumbColor={value ? '#FFFFFF' : '#94A3B8'}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: any;
}) {
  return (
    <View className="mb-3 mt-6 flex-row items-center">
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

        <Text className="mt-1 text-xs font-medium text-muted">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const colors = useColors();

  const { user } = useAuthStore();
  const { family } = useFamilyStore();

  const {
    preferences,
    prefsLoading,
    fetchPreferences,
    updatePreferences,
  } = useNotificationStore();

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
                name="notifications-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <ActivityIndicator color={colors.primary} />

            <Text className="mt-4 text-sm font-black text-foreground">
              Loading preferences
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
      {/* Header */}
      <View
        style={{ borderBottomColor: colors.border }}
        className="flex-row items-center border-b px-4 py-3"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => ({
            opacity: pressed ? 0.55 : 1,
          })}
          className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.foreground}
          />
        </Pressable>

        <View className="flex-1">
          <Text className="text-lg font-black text-foreground">
            Notification Settings
          </Text>

          <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            Stay informed, your way
          </Text>
        </View>

        <View
          style={{ backgroundColor: `${colors.primary}14` }}
          className="h-10 w-10 items-center justify-center rounded-xl"
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={colors.primary}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 34,
        }}
      >
        {/* Page introduction */}
        <View className="mb-1">
          <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
            Communication preferences
          </Text>

          <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
            Choose what reaches you
          </Text>

          <Text className="mt-1 text-xs font-medium leading-5 text-muted">
            Control family updates, reminders, insights, and account alerts.
          </Text>
        </View>

        {/* Push notifications */}
        <SectionHeader
          icon="phone-portrait-outline"
          title="Push Notifications"
          subtitle="Alerts that appear directly on your device"
          colors={colors}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
          className="overflow-hidden rounded-[24px] border px-4"
        >
          <ToggleRow
            icon="notifications-outline"
            label="Enable Push Notifications"
            description="Master switch for all push alerts"
            value={preferences.push_enabled}
            onValueChange={(value) => update('push_enabled', value)}
          />

          <ToggleRow
            icon="checkmark-circle-outline"
            label="Tasks & Chores"
            description="Assigned tasks, due soon, and overdue reminders"
            value={preferences.push_tasks}
            onValueChange={(value) => update('push_tasks', value)}
            disabled={!preferences.push_enabled}
          />

          <ToggleRow
            icon="calendar-outline"
            label="Calendar Events"
            description="Event reminders and upcoming plans"
            value={preferences.push_events}
            onValueChange={(value) => update('push_events', value)}
            disabled={!preferences.push_enabled}
          />

          <ToggleRow
            icon="people-outline"
            label="Family Updates"
            description="When family members make changes"
            value={preferences.push_family_updates}
            onValueChange={(value) =>
              update('push_family_updates', value)
            }
            disabled={!preferences.push_enabled}
          />

          <ToggleRow
            icon="sparkles-outline"
            label="AI Suggestions"
            description="Smart recommendations and family insights"
            value={preferences.push_ai_suggestions}
            onValueChange={(value) =>
              update('push_ai_suggestions', value)
            }
            disabled={!preferences.push_enabled}
          />

          <ToggleRow
            icon="shield-checkmark-outline"
            label="Security Alerts"
            description="Login activity and account changes"
            value={preferences.push_security}
            onValueChange={(value) => update('push_security', value)}
            disabled={!preferences.push_enabled}
            last
          />
        </View>

        {/* Email notifications */}
        <SectionHeader
          icon="mail-outline"
          title="Email Notifications"
          subtitle="Updates delivered to your registered email"
          colors={colors}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
          className="overflow-hidden rounded-[24px] border px-4"
        >
          <ToggleRow
            icon="mail-unread-outline"
            label="Enable Email Notifications"
            description="Master switch for all email updates"
            value={preferences.email_enabled}
            onValueChange={(value) => update('email_enabled', value)}
          />

          <ToggleRow
            icon="calendar-outline"
            label="Weekly Family Summary"
            description="A Sunday overview of your family’s highlights"
            value={preferences.email_weekly_summary}
            onValueChange={(value) =>
              update('email_weekly_summary', value)
            }
            disabled={!preferences.email_enabled}
          />

          <ToggleRow
            icon="analytics-outline"
            label="Monthly Intelligence Report"
            description="Monthly trends and AI-powered family insights"
            value={preferences.email_monthly_report}
            onValueChange={(value) =>
              update('email_monthly_report', value)
            }
            disabled={!preferences.email_enabled}
          />

          <ToggleRow
            icon="shield-checkmark-outline"
            label="Security Emails"
            description="Password resets and login alerts"
            value={preferences.email_security}
            onValueChange={(value) =>
              update('email_security', value)
            }
            disabled={!preferences.email_enabled}
            last
          />
        </View>

        {/* Security note */}
        <View
          style={{
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
          }}
          className="mt-5 flex-row items-start rounded-2xl border px-4 py-4"
        >
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-amber-100">
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color="#B45309"
            />
          </View>

          <Text className="ml-3 flex-1 text-xs leading-5 text-amber-800">
            Security emails, including password resets and login alerts, may
            always be sent to help keep your account safe.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
