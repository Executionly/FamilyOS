import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import * as ImagePicker from 'expo-image-picker';
import { notifyFamily } from '../services/notify';
import { useToastStore } from './toast-store';
import { checkStorageBeforeUpload, getFileSizeBytes, recordUpload, StorageLimitError } from '@/utils/storage-gate';


async function getSignedImageUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('chat-images')
      .createSignedUrl(path, 60 * 60 * 24); // 24h — chat images get viewed well after sending
    if (error) throw error;
    return data.signedUrl;
  } catch {
    return null;
  }
}


export interface GroupChatMessage {
    id: string;
    family_id: string;
    sender_id: string;
    content: string | null;
    image_path: string | null; 
    signed_image_url?: string | null;
    created_at: string;
    sender?: { name: string };
}

interface GroupChatState {
    messages: GroupChatMessage[];
    loading: boolean;
    sending: boolean;
    error: string | null;
    channel: ReturnType<typeof supabase.channel> | null;
    toastChannel: ReturnType<typeof supabase.channel> | null;

    loadMessages: (familyId: string) => Promise<void>;
    sendMessage: (familyId: string, senderId: string, content: string) => Promise<void>;
    sendImage: (familyId: string, senderId: string) => Promise<void>;
    subscribeToChat: (familyId: string) => void;
    subscribeToToasts: (familyId: string, myUserId: string) => void;
    unsubscribe: () => void;
    unsubscribeFromToasts: () => void;

    storageLimitError: StorageLimitError | null
    upgradeRequired: boolean;
    upgradeReason: 'ai_feature' | 'quota_exceeded' | null;
    clearStorageLimitError: () => void;
}

export const useGroupChatStore = create<GroupChatState>((set, get) => ({
    messages: [],
    loading: false,
    sending: false,
    error: null,
    channel: null,
    toastChannel: null,
    upgradeRequired: false,
    upgradeReason: null,
    storageLimitError: null,

    clearStorageLimitError: () => set({ storageLimitError: null }),

    subscribeToToasts: (familyId: string, myUserId: string) => {
    const channel = supabase
        .channel(`group-chat-toast-${familyId}`)
        .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_group_chat_messages', filter: `family_id=eq.${familyId}` },
        async (payload) => {
            const raw = payload.new as GroupChatMessage;
            if (raw.sender_id === myUserId) return; // don't toast yourself
            get().loadMessages(familyId);
            
            const { data: member } = await supabase
            .from('member')
            .select('name')
            .eq('family_id', familyId)
            .eq('user_id', raw.sender_id)
            .maybeSingle();

            useToastStore.getState().showToast({
                title: member?.name ?? 'Family Chat',
                body: raw.image_path ? '📷 Sent a photo' : raw.content ?? '',
                variant: 'info',
                actionRoute: '/group-chat',
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

    loadMessages: async (familyId: string) => {
        set({ loading: true, error: null });
        try {
            const [{ data: messages, error: msgError }, { data: members, error: memError }] = await Promise.all([
            supabase
                .from('family_group_chat_messages')
                .select('*')
                .eq('family_id', familyId)
                .order('created_at', { ascending: true })
                .limit(100),
            supabase
                .from('member')
                .select('user_id, name')
                .eq('family_id', familyId),
            ]);

            if (msgError) throw msgError;
            if (memError) throw memError;

            const nameByUserId = new Map((members ?? []).map((m) => [m.user_id, m.name]));

            // Resolve signed URLs for every message with an image, in parallel
            const enriched = await Promise.all(
            (messages ?? []).map(async (m) => ({
                ...m,
                member: { name: nameByUserId.get(m.sender_id) ?? 'Family member' },
                signed_image_url: m.image_path ? await getSignedImageUrl(m.image_path) : null,
            }))
            );

            set({ messages: enriched, loading: false });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to load chat', loading: false });
        }
    },

    sendMessage: async (familyId, senderId, content) => {
        if (!content.trim()) return;
        set({ sending: true, error: null });

        const optimistic: GroupChatMessage = {
            id: `temp-${Date.now()}`,
            family_id: familyId,
            sender_id: senderId,
            content,
            image_path: null,
            created_at: new Date().toISOString(),
        };
        set((state) => ({ messages: [...state.messages, optimistic] }));

        try {
            const { error } = await supabase.from('family_group_chat_messages').insert([{
                family_id: familyId, sender_id: senderId, content,
            }]);
            if (error) throw error;

            await notifyFamily({
                familyId,
                type: 'group_chat_message',
                priority: 'informational',
                title: 'New family message',
                body: content.length > 60 ? `${content.slice(0, 60)}...` : content,
                actionLabel: 'View Chat',
                actionRoute: '/group-chat',
                excludeUserId: senderId,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send message' });
            set((state) => ({ messages: state.messages.filter((m) => m.id !== optimistic.id) }));
        } finally {
            set({ sending: false });
        }
    },

    sendImage: async (familyId, senderId) => {
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
            const storagePath = `${familyId}/${Date.now()}_${fileName}`;

            const fileSizeBytes = await getFileSizeBytes(asset.uri);
            await checkStorageBeforeUpload(familyId, fileSizeBytes);

            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                name: fileName,
                type: mimeType,
            } as any);
            
            const { error: uploadError } = await supabase.storage
            .from('chat-images')
            .upload(storagePath, formData, {
                contentType: mimeType,
                upsert: false,
            });
            if (uploadError) throw uploadError;

            await recordUpload({
                familyId, bucket: 'chat-images', storagePath, sizeBytes: fileSizeBytes,
                sourceType: 'group_chat', createdBy: senderId,
            });

            const { error } = await supabase.from('family_group_chat_messages').insert([{
                family_id: familyId, sender_id: senderId, image_path: storagePath,
            }]);
            if (error) throw error;

            await notifyFamily({
                familyId,
                type: 'group_chat_message',
                priority: 'informational',
                title: 'New family message',
                body: '📷 Sent a photo',
                actionLabel: 'View Chat',
                actionRoute: '/group-chat',
                excludeUserId: senderId,
            });
        } catch (error) {
             if (error instanceof StorageLimitError) {
                set({ storageLimitError: error, sending: false });
                return;
            }
            set({ error: error instanceof Error ? error.message : 'Failed to send image' });
        } finally {
            set({ sending: false });
        }
    },

    subscribeToChat: (familyId: string) => {
        let nameByUserId = new Map<string, string>();
        supabase.from('member').select('user_id, name').eq('family_id', familyId)
            .then(({ data }) => {
            nameByUserId = new Map((data ?? []).map((m) => [m.user_id, m.name]));
            });

        const channel = supabase
            .channel(`group-chat-${familyId}`)
            .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'family_group_chat_messages', filter: `family_id=eq.${familyId}` },
            async (payload) => {
                const raw = payload.new as GroupChatMessage;
                const signedUrl = raw.image_path ? await getSignedImageUrl(raw.image_path) : null;

                const newMsg = {
                    ...raw,
                    member: { name: nameByUserId.get(raw.sender_id) ?? 'Family member' },
                    signed_image_url: signedUrl,
                };

                set((state) => ({
                messages: [
                    ...state.messages.filter((m) => !(m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id && m.image_path === newMsg.image_path && m.content === newMsg.content)),
                    newMsg,
                ],
                }));
            }
            )
            .subscribe();

        set({ channel });
    },

    unsubscribe: () => {
        const { channel } = get();
        if (channel) supabase.removeChannel(channel);
        set({ channel: null });
    },
}));