import React, { useEffect, useState } from 'react';
import {
  ScrollView, Text, View, Pressable,
  FlatList, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Rect, G, Text as SvgText } from 'react-native-svg';
import { ScreenContainer } from '@/components/screen-container';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useChoreStore } from '@/lib/stores/chore-store';
import { useColors } from '@/hooks/use-colors';
import { NotificationBell } from '@/components/Notification-Bell';
import { Ionicons } from '@expo/vector-icons';
import { FamilyChatFab } from '@/components/family-chat-fab';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { Dimensions } from 'react-native';

// ── Brand palette ────────────────────────────────────────────
const NAVY = '#044768';
const NAVY_SOFT = '#EAF1F5';
const CORAL = '#FE6A50';
const CORAL_SOFT = '#FFEBE6';
const INK = '#11181C';
const MUTED = '#7C8A94';
const BORDER = '#E7ECEF';
const CARD_BG = '#FFFFFF';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── SVG Progress Ring ─────────────────────────────────────────

function ProgressRing({
  size = 80,
  strokeWidth = 7,
  progress = 0,
  color,
  bg,
  label,
  sublabel,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0–1
  color: string;
  bg: string;
  label: string;
  sublabel: string;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = Math.min(progress, 1) * circumference;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={bg} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
        <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight="700" fill={color}>
          {label}
        </SvgText>
        <SvgText x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill={MUTED}>
          {sublabel}
        </SvgText>
      </Svg>
    </View>
  );
}

// ── Activity bar chart (7-day) ────────────────────────────────

function ActivityBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const barW = 18;
  const gap = 8;
  const chartH = 48;
  const totalW = data.length * (barW + gap) - gap;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Svg width={totalW} height={chartH + 16}>
      <G>
        {data.map((val, i) => {
          const barH = Math.max((val / max) * chartH, 4);
          const x = i * (barW + gap);
          const y = chartH - barH;
          return (
            <G key={i}>
              <Rect x={x} y={0} width={barW} height={chartH} rx={4} fill={NAVY_SOFT} />
              <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={val > 0 ? 1 : 0.35} />
              <SvgText x={x + barW / 2} y={chartH + 13} textAnchor="middle" fontSize={9} fill={MUTED}>
                {days[i]}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label, value, sub, accent, accentBg,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string; value: string | number; sub?: string;
  accent: string; accentBg: string;
}) {
  return (
    <View
      style={{
        flex: 1, backgroundColor: CARD_BG, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: BORDER, minWidth: 90,
      }}
    >
      <View style={{
        width: 34, height: 34, borderRadius: 10, backgroundColor: accentBg,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
      }}>
        <Icon size={18} color={accent} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: INK }}>{value}</Text>
      <Text style={{ fontSize: 11, color: INK, fontWeight: '600', marginTop: 1 }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: INK }}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 12, color: CORAL, fontWeight: '700' }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Subscription tier badge ─────────────────────────────────────

function TierBadge({ tier }: { tier?: string }) {
  const isPremium = tier === 'premium';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: isPremium ? CORAL : 'rgba(255,255,255,0.15)',
        gap: 5,
      }}
    >
      <Ionicons
        name={isPremium ? 'sparkles' : 'ellipse-outline'}
        size={11}
        color="#fff"
      />
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }}>
        {isPremium ? 'PREMIUM' : 'FREE PLAN'}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const colors = useColors();
  const { family, members } = useFamilyStore();
  const { meetings, fetchMeetings } = useMeetingStore();
  const { commitments, fetchCommitments } = useCommitmentStore();
  const { events, fetchEvents } = useCalendarStore();
  const { chores, fetchChores, updateChore } = useChoreStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const memberName = (id?: string | null) => members?.find((m) => m.id === id)?.name ?? null;

  const isPremium = family?.subscription_tier === 'premium';

  const handleFetch = () => {
    if (!family?.id) return;
    setLoading(true);
    try {
      Promise.all([
        fetchMeetings(family.id),
        fetchCommitments(family.id),
        fetchEvents(family.id),
        fetchChores(family.id),
        fetchNotifications(family?.id),
        unreadCount(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetch();
  }, [family?.id]);

  // ── derived data ─────────────────────────────────────────────

  const now = new Date();
  const today = now;

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const nextMeeting = meetings.find((m) => m.status === 'scheduled');
  const todayEvents = events.filter((e) => isSameDay(new Date(e.start_date), today));
  const todayChores = chores.filter(
    (c) => c.due_date && isSameDay(new Date(c.due_date), today) && c.status !== 'completed'
  );
  const openCommitments = commitments.filter((c) => c.status === 'open');
  const doneCommitments = commitments.filter((c) => c.status === 'completed');
  const totalCommitments = commitments.length;
  const followThrough = totalCommitments > 0 ? doneCommitments.length / totalCommitments : 0;
  const completedChores = chores.filter((c) => c.status === 'completed').length;
  const choreRate = chores.length > 0 ? completedChores / chores.length : 0;

  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return meetings.filter((m) => isSameDay(new Date(m.scheduled_date), d)).length;
  });

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleMarkChoreComplete = async (choreId: string) => {
    try { await updateChore(choreId, { status: 'completed' }); } catch {}
  };

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={{ color: MUTED, marginTop: 12, fontSize: 14 }}>Loading your family dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleFetch} tintColor={NAVY} />}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={{
          backgroundColor: NAVY,
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 32,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4, lineHeight: 32 }}>
                {greeting()},{'\n'}{family?.name} Family 👋
              </Text>
              <TierBadge tier={family?.subscription_tier} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <NotificationBell />
            </View>
          </View>

          {/* Next meeting pill */}
          <View style={{
            marginTop: 16,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                {nextMeeting
                  ? `Next meeting · ${new Date(nextMeeting.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                  : 'No meeting scheduled'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/meetings/setup')}
              style={{ backgroundColor: CORAL, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {nextMeeting ? 'View' : 'Schedule'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: -12 }}>

          {/* ── Progress rings card ─────────────────────────── */}
          <View style={{
            backgroundColor: CARD_BG,
            borderRadius: 18,
            padding: 20,
            borderWidth: 1,
            borderColor: BORDER,
            marginBottom: 16,
            shadowColor: NAVY,
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}>
            <SectionHeader title="Family Progress" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ProgressRing
                  progress={followThrough}
                  color={NAVY}
                  bg={NAVY_SOFT}
                  label={`${Math.round(followThrough * 100)}%`}
                  sublabel="done"
                />
                <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600' }}>Commitments</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ProgressRing
                  progress={choreRate}
                  color={CORAL}
                  bg={CORAL_SOFT}
                  label={`${Math.round(choreRate * 100)}%`}
                  sublabel="done"
                />
                <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600' }}>Chores</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ProgressRing
                  progress={meetings.filter((m) => m.status === 'completed').length > 0 ? 1 : 0}
                  color={NAVY}
                  bg={NAVY_SOFT}
                  label={`${meetings.filter((m) => m.status === 'completed').length}`}
                  sublabel="total"
                />
                <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600' }}>Meetings</Text>
              </View>
            </View>
          </View>
{/* ── Premium upsell (only shown on free plan) ──────── */}
          {!isPremium && (
            <Pressable
              onPress={() => router.push('/(stack)/paywall')}
              style={{
                backgroundColor: NAVY,
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View style={{
                width: 42, height: 42, borderRadius: 12, backgroundColor: CORAL,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="sparkles" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Go Premium</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                  Unlock AI meeting agendas, unlimited members, and more.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          )}
          {/* ── Stat cards row ──────────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatCard
              icon={(props) => <Ionicons name="checkmark-circle-outline" {...props} />}
              label="Open Tasks"
              value={openCommitments.length}
              sub={openCommitments.length === 0 ? 'All caught up!' : 'need attention'}
              accent={NAVY}
              accentBg={NAVY_SOFT}
            />
            <StatCard
              icon={(props) => <Ionicons name="calendar-clear-outline" {...props} />}
              label="Today's Events"
              value={todayEvents.length}
              sub={todayEvents.length === 0 ? 'Nothing today' : undefined}
              accent={CORAL}
              accentBg={CORAL_SOFT}
            />
            <StatCard
              icon={(props) => <Ionicons name="construct-outline" {...props} />}
              label="Chores Due"
              value={todayChores.length}
              sub={todayChores.length === 0 ? 'All clear' : 'today'}
              accent={NAVY}
              accentBg={NAVY_SOFT}
            />
          </View>

          {/* ── 7-day activity chart ─────────────────────────── */}
          <View style={{
            backgroundColor: CARD_BG,
            borderRadius: 18,
            padding: 20,
            borderWidth: 1,
            borderColor: BORDER,
            marginBottom: 16,
            shadowColor: NAVY,
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}>
            <SectionHeader title="7-Day Meeting Activity" />
            <View style={{ alignItems: 'center', paddingTop: 4 }}>
              <ActivityBars data={weekBars} color={CORAL} />
            </View>
            <Text style={{ fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 8 }}>
              Meetings held per day this week
            </Text>
          </View>

          {/* ── Open Commitments ────────────────────────────── */}
          {openCommitments.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Open Commitments"
                action="View all"
                onAction={() => router.push('/(tabs)/meetings')}
              />
              <FlatList
                horizontal
                scrollEnabled
                showsHorizontalScrollIndicator={false}
                data={openCommitments.slice(0, 5)}
                keyExtractor={(_, i) => i?.toString()}
                renderItem={({ item }) => (
                  <View style={{
                    marginRight: 10,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: CARD_BG,
                    minWidth: 160,
                    maxWidth: 200,
                  }}>
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: CORAL, marginBottom: 8,
                    }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: INK }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.due_date && (
                      <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                        Due {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    )}
                    {item.priority && (
                      <View style={{
                        marginTop: 8,
                        alignSelf: 'flex-start',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 20,
                        backgroundColor: item.priority === 'high' ? CORAL : item.priority === 'medium' ? CORAL_SOFT : NAVY_SOFT,
                      }}>
                        <Text style={{
                          fontSize: 10, fontWeight: '700',
                          color: item.priority === 'high' ? '#fff' : item.priority === 'medium' ? CORAL : NAVY,
                          textTransform: 'capitalize',
                        }}>
                          {item.priority}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              />
            </View>
          )}

          {/* ── Today's Events ──────────────────────────────── */}
          {todayEvents.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Today's Events"
                action="Calendar"
                onAction={() => router.push('/(stack)/calendar')}
              />
              {todayEvents.map((item, i) => (
                <View key={i} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: CARD_BG,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: BORDER,
                }}>
                  <View style={{
                    width: 4, height: 40, borderRadius: 2,
                    backgroundColor: NAVY,
                    marginRight: 12,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: INK }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {new Date(item.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {item.location ? ` · ${item.location}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="calendar" size={18} color={NAVY} />
                </View>
              ))}
            </View>
          )}

          {/* ── Chores Due Today ────────────────────────────── */}
          {todayChores.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Chores Due Today"
                action="View all"
                onAction={() => router.push('/(stack)/create-chore')}
              />
              {todayChores.map((item, i) => (
                <View key={i} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: CARD_BG,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: BORDER,
                }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 10, backgroundColor: CORAL_SOFT,
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    <Ionicons name="construct-outline" size={17} color={CORAL} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: INK }}>{item.title}</Text>
                    {item.assigned_to && (
                      <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                        Assigned to {memberName(item.assigned_to)}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleMarkChoreComplete(item.id)}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? NAVY : CORAL,
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                    })}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Done ✓</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* ── Empty state when everything is clear ────────── */}
          {openCommitments.length === 0 && todayEvents.length === 0 && todayChores.length === 0 && (
            <View style={{
              backgroundColor: NAVY_SOFT,
              borderRadius: 18,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: BORDER,
              marginBottom: 16,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22, backgroundColor: CORAL_SOFT,
                alignItems: 'center', justifyContent: 'center', marginBottom: 4,
              }}>
                <Ionicons name="sparkles-outline" size={22} color={CORAL} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: NAVY, textAlign: 'center', marginTop: 6 }}>
                All caught up!
              </Text>
              <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 4 }}>
                No open tasks, events, or chores today.
              </Text>
            </View>
          )}

        </View>
        {/* ── Action Hub ─────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: INK, marginBottom: 16 }}>Action Hub</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Add Event', icon: 'add-circle', route: '/(stack)/create-event', color: NAVY, bg: NAVY_SOFT },
              { label: 'New Chore', icon: 'construct', route: '/(stack)/create-chore', color: CORAL, bg: CORAL_SOFT },
              { label: 'Start Meeting', icon: 'people', route: '/meetings/setup', color: NAVY, bg: NAVY_SOFT },
              { label: 'Family Members', icon: 'eye', route: '/(stack)/member-list', color: MUTED, bg: '#F1F3F5' },
            ].map((action, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(action.route as any)}
                style={{
                  width: (SCREEN_WIDTH - 60) / 2,
                  backgroundColor: action.bg,
                  borderRadius: 20,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Ionicons name={action.icon as any} size={20} color={action.color} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: action.color }}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <FamilyChatFab />
    </ScreenContainer>
  );
}