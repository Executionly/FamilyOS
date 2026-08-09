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
import {Ionicons} from '@expo/vector-icons';
import { FamilyChatFab } from '@/components/family-chat-fab';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';

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
        {/* Track */}
        <Circle cx={cx} cy={cy} r={r} stroke={bg} strokeWidth={strokeWidth} fill="none" />
        {/* Progress */}
        <Circle
          cx={cx} cy={cy} r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
        {/* Centre label */}
        <SvgText
          x={cx} y={cy - 6}
          textAnchor="middle"
          fontSize={18}
          fontWeight="700"
          fill={color}
        >
          {label}
        </SvgText>
        <SvgText
          x={cx} y={cy + 10}
          textAnchor="middle"
          fontSize={9}
          fill="#9CA3AF"
        >
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
              {/* Track */}
              <Rect x={x} y={0} width={barW} height={chartH} rx={4} fill="#F1F5F9" />
              {/* Fill */}
              <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={val > 0 ? 1 : 0.3} />
              {/* Day label */}
              <SvgText
                x={x + barW / 2} y={chartH + 13}
                textAnchor="middle"
                fontSize={9}
                fill="#9CA3AF"
              >
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
  label, value, sub, accent,
}: {
  icon: React.ComponentType<{ size: number; color: string }>; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <View
      style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', minWidth: 90 }}
    >
      {/* <Text style={{ fontSize: 20, marginBottom: 6 }}>{icon}</Text> */}
      <Icon size={22} color={accent} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: accent }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#374151', fontWeight: '600', marginTop: 1 }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#11181C' }}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 12, color: '#0a7ea4', fontWeight: '600' }}>{action}</Text>
        </Pressable>
      )}
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
  const {unreadCount,fetchNotifications} = useNotificationStore()
  const [loading, setLoading] = useState(true);
  const memberName = (id?: string | null) => members?.find((m) => m.id === id)?.name ?? null;


  const handleFetch = () => {
    if(!family?.id) return
    setLoading(true)
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
      setLoading(false)
    }
  }

  useEffect(() => {
    handleFetch()
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
  const doneCommitments = commitments.filter((c) => c.status === 'completed' );
  const totalCommitments = commitments.length;
  const followThrough = totalCommitments > 0 ? doneCommitments.length / totalCommitments : 0;
  const completedChores = chores.filter((c) => c.status === 'completed').length;
  const choreRate = chores.length > 0 ? completedChores / chores.length : 0;

  // 7-day activity bars (meetings per day this week)
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Loading your family dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer 
    containerClassName="bg-background" 
    safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleFetch}/>}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#0a7ea4',
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 32,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' }}>
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4, lineHeight: 32 }}>
                {greeting()},{'\n'}{family?.name} Family 👋
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <NotificationBell />
            </View>
          </View>

          {/* Next meeting pill */}
          <View style={{
            marginTop: 16,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={20} color="white" />
              <Text className='text-white font-semibold' style={{fontSize: 13 }}>
                {nextMeeting
                  ? `Next meeting · ${new Date(nextMeeting.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                  : 'No meeting scheduled'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/meetings/setup')}
              style={{ backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Text style={{ color: '#0a7ea4', fontSize: 11, fontWeight: '700' }}>
                {nextMeeting ? 'View' : 'Schedule'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: -12 }}>

          {/* ── Progress rings card ─────────────────────────── */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}>
            <SectionHeader title="Family Progress" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ProgressRing
                  progress={followThrough}
                  color="#0a7ea4"
                  bg="#E0F2FE"
                  label={`${Math.round(followThrough * 100)}%`}
                  sublabel="done"
                />
                <Text style={{ fontSize: 11, color: '#687076', fontWeight: '600' }}>Commitments</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ProgressRing
                  progress={choreRate}
                  color="#22C55E"
                  bg="#DCFCE7"
                  label={`${Math.round(choreRate * 100)}%`}
                  sublabel="done"
                />
                <Text style={{ fontSize: 11, color: '#687076', fontWeight: '600' }}>Chores</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <ProgressRing
                  progress={meetings.filter((m) => m.status === 'completed').length > 0 ? 1 : 0}
                  color="#F59E0B"
                  bg="#FEF3C7"
                  label={`${meetings.filter((m) => m.status === 'completed').length}`}
                  sublabel="total"
                />
                <Text style={{ fontSize: 11, color: '#687076', fontWeight: '600' }}>Meetings</Text>
              </View>
            </View>
          </View>

          {/* ── Stat cards row ──────────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatCard
              icon={(props) => <Ionicons name="checkmark-circle-outline" {...props} />}
              label="Open Tasks"
              value={openCommitments.length}
              sub={openCommitments.length === 0 ? 'All caught up!' : 'need attention'}
              accent="#0a7ea4"
            />
            <StatCard
              icon={(props) => <Ionicons name="calendar-clear-outline" {...props} />}
              label="Today's Events"
              value={todayEvents.length}
              sub={todayEvents.length === 0 ? 'Nothing today' : undefined}
              accent="#F59E0B"
            />
            <StatCard
              icon={(props) => <Ionicons name="construct-outline" {...props} />}
              label="Chores Due"
              value={todayChores.length}
              sub={todayChores.length === 0 ? 'All clear' : 'today'}
              accent="#22C55E"
            />
          </View>

          {/* ── 7-day activity chart ─────────────────────────── */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}>
            <SectionHeader title="7-Day Meeting Activity" />
            <View style={{ alignItems: 'center', paddingTop: 4 }}>
              <ActivityBars data={weekBars} color="#0a7ea4" />
            </View>
            <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
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
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    backgroundColor: '#fff',
                    minWidth: 160,
                    maxWidth: 200,
                  }}>
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: '#0a7ea4', marginBottom: 8,
                    }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#11181C' }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.due_date && (
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
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
                        backgroundColor: item.priority === 'high' ? '#FEE2E2' : item.priority === 'medium' ? '#FEF3C7' : '#F0FDF4',
                      }}>
                        <Text style={{
                          fontSize: 10, fontWeight: '700',
                          color: item.priority === 'high' ? '#DC2626' : item.priority === 'medium' ? '#D97706' : '#16A34A',
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
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}>
                  <View style={{
                    width: 4, height: 40, borderRadius: 2,
                    backgroundColor: item.color || '#0a7ea4',
                    marginRight: 12,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#11181C' }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                      {new Date(item.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {item.location ? ` · ${item.location}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20 }}>📅</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Chores Due Today ────────────────────────────── */}
          {todayChores.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <SectionHeader title="Chores Due Today" 
              action="View all"
              onAction={() => router.push('/(stack)/create-chore')}/>
              {todayChores.map((item, i) => (
                <View key={i} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}>
                  <Text style={{ fontSize: 20, marginRight: 12 }}>🧹</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#11181C' }}>{item.title}</Text>
                    {item.assigned_to && (
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                        Assigned to {memberName(item.assigned_to)}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleMarkChoreComplete(item.id)}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#16A34A' : '#22C55E',
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
              backgroundColor: '#F0FDF4',
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#BBF7D0',
              marginBottom: 16,
            }}>
              <Ionicons name="sparkles-outline" size={24} color="#4ADE80" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#15803D', textAlign: 'center' }}>
                All caught up!
              </Text>
              <Text style={{ fontSize: 13, color: '#4ADE80', textAlign: 'center', marginTop: 4 }}>
                No open tasks, events, or chores today.
              </Text>
            </View>
          )}

          {/* ── Quick Actions ────────────────────────────────── */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginBottom: 8,
          }}>
            <SectionHeader title="Quick Actions" />
            <View className='justify-between'
            style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => router.push('/(stack)/create-event')}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  alignItems: 'center', gap: 4,
                  backgroundColor: pressed ? '#E0F2FE' : '#F0F9FF',
                  borderWidth: 1, borderColor: '#BAE6FD',
                })}
                className='items-center'
              >
                <Ionicons name="calendar-clear-outline" size={24} color="#0369A1" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0369A1' }}>Add Event</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(stack)/create-chore')}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  alignItems: 'center', gap: 4,
                  backgroundColor: pressed ? '#DCFCE7' : '#F0FDF4',
                  borderWidth: 1, borderColor: '#BBF7D0',
                })}
                 className='items-center'
              >
                <Ionicons name="construct-outline" size={24} color="#15803D" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}>Add Chore</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/meetings/setup')}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: 14, borderRadius: 12,
                  alignItems: 'center', gap: 4,
                  backgroundColor: pressed ? '#0369A1' : '#0a7ea4',
                })}
                 className='items-center'
              >
                <Ionicons name="calendar-outline" size={24} color="#0369A1" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0a7ea4' }}>Meeting</Text>
              </Pressable>
            </View>
          </View>

        </View>
      </ScrollView>
      <FamilyChatFab/>
    </ScreenContainer>
  );
}