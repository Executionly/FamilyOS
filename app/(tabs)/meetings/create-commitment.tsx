import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useCommitmentStore } from '@/lib/stores/commitment-store';
import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/hooks/use-auth';

export default function CreateCommitmentScreen() {
  const router = useRouter();
  const colors = useColors();
  const {user} = useAuth()
  const { family, members } = useFamilyStore();
  const { createCommitment, loading } = useCommitmentStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleDateChange = (event: any, date?: Date) => {
    if (date) setDueDate(date);
    setShowDatePicker(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !family?.id) {
      alert('Please enter a commitment title');
      return;
    }

    try {
      await createCommitment(family.id, family.created_by, {
        title,
        description: description || undefined,
        assigned_to: selectedAssignee || undefined,
        due_date: dueDate?.toISOString(),
        status: 'open',
        priority,
        meeting_id: null,
      });

      router.back();
    } catch (error) {
      console.error('Error creating commitment:', error);
      alert('Failed to create commitment');
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Add Commitment" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">

          {/* Title */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Title *</Text>
            <TextInput
              placeholder="e.g., Plan family vacation"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.muted}
              className="px-4 py-3 rounded-lg border border-border text-foreground"
              style={{ borderColor: colors.border, color: colors.foreground }}
            />
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Description</Text>
            <TextInput
              placeholder="Add details..."
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              className="px-4 py-3 rounded-lg border border-border text-foreground"
              style={{ borderColor: colors.border, color: colors.foreground }}
            />
          </View>

          {/* Assignee */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Assign To</Text>
            <FlatList
              scrollEnabled={false}
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedAssignee(item.id)}
                  className={`p-3 rounded-lg border mb-2 ${
                    selectedAssignee === item.id ? 'border-primary' : 'border-border'
                  }`}
                  style={{
                    backgroundColor: selectedAssignee === item.id ? colors.primary : colors.surface,
                  }}
                >
                  <Text
                    className={selectedAssignee === item.id ? 'text-white font-semibold' : 'text-foreground'}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          {/* Priority */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-3">Priority</Text>
            <View className="flex-row gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    priority === p ? 'border-primary' : 'border-border'
                  }`}
                  style={{
                    backgroundColor: priority === p ? colors.primary : colors.surface,
                  }}
                >
                  <Text
                    className={`text-center font-semibold capitalize ${
                      priority === p ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-foreground mb-2">Due Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="px-4 py-3 rounded-lg border border-border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <Text className="text-foreground">
                {dueDate ? dueDate.toLocaleDateString() : 'Select a date'}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Create Button */}
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            className="py-4 rounded-lg items-center"
            style={{ backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">Create Commitment</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
