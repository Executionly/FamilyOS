import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView, Text, View, Pressable,
  FlatList, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
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
import { TierBadge } from '../ui/tier-badge';
import { CoachmarkProvider, useCoachmark } from '@/lib/coachmark/coachmark-context';
import { supabase } from '@/lib/_core/supabase';
import { CoachmarkOverlay } from '../coachmark/coachmark-overlay';
import { CoachmarkTarget } from '../coachmark/coachmark-target';
import { FamilyChallengeCard } from '../family-challenge-card';
import { GameSession, useGameStore } from '@/lib/stores/game-store';
import { GAME_META } from '@/constants/games';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { ExpiredSubscriptionCard } from '../ExpiredSubscriptionCard';

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
  size = 72,
  strokeWidth = 6,
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
        <SvgText x={cx} y={cy - 4} textAnchor="middle" fontSize={16} fontWeight="700" fill={color}>
          {label}
        </SvgText>
        <SvgText x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill={MUTED}>
          {sublabel}
        </SvgText>
      </Svg>
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

// ── Explore row item ─────────────────────────────────────────

function ExploreItem({
  icon, label, color, bg, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: 76, marginRight: 14 }}>
      <View style={{
        width: 54, height: 54, borderRadius: 17, backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center', marginBottom: 6,
      }}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: INK, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DashboardTourStarter({ hasSeenGuide }: { hasSeenGuide: boolean }) {
  const { startTour } = useCoachmark();
  useEffect(() => {
    if (!hasSeenGuide) {
      const timer = setTimeout(startTour, 400);
      return () => clearTimeout(timer);
    }
  }, [hasSeenGuide]);
  return null;
}

// ── Main screen ───────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const scrollContainerRef = useRef<View>(null);
  const scrollContainerYRef = useRef(0);
  const colors = useColors();
  const { family, members, currentMember, fetchFamilyForUser } = useFamilyStore();
  const { meetings, fetchMeetings } = useMeetingStore();
  const { commitments, fetchCommitments } = useCommitmentStore();
  const { events, fetchEvents } = useCalendarStore();
  const { chores, fetchChores, updateChore } = useChoreStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const { findActiveSession } = useGameStore();
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const memberName = (id?: string | null) => members?.find((m) => m.id === id)?.name ?? null;

  const isPremium = family?.subscription_tier === 'premium';
  const { tier, expiresAt } = useSubscriptionStore();
  const [subStatus, setSubStatus] = useState<string | null>(null);

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

  useEffect(() => {
    if (family?.id && currentMember?.id) {
      findActiveSession(family.id, currentMember.id).then(setActiveGame);
    }
  }, [family?.id, currentMember?.id]);

  useEffect(() => {
    if (family?.id) {
      supabase.from('family').select('subscription_status').eq('id', family.id).single()
        .then(({ data }) => setSubStatus(data?.subscription_status ?? null));
    }
  }, [family?.id]);

  const showExpiredCard = subStatus === 'expired' && tier === 'free';

  const handleTourFinish = async () => {
    if (!currentMember?.id) return;
    await supabase
      .from('member')
      .update({ dashboard_guide_seen_at: new Date().toISOString() })
      .eq('id', currentMember.id);
    if (currentMember?.user_id) await fetchFamilyForUser(currentMember?.user_id);
  };

  // ── derived data ─────────────────────────────────────────────

  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const nextMeeting = meetings.find((m) => m.status === 'scheduled');
  const todayEvents = events.filter((e) => isSameDay(new Date(e.start_date), now));
  const todayChores = chores.filter(
    (c) => c.due_date && isSameDay(new Date(c.due_date), now) && c.status !== 'completed'
  );
  const openCommitments = commitments.filter((c) => c.status === 'open');
  const doneCommitments = commitments.filter((c) => c.status === 'completed');
  const totalCommitments = commitments.length;
  const followThrough = totalCommitments > 0 ? doneCommitments.length / totalCommitments : 0;
  const completedChores = chores.filter((c) => c.status === 'completed').length;
  const choreRate = chores.length > 0 ? completedChores / chores.length : 0;
  const completedMeetings = meetings.filter((m) => m.status === 'completed').length;

  // Unified "today" list — chores and events merged, sorted with timed events first
  const todayItems = [
    ...todayEvents.map((e) => ({
      key: `event-${e.id}`,
      kind: 'event' as const,
      title: e.title,
      subtitle: `${new Date(e.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${e.location ? ` · ${e.location}` : ''}`,
      time: new Date(e.start_date).getTime(),
      data: e,
    })),
    ...todayChores.map((c) => ({
      key: `chore-${c.id}`,
      kind: 'chore' as const,
      title: c.title,
      subtitle: c.assigned_to ? `Assigned to ${memberName(c.assigned_to)}` : undefined,
      time: Infinity,
      data: c,
    })),
  ].sort((a, b) => a.time - b.time);

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
    <CoachmarkProvider
      onFinish={handleTourFinish}
      scrollViewRef={scrollViewRef}
      scrollOffsetRef={scrollOffsetRef}
      scrollContainerYRef={scrollContainerYRef}
    >
      <DashboardTourStarter hasSeenGuide={true} />

      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View
          ref={scrollContainerRef}
          style={{ flex: 1 }}
          onLayout={() => {
            scrollContainerRef.current?.measureInWindow((_x, y) => {
              scrollContainerYRef.current = y;
            });
          }}
        >
          <ScrollView
            ref={scrollViewRef}
            onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={handleFetch} tintColor={NAVY} />}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <View style={{ backgroundColor: NAVY, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 32 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center">
                    <Text className="mr-2 mt-2" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>
                      {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <TierBadge tier={family?.subscription_tier} />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4, lineHeight: 32 }}>
                    {greeting()},{'\n'}{family?.name} Family 👋
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <NotificationBell />
                </View>
              </View>

              <CoachmarkTarget id="next-meeting" order={1} title="Stay on top of meetings" description="See your next scheduled family meeting at a glance, or start one right from here.">
                <View style={{
                  marginTop: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row',
                  alignItems: 'center', justifyContent: 'space-between',
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
              </CoachmarkTarget>
            </View>

            {/* ── Body ───────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, marginTop: -12 }}>

              {/* ── Today ─────────────────────────────────────── */}
              <CoachmarkTarget id="today" order={2} title="Today at a glance" description="Everything happening today — events and chores — in one place.">
                <View style={{
                  backgroundColor: CARD_BG, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: BORDER,
                  marginBottom: 16, shadowColor: NAVY, shadowOpacity: 0.06, shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 }, elevation: 2,
                }}>
                  <SectionHeader title="Today" action="Calendar" onAction={() => router.push('/(stack)/calendar')} />
                  {todayItems.length > 0 ? (
                    todayItems.map((item, i) => (
                      <View
                        key={item.key}
                        style={{
                          flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                          borderTopWidth: i > 0 ? 1 : 0, borderTopColor: BORDER,
                        }}
                      >
                        <View style={{
                          width: 32, height: 32, borderRadius: 10,
                          backgroundColor: item.kind === 'event' ? NAVY_SOFT : CORAL_SOFT,
                          alignItems: 'center', justifyContent: 'center', marginRight: 12,
                        }}>
                          <Ionicons
                            name={item.kind === 'event' ? 'calendar' : 'construct-outline'}
                            size={16}
                            color={item.kind === 'event' ? NAVY : CORAL}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: INK }}>{item.title}</Text>
                          {item.subtitle && (
                            <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{item.subtitle}</Text>
                          )}
                        </View>
                        {item.kind === 'chore' && (
                          <Pressable
                            onPress={() => handleMarkChoreComplete(item.data.id)}
                            style={({ pressed }) => ({
                              backgroundColor: pressed ? NAVY : CORAL,
                              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
                            })}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Done ✓</Text>
                          </Pressable>
                        )}
                      </View>
                    ))
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                      <Ionicons name="sparkles-outline" size={20} color={CORAL} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: NAVY, marginTop: 6 }}>
                        Nothing on today
                      </Text>
                      <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                        No events or chores due today.
                      </Text>
                    </View>
                  )}
                </View>
              </CoachmarkTarget>

              {showExpiredCard && <ExpiredSubscriptionCard />}
              {/* ── Premium upsell — slim, only on free plan ────── */}
              {!isPremium && !showExpiredCard && (
                <CoachmarkTarget id="premium-upsell" order={3} title="Unlock more with Premium" description="Get AI meeting agendas, unlimited members, and more whenever you're ready.">
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
                </CoachmarkTarget>
              )}

              {/* ── Family Snapshot (progress + counts, one card) ── */}
              <CoachmarkTarget id="snapshot" order={3} title="Family Snapshot" description="A quick read on commitments, chores, and meetings — how your family is trending.">
                <View style={{
                  backgroundColor: CARD_BG, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: BORDER,
                  marginBottom: 8, shadowColor: NAVY, shadowOpacity: 0.06, shadowRadius: 10,
                  shadowOffset: { width: 0, height: 3 }, elevation: 2,
                }}>
                  <SectionHeader title="Family Snapshot" />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 }}>
                    <View style={{ alignItems: 'center', gap: 5 }}>
                      <ProgressRing progress={followThrough} color={NAVY} bg={NAVY_SOFT} label={`${Math.round(followThrough * 100)}%`} sublabel="done" />
                      <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600' }}>Commitments</Text>
                    </View>
                    <View style={{ alignItems: 'center', gap: 5 }}>
                      <ProgressRing progress={choreRate} color={CORAL} bg={CORAL_SOFT} label={`${Math.round(choreRate * 100)}%`} sublabel="done" />
                      <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600' }}>Chores</Text>
                    </View>
                    <View style={{ alignItems: 'center', gap: 5 }}>
                      <ProgressRing progress={completedMeetings > 0 ? 1 : 0} color={NAVY} bg={NAVY_SOFT} label={`${completedMeetings}`} sublabel="total" />
                      <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600' }}>Meetings</Text>
                    </View>
                  </View>

                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-between', marginTop: 10,
                    paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER,
                  }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: INK }}>{openCommitments.length}</Text>
                      <Text style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>Open tasks</Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: INK }}>{todayItems.length}</Text>
                      <Text style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>Due today</Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: INK }}>{members?.length ?? 0}</Text>
                      <Text style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>Members</Text>
                    </View>
                  </View>
                </View>
              </CoachmarkTarget>

              {/* ── Open Commitments ──────────────────────────── */}
              {openCommitments.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <SectionHeader title="Open Commitments" action="View all" onAction={() => router.push('/(tabs)/meetings')} />
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={openCommitments.slice(0, 5)}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={({ item }) => (
                      <View style={{
                        marginRight: 10, padding: 14, borderRadius: 14, borderWidth: 1,
                        borderColor: BORDER, backgroundColor: CARD_BG, minWidth: 160, maxWidth: 200,
                      }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CORAL, marginBottom: 8 }} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: INK }} numberOfLines={2}>{item.title}</Text>
                        {item.due_date && (
                          <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                            Due {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        )}
                        {item.priority && (
                          <View style={{
                            marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
                            backgroundColor: item.priority === 'high' ? CORAL : item.priority === 'medium' ? CORAL_SOFT : NAVY_SOFT,
                          }}>
                            <Text style={{
                              fontSize: 10, fontWeight: '700',
                              color: item.priority === 'high' ? '#fff' : item.priority === 'medium' ? CORAL : NAVY,
                              textTransform: 'capitalize',
                            }}>{item.priority}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  />
                </View>
              )}

              {/* ── Active game (only if one exists) ──────────── */}
              {activeGame && (
                <Pressable
                  onPress={() => router.push(
                    activeGame.status === 'waiting'
                      ? `/(stack)/games/lobby?sessionId=${activeGame.id}`
                      : `/(stack)/games/play?sessionId=${activeGame.id}`
                  )}
                  className="mb-4 flex-row items-center rounded-2xl border border-primary bg-primary/5 p-4"
                >
                  <Ionicons name="game-controller" size={20} color={colors.primary} />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-bold text-foreground">
                      {activeGame.status === 'waiting' ? 'Game waiting for you' : 'Game in progress'}
                    </Text>
                    <Text className="text-xs text-muted">{GAME_META[activeGame.game_type].label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </Pressable>
              )}
              {/* ── Family Challenge ──────────────────────────── */}
              <CoachmarkTarget id="challenge" order={4} title="Family Challenges" description="A fun, values-based challenge for your family to take on together.">
                <FamilyChallengeCard />
              </CoachmarkTarget>
            </View>

            {/* ── Quick Actions ────────────────────────────────── */}
            <CoachmarkTarget id="action-hub" order={6} title="Quick actions" description="Add an event, log a chore, or start a meeting in one tap.">
              <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: INK, marginBottom: 14 }}>Quick Actions</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    { label: 'Add Event', icon: 'add-circle', route: '/(stack)/create-event', color: NAVY, bg: NAVY_SOFT },
                    { label: 'New Chore', icon: 'construct', route: '/(stack)/create-chore', color: CORAL, bg: CORAL_SOFT },
                    { label: 'Start Meeting', icon: 'people', route: '/meetings/setup', color: NAVY, bg: NAVY_SOFT },
                    { label: 'Family Members', icon: 'people-outline', route: '/(stack)/member-list', color: MUTED, bg: '#F1F3F5' },
                  ].map((action, i) => (
                    <Pressable
                      key={i}
                      onPress={() => router.push(action.route as any)}
                      style={{
                        width: (SCREEN_WIDTH - 60) / 2, backgroundColor: action.bg, borderRadius: 20,
                        padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
                      }}
                    >
                      <Ionicons name={action.icon as any} size={20} color={action.color} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: action.color }}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </CoachmarkTarget>

            {/* ── Explore ─────────────────────────────────────── */}
            <CoachmarkTarget id="explore" order={7} title="More to explore" description="Meal planning, family games, your media library, and the app guide — all one tap away.">
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: INK, marginBottom: 14, paddingHorizontal: 24 }}>
                  Explore
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                  <ExploreItem icon="restaurant-outline" label="Meal Planner" color={NAVY} bg={NAVY_SOFT} onPress={() => router.push('/(stack)/meal')} />
                  <ExploreItem icon="game-controller-outline" label="Family Games" color={CORAL} bg={CORAL_SOFT} onPress={() => router.push('/(stack)/games')} />
                  <ExploreItem icon="images-outline" label="Family Media" color={NAVY} bg={NAVY_SOFT} onPress={() => router.push('/(stack)/media-library')} />
                  <ExploreItem icon="book-outline" label="Guide" color={CORAL} bg={CORAL_SOFT} onPress={() => router.push('/(stack)/guide')} />
                </ScrollView>
              </View>
            </CoachmarkTarget>
          </ScrollView>
        </View>

        <CoachmarkTarget id="chat-fab" order={8} title="Ask your Family AI" description="Have a question about the app or your family? Just ask — it's always one tap away.">
          <FamilyChatFab />
        </CoachmarkTarget>
      </ScreenContainer>

      <CoachmarkOverlay />
    </CoachmarkProvider>
  );
}