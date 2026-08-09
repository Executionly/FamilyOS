import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { getConversationId } from '@/utils';
import { notifyMember } from '../services/notify';
import { useToastStore } from './toast-store';

export interface DirectMessage {
  id: string;
  family_id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  image_path: string | null;
  signed_image_url?: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ConversationSummary {
  conversation_id: string;
  other_user_id: string;
  other_member_name: string;
  other_member_avatar_url?: string | null;
  last_message: DirectMessage;
  unread_count: number;
}

async function getSignedDmImageUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from('dm-images').createSignedUrl(path, 60 * 60 * 24);
    if (error) throw error;
    return data.signedUrl;
  } catch {
    return null;
  }
}

interface DmState {
  messages: DirectMessage[];
  conversations: ConversationSummary[];
  loading: boolean;
  loadingConversations: boolean;
  sending: boolean;
  error: string | null;
  channel: ReturnType<typeof supabase.channel> | null;
  inboxChannel: ReturnType<typeof supabase.channel> | null;
  toastChannel: ReturnType<typeof supabase.channel> | null;

  loadConversations: (familyId: string, myUserId: string, silent?: boolean) => Promise<void>;
  loadThread: (myUserId: string, otherUserId: string) => Promise<void>;
  sendMessage: (familyId: string, myUserId: string, otherUserId: string, content: string) => Promise<void>;
  sendImage: (familyId: string, myUserId: string, otherUserId: string) => Promise<void>;
  markThreadRead: (myUserId: string, otherUserId: string) => Promise<void>;
  subscribeToThread: (myUserId: string, otherUserId: string) => void;
  unsubscribeFromThread: () => void;
  subscribeToInbox: (myUserId: string, familyId: string) => void;
  unsubscribeFromInbox: () => void;
  subscribeToToasts: (myUserId: string, familyId: string) => void;
  unsubscribeFromToasts: () => void;
}

export const useDmStore = create<DmState>((set, get) => ({
  messages: [],
  conversations: [],
  loading: false,
  loadingConversations: false,
  sending: false,
  error: null,
  channel: null,
  inboxChannel: null,
  toastChannel: null,

  loadConversations: async (familyId: string, myUserId: string, silent = false) => {
    if (!silent) set({ loadingConversations: true, error: null });
    console.log("TOUCH loadConversations", { familyId, myUserId });
    try {
      const { data: allMessages, error } = await supabase
        .from('direct_message')
        .select('*')
        .eq('family_id', familyId)
        .or(`sender_id.eq.${myUserId},recipient_id.eq.${myUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: members } = await supabase
        .from('member')
        .select('user_id, name, avatar_url')
        .eq('family_id', familyId);

      const memberByUserId = new Map((members ?? []).map((m) => [m.user_id, m]));

      // Group by conversation_id, keep the latest message + count unread
      const byConversation = new Map<string, DirectMessage[]>();
      (allMessages ?? []).forEach((m) => {
        byConversation.set(m.conversation_id, [...(byConversation.get(m.conversation_id) ?? []), m]);
      });

      const summaries: ConversationSummary[] = Array.from(byConversation.entries()).map(([convId, msgs]) => {
        const lastMessage = msgs[0]; // already sorted desc
        const otherUserId = lastMessage.sender_id === myUserId ? lastMessage.recipient_id : lastMessage.sender_id;
        const otherMember = memberByUserId.get(otherUserId);
        const unreadCount = msgs.filter((m) => m.recipient_id === myUserId && !m.read_at).length;

        return {
          conversation_id: convId,
          other_user_id: otherUserId,
          other_member_name: otherMember?.name ?? 'Family member',
          other_member_avatar_url: otherMember?.avatar_url,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      });

      summaries.sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());

      set({ conversations: summaries, loadingConversations: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load conversations', loadingConversations: false });
    }
  },

  loadThread: async (myUserId: string, otherUserId: string) => {
    set({ loading: true, error: null });
    try {
      const conversationId = getConversationId(myUserId, otherUserId);

      const { data, error } = await supabase
        .from('direct_message')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const enriched = await Promise.all(
        (data ?? []).map(async (m) => ({
          ...m,
          signed_image_url: m.image_path ? await getSignedDmImageUrl(m.image_path) : null,
        }))
      );

      set({ messages: enriched, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load conversation', loading: false });
    }
  },

  sendMessage: async (familyId, myUserId, otherUserId, content) => {
    if (!content.trim()) return;
    set({ sending: true, error: null });

    const conversationId = getConversationId(myUserId, otherUserId);
    const optimistic: DirectMessage = {
      id: `temp-${Date.now()}`,
      family_id: familyId,
      conversation_id: conversationId,
      sender_id: myUserId,
      recipient_id: otherUserId,
      content,
      image_path: null,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, optimistic] }));

    try {
      const { error } = await supabase.from('direct_message').insert([{
        family_id: familyId,
        conversation_id: conversationId,
        sender_id: myUserId,
        recipient_id: otherUserId,
        content,
      }]);
      if (error) throw error;

      const { data: senderMember } = await supabase
        .from('member')
        .select('name')
        .eq('family_id', familyId)
        .eq('user_id', myUserId)
        .maybeSingle();

      const { data: recipientMember } = await supabase
        .from('member')
        .select('id')
        .eq('family_id', familyId)
        .eq('user_id', otherUserId)
        .maybeSingle();

      if (recipientMember) {
        await notifyMember(recipientMember.id, {
          familyId,
          type: 'direct_message',
          priority: 'important',
          title: senderMember?.name ?? 'New message',
          body: content.length > 60 ? `${content.slice(0, 60)}...` : content,
          actionRoute: `/dm?userId=${myUserId}`,
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send message' });
      set((state) => ({ messages: state.messages.filter((m) => m.id !== optimistic.id) }));
    } finally {
      set({ sending: false });
    }
  },

  sendImage: async (familyId, myUserId, otherUserId) => {
    const ImagePicker = await import('expo-image-picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    set({ sending: true, error: null });
    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop();
      const fileName = `image_${Date.now()}.${fileExt}`;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const conversationId = getConversationId(myUserId, otherUserId);
      const storagePath = `${conversationId}/${Date.now()}_${fileName}`;

      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);

      const { error: uploadError } = await supabase.storage
        .from('dm-images')
        .upload(storagePath, formData, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('direct_message').insert([{
        family_id: familyId,
        conversation_id: conversationId,
        sender_id: myUserId,
        recipient_id: otherUserId,
        image_path: storagePath,
      }]);
      if (error) throw error;

      const { data: senderMember } = await supabase
        .from('member').select('name').eq('family_id', familyId).eq('user_id', myUserId).maybeSingle();
      const { data: recipientMember } = await supabase
        .from('member').select('id').eq('family_id', familyId).eq('user_id', otherUserId).maybeSingle();

      if (recipientMember) {
        await notifyMember(recipientMember.id, {
          familyId,
          type: 'direct_message',
          priority: 'important',
          title: senderMember?.name ?? 'New message',
          body: '📷 Sent a photo',
          actionRoute: `/dm?userId=${myUserId}`,
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send image' });
    } finally {
      set({ sending: false });
    }
  },

  markThreadRead: async (myUserId: string, otherUserId: string) => {
    const conversationId = getConversationId(myUserId, otherUserId);
    try {
      await supabase
        .from('direct_message')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', myUserId)
        .is('read_at', null);

      set((state) => ({
        messages: state.messages.map((m) =>
          m.recipient_id === myUserId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
        ),
      }));
    } catch (err) {
      console.error('Failed to mark thread as read:', err);
    }
  },

  subscribeToThread: (myUserId: string, otherUserId: string) => {
    const conversationId = getConversationId(myUserId, otherUserId);

    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_message', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as DirectMessage;
            const signedUrl = raw.image_path ? await getSignedDmImageUrl(raw.image_path) : null;
            const newMsg = { ...raw, signed_image_url: signedUrl };

            set((state) => ({
              messages: [
                ...state.messages.filter((m) => !(m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id && m.content === newMsg.content)),
                newMsg,
              ],
            }));
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              messages: state.messages.map((m) => (m.id === payload.new.id ? { ...m, ...(payload.new as DirectMessage) } : m)),
            }));
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribeFromThread: () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null });
  },

  subscribeToInbox: (myUserId: string, familyId: string) => {
    const channel = supabase
      .channel(`dm-inbox-${myUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_message', filter: `family_id=eq.${familyId}` },
        async (payload) => {
          const raw = payload.new as DirectMessage;
          if (raw.sender_id !== myUserId) return;
            // Simplest correct approach: just reload the inbox summary on any relevant new message
            get().loadConversations(familyId, myUserId);

            const { data: member } = await supabase
            .from('member')
            .select('name')
            .eq('family_id', familyId)
            .eq('user_id', raw.sender_id)
            .maybeSingle();

            useToastStore.getState().showToast({
                title: member?.name ?? 'New message',
                body: raw.image_path ? '📷 Sent a photo' : raw.content ?? '',
                variant: 'info',
                actionRoute: `/dm?userId=${raw.sender_id}`,
            });
        }
      )
      .subscribe();

    set({ inboxChannel: channel });
  },

    subscribeToToasts: (familyId: string, myUserId: string) => {
        const topic = `dm-toast-${myUserId}`;

        const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${topic}`);
        if (existing) {
            supabase.removeChannel(existing);
        }
        const channel = supabase
            .channel(topic)
            .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'direct_message', filter: `family_id=eq.${familyId}` },
            async (payload) => {
                const raw = payload.new as DirectMessage;
                if (raw.recipient_id !== myUserId) return; // only toast for messages sent TO me
                
                get().loadConversations(familyId, myUserId);

                const { data: member } = await supabase
                .from('member')
                .select('name')
                .eq('family_id', familyId)
                .eq('user_id', raw.sender_id)
                .maybeSingle();

                useToastStore.getState().showToast({
                    title: member?.name ?? 'New message',
                    body: raw.image_path ? '📷 Sent a photo' : raw.content ?? '',
                    variant: 'info',
                    actionRoute: `/dm/${raw.sender_id}`,
                });
            }
            )
            .subscribe();

        set({ toastChannel: channel });
    },

    unsubscribeFromToasts: () => {
        const { toastChannel } = get();
        if (toastChannel) supabase.removeChannel(toastChannel);
        set({ toastChannel: null });
    },

    unsubscribeFromInbox: () => {
        const { inboxChannel } = get();
        if (inboxChannel) supabase.removeChannel(inboxChannel);
        set({ inboxChannel: null });
    },
}));