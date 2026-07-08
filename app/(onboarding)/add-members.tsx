import { useState } from 'react';
import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useColors } from '@/hooks/use-colors';

type MemberRole = 'admin' | 'coparent' | 'member' | 'child';
type AgeBand = 'toddler' | 'child' | 'preteen' | 'teen' | 'adult';

export default function AddMembersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addMember, removeMember, nextStep, members } = useOnboardingStore();

  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [ageBand, setAgeBand] = useState<AgeBand | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles: MemberRole[] = ['admin', 'coparent', 'member', 'child'];
  const ageBands: AgeBand[] = ['toddler', 'child', 'preteen', 'teen', 'adult'];

  const handleAddMember = () => {
    setError(null);

    if (!name.trim()) {
      setError('Member name is required');
      return;
    }

    addMember({
      name,
      role,
      age_band: ageBand,
    });

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
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-6 items-center">
            <Text className="text-3xl font-bold text-foreground mb-2">Add Family Members</Text>
            <Text className="text-base text-muted text-center">
              Who's in your family?
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="mb-6 p-4 bg-error/10 rounded-lg border border-error/20">
              <Text className="text-sm text-error font-medium">{error}</Text>
            </View>
          )}

          {/* Add Member Form */}
          <View className="mb-6 bg-surface rounded-lg p-4 border border-border">
            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Name</Text>
              <TextInput
                placeholder="Member name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground text-base"
                style={{
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                }}
              />
            </View>

            {/* Role Selector */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Role</Text>
              <View className="flex-row flex-wrap gap-2">
                {roles.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={{
                      backgroundColor: role === r ? colors.primary : colors.background,
                      borderColor: colors.border,
                    }}
                    className="border rounded-full px-3 py-2"
                  >
                    <Text
                      style={{
                        color: role === r ? colors.background : colors.foreground,
                      }}
                      className="text-xs font-semibold capitalize"
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Age Band Selector (for children) */}
            {(role === 'child' || role === 'member') && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-foreground mb-2">Age Band</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ageBands.map((ab) => (
                    <Pressable
                      key={ab}
                      onPress={() => setAgeBand(ageBand === ab ? undefined : ab)}
                      style={{
                        backgroundColor: ageBand === ab ? colors.primary : colors.background,
                        borderColor: colors.border,
                      }}
                      className="border rounded-full px-3 py-2"
                    >
                      <Text
                        style={{
                          color: ageBand === ab ? colors.background : colors.foreground,
                        }}
                        className="text-xs font-semibold capitalize"
                      >
                        {ab}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Add Button */}
            <Pressable
              onPress={handleAddMember}
              style={{ backgroundColor: colors.primary }}
              className="rounded-lg py-3 items-center"
            >
              <Text className="text-sm font-semibold text-background">Add Member</Text>
            </Pressable>
          </View>

          {/* Members List */}
          {members.length > 0 && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">Family Members</Text>
              <FlatList
                scrollEnabled={false}
                data={members}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View className="flex-row items-center justify-between bg-surface rounded-lg p-3 mb-2 border border-border">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{item.name}</Text>
                      <Text className="text-xs text-muted capitalize">
                        {item.role} {item.age_band ? `• ${item.age_band}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeMember(index)}
                      className="px-3 py-2"
                    >
                      <Text className="text-base text-error">✕</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>
          )}

          {/* Continue Button */}
           <TouchableOpacity
           onPress={handleContinue}
            disabled={loading}
          className='py-4 items-center bg-primary rounded-lg mb-8'>
              {loading ? (
                <ActivityIndicator color={"#fff"} />
              ) : (
                <Text className='text-foreground text-base font-semibold'>
                  Continue
                </Text>
              )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
