import { useEffect, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useNotificationStore, AppNotification, NotificationPriority } from '@/lib/stores/notification-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';

// ── helpers ───────────────────────────────────────────────────

function priorityConfig(priority: NotificationPriority) {
  switch (priority) {
    case 'critical':
      return { label: 'Critical', bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' };
    case 'important':
      return { label: 'Important', bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' };
    default:
      return { label: 'Info', bg: '#EFF6FF', text: '#3B82F6', dot: '#93C5FD' };
  }
}

function typeIcon(type: AppNotification['type']): string {
  const map: Record<AppNotification['type'], string> = {
    task_assigned: '📋',
    task_due_soon: '⏰',
    task_overdue: '🚨',
    event_reminder: '📅',
    family_update: '👨‍👩‍👧‍👦',
    ai_suggestion: '✨',
    meeting_starting: '🗓',
    commitment_due: '✅',
    chore_overdue: '🧹',
    weekly_summary: '📊',
    security_alert: '🔒',
  };
  return map[type] || '🔔';
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(notifications: AppNotification[]) {
  const groups: Record<string, AppNotification[]> = {};

  notifications.forEach((n) => {
    const date = new Date(n.sent_at);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    let label: string;
    if (isToday) label = 'Today';
    else if (isYesterday) label = 'Yesterday';
    else label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });

  return Object.entries(groups);
}

// ── notification card ─────────────────────────────────────────

interface NotificationCardProps {
  notification: AppNotification;
  onPress: (n: AppNotification) => void;
}

function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const colors = useColors();
  const config = priorityConfig(notification.priority);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <View
        className="flex-row items-start rounded-xl p-4 mb-2 border"
        style={{
          backgroundColor: notification.is_read ? colors.surface : '#FFFBEB',
          borderColor: notification.is_read ? colors.border : '#FDE68A',
        }}
      >
        {/* Unread dot */}
        {!notification.is_read && (
          <View
            className="w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0"
            style={{ backgroundColor: colors.primary }}
          />
        )}
        {notification.is_read && <View className="w-2 mr-3" />}

        {/* Icon */}
        <Text className="text-xl mr-3 flex-shrink-0">
          {typeIcon(notification.type)}
        </Text>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text
              className="text-sm font-semibold flex-1 mr-2"
              style={{ color: colors.foreground }}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text className="text-xs" style={{ color: colors.muted }}>
              {formatRelativeTime(notification.sent_at)}
            </Text>
          </View>

          <Text
            className="text-sm leading-relaxed mb-2"
            style={{ color: colors.muted }}
            numberOfLines={2}
          >
            {notification.body}
          </Text>

          <View className="flex-row items-center gap-2">
            {/* Priority badge */}
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: config.bg }}
            >
              <Text className="text-xs font-semibold" style={{ color: config.text }}>
                {config.label}
              </Text>
            </View>

            {/* Action button */}
            {notification.action_label && (
              <View
                className="px-2 py-0.5 rounded-full border"
                style={{ borderColor: colors.primary }}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                  {notification.action_label}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── main screen ───────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family } = useFamilyStore();
  const {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  useEffect(() => {
    if (family?.id) {
      fetchNotifications(family.id);
    }
  }, [family?.id]);

  const handleNotificationPress = useCallback(
    async (notification: AppNotification) => {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      if (notification.action_route) {
        router.push(notification.action_route as any);
      }
    },
    [markAsRead, router]
  );

  const handleMarkAllRead = async () => {
    if (family?.id) await markAllAsRead(family.id);
  };

  const grouped = groupByDate(notifications);
  const count = unreadCount();

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: colors.border }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: colors.primary, fontSize: 16 }}>‹ Back</Text>
          </Pressable>
          <Text className="text-xl font-bold" style={{ color: colors.foreground }}>
            Notifications
          </Text>
          {count > 0 && (
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-xs font-bold text-white">{count}</Text>
            </View>
          )}
        </View>

        {count > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      {loading && notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm mt-3" style={{ color: colors.muted }}>
            Loading notifications...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-base font-semibold text-center mb-2" style={{ color: colors.foreground }}>
            Something went wrong
          </Text>
          <Text className="text-sm text-center mb-6" style={{ color: colors.muted }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => family?.id && fetchNotifications(family.id)}
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-sm font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">🔔</Text>
          <Text className="text-xl font-bold text-center mb-2" style={{ color: colors.foreground }}>
            You're all caught up
          </Text>
          <Text className="text-sm text-center" style={{ color: colors.muted }}>
            Notifications about tasks, events, meetings, and AI suggestions will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => family?.id && fetchNotifications(family.id)}
              tintColor={colors.primary}
            />
          }
        >
          {grouped.map(([dateLabel, items]) => (
            <View key={dateLabel} className="mb-6">
              <Text
                className="text-xs font-semibold uppercase mb-3 tracking-wide"
                style={{ color: colors.muted }}
              >
                {dateLabel}
              </Text>
              {items.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onPress={handleNotificationPress}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}