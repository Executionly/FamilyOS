import { ScrollView, Text, View, Pressable, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMeetingStore } from '@/lib/stores/meeting-store';
import { generateMeetingAgenda } from '@/lib/services/meeting-ai';
import { AppHeader } from '@/components/app-header';

export default function MeetingSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family } = useFamilyStore();
  const { createMeeting, addAgendaItem } = useMeetingStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');


  const handleDateChange = (event: any, date?: Date) => {
    if (date) setSelectedDate(date);
    if (Platform.OS !== 'ios') setShowDatePicker(false);
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (date) setSelectedTime(date);
    if (Platform.OS !== 'ios') setShowTimePicker(false);
  };

  const handleGenerateAgenda = async () => {
    if (!family?.id) return;

    setIsGenerating(true);
    try {
      setGeneratingMessage('Reviewing your commitments...');
      
      const result = await generateMeetingAgenda(family.id,duration,);

      if (!result.success) {
        throw new Error('Failed to generate agenda');
      }

      setGeneratingMessage('Crafting your agenda...');

      // Create the meeting
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(selectedTime.getHours());
      scheduledDate.setMinutes(selectedTime.getMinutes());
      scheduledDate.setSeconds(0);

      const meeting = await createMeeting(family.id, {
        title: title || `Family Meeting — ${selectedDate.toLocaleDateString()}`,
        description: 'AI-generated agenda',
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: duration,
        status: 'scheduled',
      });

      // Add agenda items
      for (const item of result.agenda) {
        await addAgendaItem(meeting.id, {
          title: item.title,
          description: item.description,
          order: item.order,
          status: 'pending',
        });
      }

      setGeneratingMessage('');
      router.replace('/(tabs)/meetings');
      // router.push(`/meetings/run?meetingId=${meeting.id}`);
    } catch (error) {
      console.error('Error generating agenda:', error);
      setGeneratingMessage('');
      alert('Failed to generate agenda. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.foreground, marginTop: 24, textAlign: 'center' }}>
            {generatingMessage || 'Generating your agenda...'}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8, textAlign: 'center' }}>
            This usually takes 10–20 seconds.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Set Up Meeting" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">

          {/* Meeting Title */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Meeting Title (Optional)</Text>
            <TextInput
              placeholder="e.g., Weekly Family Check-in"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.muted}
              className="px-4 py-3 rounded-lg border border-border text-foreground"
              style={{ borderColor: colors.border, color: colors.foreground }}
            />
          </View>

          {/* Date Picker */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="px-4 py-3 rounded-lg border border-border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <Text className="text-foreground">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Time Picker */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Time</Text>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              className="px-4 py-3 rounded-lg border border-border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <Text className="text-foreground">
                {selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Duration Selector */}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-foreground mb-3">Duration</Text>
            <View className="flex-row gap-2">
              {[30, 45, 60, 90].map((min) => (
                <Pressable
                  key={min}
                  onPress={() => setDuration(min)}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    duration === min ? 'border-primary' : 'border-border'
                  }`}
                  style={{
                    backgroundColor: duration === min ? colors.primary : colors.surface,
                  }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      duration === min ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {min}m
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Generate Agenda Button */}
          <Pressable
            onPress={handleGenerateAgenda}
            disabled={isGenerating}
            className="py-4 rounded-lg items-center"
            style={{ backgroundColor: colors.primary, opacity: isGenerating ? 0.6 : 1 }}
          >
            <Text className="text-white font-semibold text-lg">Generate AI Agenda</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
