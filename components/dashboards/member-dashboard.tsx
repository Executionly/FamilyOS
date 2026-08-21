// import React, { useEffect, useState } from 'react';
// import { ScrollView, Text, View, Pressable, ActivityIndicator, Linking, RefreshControl } from 'react-native';
// import { useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { ScreenContainer } from '@/components/screen-container';
// import { useColors } from '@/hooks/use-colors';
// import { useFamilyStore } from '@/lib/stores/family-store';
// import { useMeetingStore } from '@/lib/stores/meeting-store';
// import { useCommitmentStore } from '@/lib/stores/commitment-store';
// import { useCalendarStore } from '@/lib/stores/calendar-store';
// import { useChoreStore } from '@/lib/stores/chore-store';
// import { NotificationBell } from '@/components/Notification-Bell';
// import { FamilyChatFab } from '@/components/family-chat-fab';
// import { useNotificationStore } from '@/lib/stores/notification-store';
// import { useAuthStore } from '@/lib/stores/auth-store';

// function StatCard({
//   icon, label, value, sub,
// }: {
//   icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number; sub?: string;
// }) {
//   return (
//     <View className="flex-1 rounded-2xl border border-border bg-surface p-3.5">
//       <Ionicons name={icon} size={20} color="#0a7ea4" />
//       <Text className="mt-1.5 text-xl font-extrabold text-primary">{value}</Text>
//       <Text className="mt-0.5 text-[11px] font-semibold text-foreground">{label}</Text>
//       {sub ? <Text className="mt-0.5 text-[10px] text-muted">{sub}</Text> : null}
//     </View>
//   );
// }

// function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
//   return (
//     <View className="mb-2.5 flex-row items-center justify-between">
//       <Text className="text-[15px] font-bold text-foreground">{title}</Text>
//       {action && (
//         <Pressable onPress={onAction}>
//           <Text className="text-xs font-semibold text-primary">{action}</Text>
//         </Pressable>
//       )}
//     </View>
//   );
// }

// export function MemberDashboard() {
//   const router = useRouter();
//   const colors = useColors();
//   const { family, currentMember } = useFamilyStore();
//   const { meetings, fetchMeetings } = useMeetingStore();
//   const { commitments, fetchCommitments, updateCommitment } = useCommitmentStore();
//   const { events, fetchEvents } = useCalendarStore();
//   const { chores, fetchChores, updateChore } = useChoreStore();
//   const {unreadCount,fetchNotifications} = useNotificationStore()
//   const [loading, setLoading] = useState(true);


//   const handleFetch = () => {
//     if(!family?.id) return
//     setLoading(true)
//     try {
//       Promise.all([
//         fetchMeetings(family.id),
//         fetchCommitments(family.id),
//         fetchEvents(family.id),
//         fetchChores(family.id),
//         fetchNotifications(family.id),
//         unreadCount()
//       ]);
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     handleFetch()
//   }, [family?.id]);

//   const now = new Date();
//   const isSameDay = (a: Date, b: Date) =>
//     a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

//   const myChores = chores.filter((c) => c.assigned_to === currentMember?.id);
//   const myCommitments = commitments.filter((c) => c.assigned_to === currentMember?.id);
//   const myOpenChores = myChores.filter((c) => c.status !== 'completed');
//   const myOpenCommitments = myCommitments.filter((c) => c.status === 'open');
//   const todayEvents = events.filter((e) => isSameDay(new Date(e.start_date), now));
//   const nextMeeting = meetings.find((m) => m.status === 'scheduled');

//   const focusItem = [...myOpenChores, ...myOpenCommitments]
//     .filter((i) => i.due_date)
//     .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]
//     ?? [...myOpenChores, ...myOpenCommitments][0];

//   const isFocusChore = focusItem && myOpenChores.some((c) => c.id === focusItem.id);

//   const greeting = () => {
//     const h = now.getHours();
//     if (h < 12) return 'Good morning';
//     if (h < 17) return 'Good afternoon';
//     return 'Good evening';
//   };

//   const handleFocusComplete = async () => {
//     if (!focusItem) return;
//     try {
//       if (isFocusChore) await updateChore(focusItem.id, { status: 'completed' });
//       else await updateCommitment(focusItem.id, { status: 'completed' });
//     } catch (err) {
//       console.error('Failed to complete focus item:', err);
//     }
//   };

//   const handleChoreComplete = async (id: string) => {
//     try { await updateChore(id, { status: 'completed' }); } catch (err) { console.error(err); }
//   };
//   const handleCommitmentComplete = async (id: string) => {
//     try { await updateCommitment(id, { status: 'completed' }); } catch (err) { console.error(err); }
//   };

//   if (loading) {
//     return (
//       <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
//         <View className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color={colors.primary} />
//           <Text className="mt-3 text-sm text-muted">Loading your dashboard...</Text>
//         </View>
//       </ScreenContainer>
//     );
//   }

//   return (
//     <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
//       <ScrollView 
//       contentContainerStyle={{ paddingBottom: 40 }} 
//       showsVerticalScrollIndicator={false}
//       refreshControl={<RefreshControl refreshing={loading} onRefresh={handleFetch}/>}
//       >
//         {/* ── Header ─────────────────────────────────────── */}
//         <View className="bg-primary px-6 pb-8 pt-5">
//           <View className="flex-row items-start justify-between">
//             <View className="flex-1">
//               <Text className="text-[13px] font-medium text-white/75">
//                 {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
//               </Text>
//               <Text className="mt-1 text-2xl font-extrabold leading-8 text-white">
//                 {greeting()}, {currentMember?.name?.split(' ')[0]} 👋
//               </Text>
//             </View>
//             <NotificationBell />
//           </View>

//           {/* Next meeting pill */}
//           <Pressable
//             onPress={() => router.push('/meetings/setup')}
//             className="mt-4 flex-row items-center justify-between rounded-xl bg-white/15 px-3.5 py-2.5"
//           >
//             <View className="flex-row items-center gap-2">
//               <Ionicons name="calendar-outline" size={18} color="#fff" />
//               <Text className="text-[13px] text-white/85">
//                 {nextMeeting
//                   ? `Next meeting · ${new Date(nextMeeting.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
//                   : 'No meeting scheduled'}
//               </Text>
//             </View>
//             <View className="rounded-md bg-white px-2.5 py-1">
//               <Text className="text-[11px] font-bold text-primary">{nextMeeting ? 'View' : 'Schedule'}</Text>
//             </View>
//           </Pressable>
//         </View>

//         <View className="-mt-3 px-5">
//           {/* ── Focus Card ──────────────────────────────── */}
//           {focusItem ? (
//             <View className="mb-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
//               <Text className="text-[11px] font-bold tracking-wide text-primary">
//                 {isFocusChore ? 'NEXT CHORE' : 'NEXT COMMITMENT'}
//               </Text>
//               <Text className="mt-2 text-lg font-bold leading-6 text-foreground">{focusItem.title}</Text>
//               {focusItem.due_date && (
//                 <Text className="mt-1.5 text-[13px] text-muted">
//                   Due {new Date(focusItem.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
//                 </Text>
//               )}
//               <Pressable
//                 onPress={handleFocusComplete}
//                 className="mt-4 self-start rounded-xl bg-primary px-4.5 py-2.5"
//               >
//                 <Text className="text-[13px] font-bold text-white">Mark Done</Text>
//               </Pressable>
//             </View>
//           ) : (
//             <View className="mb-4 items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
//               <Ionicons name="sparkles-outline" size={24} color="#22C55E" />
//               <Text className="mt-2 text-base font-bold text-emerald-700">You're all caught up!</Text>
//               <Text className="mt-1 text-xs text-emerald-600">No pending chores or commitments</Text>
//             </View>
//           )}

//           {/* ── Stat cards ──────────────────────────────── */}
//           <View className="mb-4 flex-row gap-2.5">
//             <StatCard icon="checkmark-circle-outline" label="Open Tasks" value={myOpenCommitments.length + myOpenChores.length} sub={myOpenCommitments.length + myOpenChores.length === 0 ? 'All clear' : undefined} />
//             <StatCard icon="calendar-clear-outline" label="Today's Events" value={todayEvents.length} />
//             <StatCard icon="construct-outline" label="Chores Due" value={myOpenChores.length} />
//           </View>

//           {/* ── My Commitments ──────────────────────────── */}
//           {myOpenCommitments.length > 0 && (
//             <View className="mb-4">
//               <SectionHeader title="My Commitments" />
//               <View className="rounded-2xl border border-border bg-surface">
//                 {myOpenCommitments.map((item, i) => (
//                   <View key={item.id} className={`flex-row items-center p-3.5 ${i > 0 ? 'border-t border-border' : ''}`}>
//                     <View className="flex-1">
//                       <Text className="text-[13px] font-semibold text-foreground">{item.title}</Text>
//                       {item.due_date && (
//                         <Text className="mt-0.5 text-[11px] text-muted">
//                           Due {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
//                         </Text>
//                       )}
//                     </View>
//                     <Pressable onPress={() => handleCommitmentComplete(item.id)} hitSlop={8}>
//                       <Ionicons name="ellipse-outline" size={22} color={colors.muted} />
//                     </Pressable>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           )}

//           {/* ── My Chores ───────────────────────────────── */}
//           {myOpenChores.length > 0 && (
//             <View className="mb-4">
//               <SectionHeader title="My Chores" action="View all" onAction={() => router.push('/(stack)/chores')} />
//               <View className="rounded-2xl border border-border bg-surface">
//                 {myOpenChores.map((item, i) => (
//                   <View key={item.id} className={`flex-row items-center p-3.5 ${i > 0 ? 'border-t border-border' : ''}`}>
//                     <Text className="mr-2.5 text-lg">🧹</Text>
//                     <Text className="flex-1 text-[13px] font-semibold text-foreground">{item.title}</Text>
//                     <Pressable
//                       onPress={() => handleChoreComplete(item.id)}
//                       className="rounded-lg bg-emerald-500 px-3 py-1.5"
//                     >
//                       <Text className="text-xs font-bold text-white">Done ✓</Text>
//                     </Pressable>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           )}

//           {/* ── Today's Family Events ───────────────────── */}
//           {todayEvents.length > 0 && (
//             <View className="mb-4">
//               <SectionHeader title="Today's Family Events" action="Calendar" onAction={() => router.push('/(stack)/calendar')} />
//               <View className="rounded-2xl border border-border bg-surface">
//                 {todayEvents.map((item, i) => (
//                   <View key={item.id} className={`flex-row items-center p-3.5 ${i > 0 ? 'border-t border-border' : ''}`}>
//                     <View className="mr-3 h-8 w-1 rounded-full bg-primary" style={item.color ? { backgroundColor: item.color } : undefined} />
//                     <View className="flex-1">
//                       <Text className="text-[13px] font-semibold text-foreground">{item.title}</Text>
//                       <Text className="mt-0.5 text-[11px] text-muted">
//                         {new Date(item.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
//                         {item.location ? ` · ${item.location}` : ''}
//                       </Text>
//                     </View>
//                     <Text className="text-lg">📅</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           )}

//           {/* ── Empty state ─────────────────────────────── */}
//           {myOpenCommitments.length === 0 && myOpenChores.length === 0 && todayEvents.length === 0 && (
//             <View className="mb-4 items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
//               <Ionicons name="sparkles-outline" size={24} color="#4ADE80" />
//               <Text className="text-center text-base font-bold text-emerald-700">All caught up!</Text>
//               <Text className="mt-1 text-center text-[13px] text-emerald-600">
//                 No open tasks, events, or chores today.
//               </Text>
//             </View>
//           )}

//           {/* ── Quick Actions ────────────────────────────── */}
//           <View className="mb-2 rounded-2xl border border-border bg-surface p-4">
//             <SectionHeader title="Quick Actions" />
//             <View className="flex-row gap-2.5">
//               <Pressable
//                 onPress={() => router.push('/meal')}
//                 className="flex-1 items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 py-3.5"
//               >
//                 <Ionicons name="restaurant-outline" size={22} color="#0369A1" />
//                 <Text className="text-xs font-semibold text-sky-700">Meals</Text>
//               </Pressable>
//               <Pressable
//                 onPress={() => router.push('/(stack)/chores')}
//                 className="flex-1 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 py-3.5"
//               >
//                 <Ionicons name="construct-outline" size={22} color="#15803D" />
//                 <Text className="text-xs font-semibold text-emerald-700">Chores</Text>
//               </Pressable>
//               <Pressable
//                 onPress={() => router.push('/(stack)/calendar')}
//                 className="flex-1 items-center gap-1 rounded-xl bg-primary py-3.5"
//               >
//                 <Ionicons name="calendar-outline" size={22} color="#fff" />
//                 <Text className="text-xs font-bold text-white">Calendar</Text>
//               </Pressable>
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//       <FamilyChatFab />
//     </ScreenContainer>
//   );
// }

import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView, Text, View, Pressable,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useChoreStore } from '@/lib/stores/chore-store';
import { NotificationBell } from '@/components/Notification-Bell';
import { FamilyChatFab } from '@/components/family-chat-fab';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { TierBadge } from '../ui/tier-badge';
import { supabase } from '@/lib/_core/supabase';
import { CoachmarkProvider } from '@/lib/coachmark/coachmark-context';
import { DashboardTourStarter } from './admin-dashboard';
import { CoachmarkTarget } from '../coachmark/coachmark-target';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    <View className="flex-1 min-w-[90px] rounded-2xl border border-[#E7ECEF] bg-white p-3.5">
      <View
        className="mb-2 h-[34px] w-[34px] items-center justify-center rounded-[10px]"
        style={{ backgroundColor: accentBg }}
      >
        <Icon size={18} color={accent} />
      </View>
      <Text className="text-[22px] font-extrabold text-[#11181C]">{value}</Text>
      <Text className="mt-0.5 text-[11px] font-semibold text-[#11181C]">{label}</Text>
      {sub ? <Text className="mt-0.5 text-[10px] text-[#7C8A94]">{sub}</Text> : null}
    </View>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="mb-2.5 flex-row items-center justify-between">
      <Text className="text-[15px] font-bold text-[#11181C]">{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text className="text-xs font-bold text-[#FE6A50]">{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function MemberDashboard() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const scrollContainerRef = useRef<View>(null);
  const scrollContainerYRef = useRef(0);
  const { family, currentMember, fetchFamilyForUser } = useFamilyStore();
  const { meetings, fetchMeetings } = useMeetingStore();
  const { commitments, fetchCommitments, updateCommitment } = useCommitmentStore();
  const { events, fetchEvents } = useCalendarStore();
  const { chores, fetchChores, updateChore } = useChoreStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  const handleFetch = () => {
    if (!family?.id) return;
    setLoading(true);
    try {
      Promise.all([
        fetchMeetings(family.id),
        fetchCommitments(family.id),
        fetchEvents(family.id),
        fetchChores(family.id),
        fetchNotifications(family.id),
        unreadCount(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetch();
  }, [family?.id]);

  const handleTourFinish = async () => {
    if (!currentMember?.id) return;
    await supabase
      .from('member')
      .update({ dashboard_guide_seen_at: new Date().toISOString() })
      .eq('id', currentMember.id);
      if(currentMember?.user_id)
      await fetchFamilyForUser(currentMember?.user_id)
  };

  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const myChores = chores.filter((c) => c.assigned_to === currentMember?.id);
  const myCommitments = commitments.filter((c) => c.assigned_to === currentMember?.id);
  const myOpenChores = myChores.filter((c) => c.status !== 'completed');
  const myOpenCommitments = myCommitments.filter((c) => c.status === 'open');
  const todayEvents = events.filter((e) => isSameDay(new Date(e.start_date), now));
  const nextMeeting = meetings.find((m) => m.status === 'scheduled');

  const focusItem = [...myOpenChores, ...myOpenCommitments]
    .filter((i) => i.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]
    ?? [...myOpenChores, ...myOpenCommitments][0];

  const isFocusChore = focusItem && myOpenChores.some((c) => c.id === focusItem.id);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleFocusComplete = async () => {
    if (!focusItem) return;
    try {
      if (isFocusChore) await updateChore(focusItem.id, { status: 'completed' });
      else await updateCommitment(focusItem.id, { status: 'completed' });
    } catch (err) {
      console.error('Failed to complete focus item:', err);
    }
  };

  const handleChoreComplete = async (id: string) => {
    try { await updateChore(id, { status: 'completed' }); } catch (err) { console.error(err); }
  };
  const handleCommitmentComplete = async (id: string) => {
    try { await updateCommitment(id, { status: 'completed' }); } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#044768" />
          <Text className="mt-3 text-sm text-[#7C8A94]">Loading your dashboard...</Text>
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
          <DashboardTourStarter hasSeenGuide={!!currentMember?.dashboard_guide_seen_at} />
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
                refreshControl={<RefreshControl refreshing={loading} onRefresh={handleFetch} tintColor="#044768" />}
              >
                {/* ── Header ─────────────────────────────────────────── */}
                <View className="bg-[#044768] px-6 pb-8 pt-2.5">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="mr-2 mt-0.5 text-[13px] font-medium text-white/70">
                          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                        <TierBadge tier={family?.subscription_tier} />
                      </View>
                      <Text className="mt-1 text-[26px] font-extrabold leading-8 text-white">
                        {greeting()},{'\n'}{currentMember?.name?.split(' ')[0]} 👋
                      </Text>
                    </View>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <NotificationBell />
                    </View>
                  </View>

                  {/* Next meeting pill */}
                  <CoachmarkTarget id="next-meeting" order={1} title="Stay on top of meetings" description="See your next scheduled family meeting at a glance, or start one right from here.">
                    <View className="mt-4 flex-row items-center justify-between rounded-xl bg-white/[0.12] px-3.5 py-2.5">
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="calendar-outline" size={20} color="#fff" />
                        <Text className="text-[13px] font-semibold text-white">
                          {nextMeeting
                            ? `Next meeting · ${new Date(nextMeeting.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                            : 'No meeting scheduled'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => router.push('/meetings/setup')}
                        className="rounded-lg bg-[#FE6A50] px-3 py-1.5"
                      >
                        <Text className="text-[11px] font-bold text-white">
                          {nextMeeting ? 'View' : 'Schedule'}
                        </Text>
                      </Pressable>
                    </View>
                  </CoachmarkTarget>
                </View>

                {/* ── Body ───────────────────────────────────────────── */}
                <View className="-mt-3 px-5">

                  {/* ── Focus card ─────────────────────────────────── */}
                  {focusItem ? (
                    <View className="mb-4 rounded-[18px] border border-[#E7ECEF] bg-white p-5 shadow-sm">
                      <Text className="text-[11px] font-extrabold tracking-wide text-[#044768]">
                        {isFocusChore ? 'NEXT CHORE' : 'NEXT COMMITMENT'}
                      </Text>
                      <Text className="mt-2 text-lg font-bold leading-6 text-[#11181C]">{focusItem.title}</Text>
                      {focusItem.due_date && (
                        <Text className="mt-1.5 text-[13px] text-[#7C8A94]">
                          Due {new Date(focusItem.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      )}
                      <Pressable
                        onPress={handleFocusComplete}
                        className="mt-4 self-start rounded-xl bg-[#FE6A50] px-4.5 py-2.5 active:bg-[#044768]"
                      >
                        <Text className="text-[13px] font-bold text-white">Mark Done</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View className="mb-4 items-center rounded-[18px] border border-[#E7ECEF] bg-[#EAF1F5] p-6">
                      <View className="mb-1 h-11 w-11 items-center justify-center rounded-full bg-[#FFEBE6]">
                        <Ionicons name="sparkles-outline" size={22} color="#FE6A50" />
                      </View>
                      <Text className="mt-1.5 text-center text-base font-bold text-[#044768]">
                        You're all caught up!
                      </Text>
                      <Text className="mt-1 text-center text-xs text-[#7C8A94]">
                        No pending chores or commitments.
                      </Text>
                    </View>
                  )}

                  {/* ── Stat cards row ──────────────────────────────── */}
                  <CoachmarkTarget id="stats" order={4} title="Your daily snapshot" description="Open tasks, today's events, and chores due — everything that needs attention today.">
                    <View className="mb-4 flex-row gap-2.5">
                      <StatCard
                        icon={(props) => <Ionicons name="checkmark-circle-outline" {...props} />}
                        label="Open Tasks"
                        value={myOpenCommitments.length + myOpenChores.length}
                        sub={myOpenCommitments.length + myOpenChores.length === 0 ? 'All clear' : 'need attention'}
                        accent="#044768"
                        accentBg="#EAF1F5"
                      />
                      <StatCard
                        icon={(props) => <Ionicons name="calendar-clear-outline" {...props} />}
                        label="Today's Events"
                        value={todayEvents.length}
                        sub={todayEvents.length === 0 ? 'Nothing today' : undefined}
                        accent="#FE6A50"
                        accentBg="#FFEBE6"
                      />
                      <StatCard
                        icon={(props) => <Ionicons name="construct-outline" {...props} />}
                        label="Chores Due"
                        value={myOpenChores.length}
                        sub={myOpenChores.length === 0 ? 'All clear' : undefined}
                        accent="#044768"
                        accentBg="#EAF1F5"
                      />
                    </View>
                  </CoachmarkTarget>

                  {/* ── My Commitments ────────────────────────────── */}
                  {myOpenCommitments.length > 0 && (
                    <View className="mb-4">
                      <SectionHeader title="My Commitments" />
                      <View className="overflow-hidden rounded-[18px] border border-[#E7ECEF] bg-white">
                        {myOpenCommitments.map((item, i) => (
                          <View
                            key={item.id}
                            className={`flex-row items-center p-3.5 ${i > 0 ? 'border-t border-[#E7ECEF]' : ''}`}
                          >
                            <View className="flex-1">
                              <Text className="text-[13px] font-semibold text-[#11181C]">{item.title}</Text>
                              {item.due_date && (
                                <Text className="mt-0.5 text-[11px] text-[#7C8A94]">
                                  Due {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Text>
                              )}
                            </View>
                            <Pressable
                              onPress={() => handleCommitmentComplete(item.id)}
                              hitSlop={8}
                              className="h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-[#FE6A50]"
                            >
                              <Ionicons name="checkmark" size={14} color="#FE6A50" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* ── My Chores ─────────────────────────────────── */}
                  {myOpenChores.length > 0 && (
                    <View className="mb-4">
                      <SectionHeader title="My Chores" action="View all" onAction={() => router.push('/(stack)/chores')} />
                      <View className="overflow-hidden rounded-[18px] border border-[#E7ECEF] bg-white">
                        {myOpenChores.map((item, i) => (
                          <View
                            key={item.id}
                            className={`flex-row items-center p-3.5 ${i > 0 ? 'border-t border-[#E7ECEF]' : ''}`}
                          >
                            <View className="mr-2.5 h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#FFEBE6]">
                              <Ionicons name="construct-outline" size={15} color="#FE6A50" />
                            </View>
                            <Text className="flex-1 text-[13px] font-semibold text-[#11181C]">{item.title}</Text>
                            <Pressable
                              onPress={() => handleChoreComplete(item.id)}
                              className="rounded-lg bg-[#FE6A50] px-3 py-1.5 active:bg-[#044768]"
                            >
                              <Text className="text-[11px] font-bold text-white">Done ✓</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* ── Today's Family Events ────────────────────────── */}
                  {todayEvents.length > 0 && (
                    <View className="mb-4">
                      <SectionHeader title="Today's Family Events" action="Calendar" onAction={() => router.push('/(stack)/calendar')} />
                      <View className="overflow-hidden rounded-[18px] border border-[#E7ECEF] bg-white">
                        {todayEvents.map((item, i) => (
                          <View
                            key={item.id}
                            className={`flex-row items-center p-3.5 ${i > 0 ? 'border-t border-[#E7ECEF]' : ''}`}
                          >
                            <View
                              className="mr-3 h-8 w-1 rounded-full"
                              style={{ backgroundColor: item.color || '#044768' }}
                            />
                            <View className="flex-1">
                              <Text className="text-[13px] font-semibold text-[#11181C]">{item.title}</Text>
                              <Text className="mt-0.5 text-[11px] text-[#7C8A94]">
                                {new Date(item.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                {item.location ? ` · ${item.location}` : ''}
                              </Text>
                            </View>
                            <Ionicons name="calendar" size={18} color="#044768" />
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* ── Empty state ───────────────────────────────── */}
                  {myOpenCommitments.length === 0 && myOpenChores.length === 0 && todayEvents.length === 0 && (
                    <View className="mb-4 items-center rounded-[18px] border border-[#E7ECEF] bg-[#EAF1F5] p-6">
                      <View className="mb-1 h-11 w-11 items-center justify-center rounded-full bg-[#FFEBE6]">
                        <Ionicons name="sparkles-outline" size={22} color="#FE6A50" />
                      </View>
                      <Text className="mt-1.5 text-center text-base font-bold text-[#044768]">All caught up!</Text>
                      <Text className="mt-1 text-center text-[13px] text-[#7C8A94]">
                        No open tasks, events, or chores today.
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Action Hub ─────────────────────────────────────── */}
                <CoachmarkTarget id="action-hub" order={6} title="Quick actions" description="View today's meal, log a chore, or create an event in one tap.">
                  <View className="px-6">
                    <Text className="mb-4 text-sm font-extrabold text-[#11181C]">Action Hub</Text>
                    <View className="flex-row flex-wrap gap-3">
                      {[
                        { label: 'Meals', icon: 'restaurant-outline', route: '/meal', color: '#044768', bg: '#EAF1F5' },
                        { label: 'Chores', icon: 'construct', route: '/(stack)/chores', color: '#FE6A50', bg: '#FFEBE6' },
                        { label: 'Calendar', icon: 'calendar', route: '/(stack)/calendar', color: '#044768', bg: '#EAF1F5' },
                      ].map((action, i) => (
                        <Pressable
                          key={i}
                          onPress={() => router.push(action.route as any)}
                          className="flex-row items-center gap-3 rounded-[20px] p-4"
                          style={{ width: (SCREEN_WIDTH - 60) / 2, backgroundColor: action.bg }}
                        >
                          <Ionicons name={action.icon as any} size={20} color={action.color} />
                          <Text className="text-[13px] font-bold" style={{ color: action.color }}>{action.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </CoachmarkTarget>
              </ScrollView>
            </View>
            <CoachmarkTarget id="chat-fab" order={7} title="Ask your Family AI" description="Have a question about the app or your family? Just ask — it's always one tap away.">
              <FamilyChatFab />
            </CoachmarkTarget>
          </ScreenContainer>
        </CoachmarkProvider>
  );
}