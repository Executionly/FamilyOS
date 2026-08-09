import { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyChatStore, PendingAction } from '@/lib/stores/family-chat-store';
import { isAdminAccess } from '@/utils';

const NEEDS_ASSIGNEE = new Set(['create_chore', 'create_commitment']);

export function ActionCard({ action }: { action: PendingAction }) {
  const colors = useColors();
  const { members, currentMember } = useFamilyStore();
  const { user } = useAuthStore();
  const { resolveAction } = useFamilyChatStore();

  
  const isEditor = isAdminAccess(currentMember?.role);
  const needsAssignee = NEEDS_ASSIGNEE.has(action.action_type);

  // Try to pre-select whoever the AI's name guess matched, if any
  const guessedName = (action.payload as any)?.assigned_to_member_name as string | undefined;
  const guessedMember = guessedName
    ? members?.find((m) => m.name.toLowerCase() === guessedName.toLowerCase())
    : undefined;

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(guessedMember?.id ?? null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [resolving, setResolving] = useState(false);

  const selectedMember = members?.find((m) => m.id === selectedMemberId);

  const handleApprove = async () => {
    if (!user?.id) return;
    setResolving(true);
    try {
      await resolveAction(action.id, 'approved', user.id, needsAssignee ? { assigned_member_id: selectedMemberId } : undefined);
    } catch {
      // error surfaced elsewhere
    } finally {
      setResolving(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.id) return;
    setResolving(true);
    try {
      await resolveAction(action.id, 'rejected', user.id);
    } finally {
      setResolving(false);
    }
  };

   if (!isEditor) {
    // Read-only view — they can see what's proposed, but can't act on it
    return (
      <View className="mt-2 rounded-2xl border border-border bg-surface p-3.5">
        <Text className="text-sm text-foreground">{action.summary}</Text>
        <Text className="mt-2 text-[11px] text-muted">Waiting on an admin to review this</Text>
      </View>
    );
  }

  return (
    <View className="mt-2 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
      <Text className="mb-3 text-sm text-foreground">{action.summary}</Text>

      {needsAssignee && (
        <Pressable
          onPress={() => setPickerVisible(true)}
          className="mb-3 flex-row items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5"
        >
          <View className="flex-row items-center">
            <Ionicons name="person-outline" size={14} color={colors.muted} />
            <Text className="ml-2 text-xs font-medium text-foreground">
              {selectedMember ? selectedMember.name : 'Unassigned — tap to assign'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>
      )}

      <View className="flex-row gap-2">
        <Pressable onPress={handleSkip} disabled={resolving} className="flex-1 items-center rounded-lg border border-border py-2">
          <Text className="text-xs font-semibold text-muted">Skip</Text>
        </Pressable>
        <Pressable onPress={handleApprove} disabled={resolving} className="flex-1 items-center rounded-lg bg-primary py-2">
          <Text className="text-xs font-bold text-white">Approve</Text>
        </Pressable>
      </View>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-8" onPress={() => setPickerVisible(false)}>
          <Pressable className="w-full max-h-[60%] rounded-2xl bg-background p-4" onPress={(e) => e.stopPropagation()}>
            <Text className="mb-3 text-sm font-bold text-foreground">Assign to</Text>
            <FlatList
              data={[{ id: null, name: 'Unassigned' } as any, ...(members ?? [])]}
              keyExtractor={(item) => item.id ?? 'unassigned'}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setSelectedMemberId(item.id); setPickerVisible(false); }}
                  className="flex-row items-center justify-between py-3 border-b border-border"
                >
                  <Text className="text-sm text-foreground">{item.name}</Text>
                  {selectedMemberId === item.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}