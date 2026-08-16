import React, { useEffect } from 'react';
import {
 Text, View, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';
import { isAdminAccess } from '@/utils';
import AdminDashboard from '@/components/dashboards/admin-dashboard';
import { MemberDashboard } from '@/components/dashboards/member-dashboard';
import { ChildDashboard } from '@/components/dashboards/child-dashboard';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useBriefingStore } from '@/lib/stores/briefing-store';


export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors()
  const { family, currentMember, loading } = useFamilyStore();
  const {initialize, user} = useAuthStore()
  const {fetchPreferences} = useNotificationStore()
  const isPremium = family?.subscription_tier === "premium"


  useEffect(()=>{
    initialize()
  },[])

  useEffect(()=>{
    if(!currentMember?.user_id || !currentMember?.family_id) return
    fetchPreferences(currentMember?.user_id, currentMember?.family_id)
  },[currentMember, loading])

  const isAdmin = isAdminAccess(currentMember?.role)

  useEffect(() => {
    if (family?.id && user?.id && currentMember?.id) {
      useBriefingStore.getState().checkBriefing(family.id, user?.id, {
        memberId: currentMember.id,
        isPremium,
        hasSeenAiIntro: !!currentMember.ai_intro_seen_at,
      });
    }
  }, [family?.id, user?.id, currentMember?.id, isPremium]);

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

  if(isAdmin) {
    return <AdminDashboard/>
  }

  if(currentMember?.role === "toddler" ||
    currentMember?.role === "child" || 
    currentMember?.role === "preteen"
  ) {
    return <ChildDashboard/>
  }

  return <MemberDashboard/>

}