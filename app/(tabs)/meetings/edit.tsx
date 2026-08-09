import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useMeetingStore } from '@/lib/stores/meeting-store';

const FREQUENCIES = ['once', 'daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quaterly', 'annually'] as const;
const DURATIONS = [30, 45, 60, 90];

export default function MeetingEditScreen() {
  const router = useRouter();
  const colors = useColors();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const { meetings, updateMeeting, loading, error } = useMeetingStore();

  const meeting = meetings.find((m) => m.id === meetingId);

  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]>('weekly');
  const [meetingLink, setMeetingLink] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pre-fill from the existing meeting once found
  useEffect(() => {
    if (!meeting) return;
    setTitle(meeting.title ?? '');
    const scheduled = new Date(meeting.scheduled_date);
    setSelectedDate(scheduled);
    setSelectedTime(scheduled);
    setDuration(meeting.duration_minutes ?? 60);
    setFrequency((meeting.occurrence as (typeof FREQUENCIES)[number]) ?? 'weekly');
    setMeetingLink(meeting.meeting_link ?? '');
  }, [meeting?.id]);

  const handleDateChange = (event: any, date?: Date) => {
    if (date) setSelectedDate(date);
    if (Platform.OS !== 'ios') setShowDatePicker(false);
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (date) setSelectedTime(date);
    if (Platform.OS !== 'ios') setShowTimePicker(false);
  };

  const handleSave = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    if (!meetingId) return;

    try {
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(selectedTime.getHours());
      scheduledDate.setMinutes(selectedTime.getMinutes());
      scheduledDate.setSeconds(0);

      await updateMeeting(meetingId, {
        title: title || undefined,
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: duration,
        occurrence: frequency,
        meeting_link: meetingLink || undefined,
      });

      setSuccessMessage('Meeting updated');
      setTimeout(() => {
        router.back();
      }, 800);
    } catch {
      // error already in store
    }
  };

  const displayError = validationError || error;

  if (!meeting) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Edit Meeting" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Edit Meeting" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">
          {displayError && (
            <View className="mb-6 rounded-lg border border-error/20 bg-error/10 p-4">
              <Text className="text-sm font-medium text-error">{displayError}</Text>
            </View>
          )}
          {successMessage && (
            <View className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <Text className="text-sm font-medium text-emerald-700">{successMessage}</Text>
            </View>
          )}

          {/* Title */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-foreground">Meeting Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Weekly Family Check-in"
              placeholderTextColor={colors.muted}
              className="rounded-lg border border-border px-4 py-3 text-foreground"
              style={{ borderColor: colors.border, color: colors.foreground }}
            />
          </View>

          {/* Date */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-foreground">Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="rounded-lg border border-border px-4 py-3"
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

          {/* Time */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-foreground">Time</Text>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              className="rounded-lg border border-border px-4 py-3"
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

          {/* Occurrence */}
          <View className="mb-6">
            <Text className="mb-3 text-sm font-semibold text-foreground">Occurrence</Text>
            <View className="flex-row flex-wrap gap-2">
              {FREQUENCIES.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFrequency(f)}
                  className={`min-w-[70px] flex-1 rounded-lg border px-3 py-2 ${
                    frequency === f ? 'border-primary' : 'border-border'
                  }`}
                  style={{ backgroundColor: frequency === f ? colors.primary : colors.surface }}
                >
                  <Text
                    className={`text-center text-xs font-semibold capitalize ${
                      frequency === f ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Duration */}
          <View className="mb-8">
            <Text className="mb-3 text-sm font-semibold text-foreground">Duration</Text>
            <View className="flex-row gap-2">
              {DURATIONS.map((min) => (
                <Pressable
                  key={min}
                  onPress={() => setDuration(min)}
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    duration === min ? 'border-primary' : 'border-border'
                  }`}
                  style={{ backgroundColor: duration === min ? colors.primary : colors.surface }}
                >
                  <Text className={`text-center font-semibold ${duration === min ? 'text-white' : 'text-foreground'}`}>
                    {min}m
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Meeting Link */}
          <View className="mb-8">
            <Text className="mb-2 text-sm font-semibold text-foreground">Meeting Link</Text>
            <TextInput
              value={meetingLink}
              onChangeText={setMeetingLink}
              placeholder="e.g., google-meet link"
              placeholderTextColor={colors.muted}
              className="rounded-lg border border-border px-4 py-3 text-foreground"
              style={{ borderColor: colors.border, color: colors.foreground }}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={loading}
            className="items-center rounded-lg py-4"
            style={{ backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-lg font-semibold text-white">Save Changes</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}