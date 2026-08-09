import { useEffect } from 'react';
import { useChoreStore } from '@/lib/stores/chore-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { useStoriesStore } from '@/lib/stores/stories-store';
import { useGroupChatStore } from '@/lib/stores/group-chat-store';
import { useDmStore } from '@/lib/stores/dm-store';

export function useFamilyRealtime(familyId: string | undefined, userId: string | undefined) {
  const { subscribeToRealtime: subChores, unsubscribeFromRealtime: unsubChores } = useChoreStore();
  const { subscribeToRealtime: subCommitments, unsubscribeFromRealtime: unsubCommitments } = useCommitmentStore();
  const { subscribeToRealtime: subEvents, unsubscribeFromRealtime: unsubEvents } = useCalendarStore();
  const { subscribeToRealtime: subMeetings, unsubscribeFromRealtime: unsubMeetings } = useMeetingStore();
  const { subscribeToRealtime: subStories, unsubscribeFromRealtime: unsubStories } = useStoriesStore();
  const { subscribeToToasts: subGroupChatToasts, unsubscribeFromToasts: unsubGroupChatToasts } = useGroupChatStore();
  const { subscribeToToasts: subDmToasts, unsubscribeFromToasts: unsubDmToasts } = useDmStore();

  useEffect(() => {
    if (!familyId || !userId) return;

    subChores(familyId);
    subCommitments(familyId);
    subEvents(familyId);
    subMeetings(familyId);
    subStories(familyId);
    subGroupChatToasts(familyId, userId);
    subDmToasts(familyId, userId);

    return () => {
      unsubChores();
      unsubCommitments();
      unsubEvents();
      unsubMeetings();
      unsubStories();
      unsubGroupChatToasts();
      unsubDmToasts();
    };
  }, [familyId, userId]);
}