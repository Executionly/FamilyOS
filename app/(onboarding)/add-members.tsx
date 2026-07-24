import { useState, useRef } from 'react';
import {
  ScrollView, Text, View, TextInput, Pressable,
  TouchableOpacity, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useColors } from '@/hooks/use-colors';

// ── Types ─────────────────────────────────────────────────────

type MemberRole = 'admin' | 'coparent' | 'member' | 'child' | string;
type AgeBand = 'toddler' | 'child' | 'preteen' | 'teen' | 'adult' | string;

const PRESET_ROLES: MemberRole[] = ['admin', 'coparent', 'member', 'child'];
const PRESET_AGE_BANDS: AgeBand[] = ['toddler', 'child', 'preteen', 'teen', 'adult'];

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  admin: 'shield-checkmark-outline',
  coparent: 'people-outline',
  member: 'person-outline',
  child: 'happy-outline',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#0a7ea4',
  coparent: '#7C3AED',
  member: '#16A34A',
  child: '#D97706',
};

// ── Custom input modal ────────────────────────────────────────

function CustomInputModal({
  visible,
  title,
  placeholder,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
          onPress={onClose}
        >
          <Pressable
            style={{
              backgroundColor: '#fff', borderRadius: 20, padding: 24,
              shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 }, elevation: 10,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#11181C', marginBottom: 4 }}>
              {title}
            </Text>
            <Text style={{ fontSize: 13, color: '#687076', marginBottom: 16 }}>
              Type a custom value and tap Add.
            </Text>
            <TextInput
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={setValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              style={{
                borderWidth: 1, borderColor: colors.border,
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 15, color: '#11181C',
                backgroundColor: colors.surface,
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  alignItems: 'center', borderWidth: 1, borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ fontWeight: '600', color: '#687076' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  alignItems: 'center', backgroundColor: colors.primary,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Chip selector ─────────────────────────────────────────────

function ChipSelector({
  options,
  selected,
  onSelect,
  onAddCustom,
  colorMap,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onAddCustom: () => void;
  colorMap?: Record<string, string>;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const active = selected === opt;
        const accent = colorMap?.[opt] || colors.primary;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 20, borderWidth: 1.5,
              backgroundColor: active ? accent : '#fff',
              borderColor: active ? accent : '#E5E7EB',
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}
          >
            {ROLE_ICONS[opt] && (
              <Ionicons
                name={ROLE_ICONS[opt]}
                size={13}
                color={active ? '#fff' : '#687076'}
              />
            )}
            <Text style={{
              fontSize: 13, fontWeight: '600', textTransform: 'capitalize',
              color: active ? '#fff' : '#374151',
            }}>
              {opt}
            </Text>
          </Pressable>
        );
      })}

      {/* Custom chip */}
      <Pressable
        onPress={onAddCustom}
        style={{
          paddingHorizontal: 14, paddingVertical: 8,
          borderRadius: 20, borderWidth: 1.5,
          borderColor: '#E5E7EB', borderStyle: 'dashed',
          flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: '#F9FAFB',
        }}
      >
        <Ionicons name="add-outline" size={14} color="#687076" />
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#687076' }}>Custom</Text>
      </Pressable>
    </View>
  );
}

// ── Member card ───────────────────────────────────────────────

function MemberCard({
  name, role, ageBand, onRemove,
}: {
  name: string; role: string; ageBand?: string; onRemove: () => void;
}) {
  const accent = ROLE_COLORS[role] || '#687076';
  const icon = ROLE_ICONS[role] || 'person-outline';

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#fff', borderRadius: 14,
      padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: '#E5E7EB',
      shadowColor: '#000', shadowOpacity: 0.03,
      shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    }}>
      {/* Avatar */}
      <View style={{
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: `${accent}18`,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
      }}>
        <Ionicons name={icon as any} size={20} color={accent} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#11181C' }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 2,
            borderRadius: 20, backgroundColor: `${accent}18`,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: accent, textTransform: 'capitalize' }}>
              {role}
            </Text>
          </View>
          {ageBand && (
            <View style={{
              paddingHorizontal: 8, paddingVertical: 2,
              borderRadius: 20, backgroundColor: '#F1F5F9',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'capitalize' }}>
                {ageBand}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Remove */}
      <Pressable
        onPress={onRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => ({
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: pressed ? '#FEE2E2' : '#FEF2F2',
          justifyContent: 'center', alignItems: 'center',
        })}
      >
        <Ionicons name="close" size={16} color="#EF4444" />
      </Pressable>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function AddMembersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addMember, removeMember, nextStep, members } = useOnboardingStore();

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [ageBand, setAgeBand] = useState<AgeBand | undefined>(undefined);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [customAgeBands, setCustomAgeBands] = useState<string[]>([]);

  // Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAgeBandModal, setShowAgeBandModal] = useState(false);

  // Submit state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRoles = [...PRESET_ROLES, ...customRoles];
  const allAgeBands = [...PRESET_AGE_BANDS, ...customAgeBands];
  const showAgeBand = ['child', 'member', ...customRoles].includes(role) ||
    !PRESET_ROLES.includes(role);

  const handleAddMember = () => {
    setError(null);
    if (!name?.trim()) {
      setError('Member name is required');
      return;
    }
    addMember({ name: name.trim(), role, age_band: ageBand });
    setName('');
    setRole('member');
    setAgeBand(undefined);
  };

  const handleContinue = async () => {
    if (members.length === 0) {
      setError('Please add at least one family member');
      return;
    }
    setLoading(true);
    try {
      nextStep();
      router.push('/(onboarding)/invite-coparent');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      {/* Custom modals */}
      <CustomInputModal
        visible={showRoleModal}
        title="Custom Role"
        placeholder="e.g. Grandparent, Guardian..."
        onConfirm={(val) => {
          if (!allRoles.includes(val)) setCustomRoles((p) => [...p, val]);
          setRole(val);
        }}
        onClose={() => setShowRoleModal(false)}
      />
      <CustomInputModal
        visible={showAgeBandModal}
        title="Custom Age Band"
        placeholder="e.g. Young Adult, Senior..."
        onConfirm={(val) => {
          if (!allAgeBands.includes(val)) setCustomAgeBands((p) => [...p, val]);
          setAgeBand(val);
        }}
        onClose={() => setShowAgeBandModal(false)}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32,
          alignItems: 'center',
        }}>
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: 'rgba(255,255,255,0.18)',
            justifyContent: 'center', alignItems: 'center', marginBottom: 14,
          }}>
            <Ionicons name="people" size={28} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>
            Who's in your family?
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', marginTop: 6 }}>
            Add each member — you can always update this later.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>

          {/* ── Error ──────────────────────────────────────── */}
          {error && (
            <View style={{
              backgroundColor: '#FEE2E2', borderRadius: 10,
              padding: 12, marginBottom: 16,
              borderWidth: 1, borderColor: '#FECACA',
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          )}

          {/* ── Add member form ─────────────────────────────── */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 16, padding: 18,
            borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20,
            shadowColor: '#000', shadowOpacity: 0.04,
            shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#11181C', marginBottom: 14 }}>
              Add a Member
            </Text>

            {/* Name */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#687076', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Full Name
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              borderWidth: 1, borderColor: '#E5E7EB',
              borderRadius: 10, paddingHorizontal: 12,
              backgroundColor: colors.surface, marginBottom: 18,
            }}>
              <Ionicons name="person-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="e.g. Sarah, Dad, Grandma..."
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#11181C' }}
              />
            </View>

            {/* Role */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#687076', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Role
            </Text>
            <View style={{ marginBottom: 18 }}>
              <ChipSelector
                options={allRoles}
                selected={role}
                onSelect={setRole}
                onAddCustom={() => setShowRoleModal(true)}
                colorMap={ROLE_COLORS}
              />
            </View>

            {/* Age Band */}
            {showAgeBand && (
              <>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#687076', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Age Band
                  <Text style={{ fontSize: 11, fontWeight: '400', color: '#9CA3AF' }}> (optional)</Text>
                </Text>
                <View style={{ marginBottom: 18 }}>
                  <ChipSelector
                    options={allAgeBands}
                    selected={ageBand || ''}
                    onSelect={(v) => setAgeBand(ageBand === v ? undefined : v)}
                    onAddCustom={() => setShowAgeBandModal(true)}
                  />
                </View>
              </>
            )}

            {/* Add button */}
            <TouchableOpacity
              onPress={handleAddMember}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8, paddingVertical: 8,
                alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: 8,
              }}
            >
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Add Member</Text>
            </TouchableOpacity>
          </View>

          {/* ── Members list ────────────────────────────────── */}
          {members.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#11181C' }}>
                  {members.length} member{members.length !== 1 ? 's' : ''} added
                </Text>
              </View>
              {members.map((item, index) => (
                <MemberCard
                  key={index}
                  name={item.name}
                  role={item.role}
                  ageBand={item.age_band}
                  onRemove={() => removeMember(index)}
                />
              ))}
            </View>
          )}

          {/* ── Empty nudge ──────────────────────────────────── */}
          {members.length === 0 && (
            <View style={{
              backgroundColor: '#F8FAFC', borderRadius: 14,
              padding: 20, alignItems: 'center',
              borderWidth: 1, borderColor: '#E2E8F0',
              borderStyle: 'dashed', marginBottom: 20,
            }}>
              <Ionicons name="people-outline" size={32} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                No members added yet.{'\n'}Add at least one to continue.
              </Text>
            </View>
          )}

          {/* ── Continue ─────────────────────────────────────── */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading || members.length === 0}
            style={{
              backgroundColor: members.length === 0 ? '#CBD5E1' : colors.primary,
              borderRadius: 14, paddingVertical: 16,
              alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}