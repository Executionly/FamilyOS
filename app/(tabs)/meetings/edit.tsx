import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useMeetingStore } from '@/lib/stores/meeting-store';

const FREQUENCIES = [
  { id: 'once', label: 'Once', icon: 'calendar-outline' },
  { id: 'daily', label: 'Daily', icon: 'today-outline' },
  { id: 'weekly', label: 'Weekly', icon: 'calendar' },
  { id: 'biweekly', label: 'Bi-Weekly', icon: 'repeat' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-number-outline' },
  { id: 'bimonthly', label: 'Bi-Monthly', icon: 'bookmarks-outline' },
  { id: 'quaterly', label: 'Quarterly', icon: 'layers-outline' },
  { id: 'annually', label: 'Annually', icon: 'ribbon-outline' },
] as const;

const DURATIONS = [
  { value: 30, label: '30m', desc: 'Quick sync' },
  { value: 45, label: '45m', desc: 'Standard' },
  { value: 60, label: '60m', desc: 'Deep dive' },
  { value: 90, label: '90m', desc: 'Workshop' },
];

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
  const [frequency, setFrequency] = useState<typeof FREQUENCIES[number]['id']>('weekly');
  const [meetingLink, setMeetingLink] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isLinkFocused, setIsLinkFocused] = useState(false);

  useEffect(() => {
    if (!meeting) return;
    setTitle(meeting.title ?? '');
    const scheduled = new Date(meeting.scheduled_date);
    setSelectedDate(scheduled);
    setSelectedTime(scheduled);
    setDuration(meeting.duration_minutes ?? 60);
    setFrequency((meeting.occurrence as typeof FREQUENCIES[number]['id']) ?? 'weekly');
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
    if (!title.trim()) {
      setValidationError('Please enter a meeting title');
      return;
    }

    try {
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(selectedTime.getHours());
      scheduledDate.setMinutes(selectedTime.getMinutes());
      scheduledDate.setSeconds(0);

      await updateMeeting(meetingId, {
        title: title.trim(),
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: duration,
        occurrence: frequency,
        meeting_link: meetingLink.trim() || undefined,
      });

      setSuccessMessage('Meeting updated successfully');
      setTimeout(() => {
        router.back();
      }, 800);
    } catch {
      // error already handled by store
    }
  };

  const displayError = validationError || error;

  if (!meeting) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Edit Meeting" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Edit Meeting" showBack />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-5 pt-4">
          {displayError && (
            <View className="mb-6 flex-row items-center rounded-2xl border border-error/20 bg-error/10 p-4">
              <View className="bg-error/15 p-2 rounded-xl">
                <Ionicons name="alert-circle" size={20} color={colors.error || '#ef4444'} />
              </View>
              <Text className="ml-3 flex-1 text-xs font-bold text-error">{displayError}</Text>
            </View>
          )}

          {successMessage && (
            <View className="mb-6 flex-row items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <View className="bg-emerald-500/15 p-2 rounded-xl">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              </View>
              <Text className="ml-3 flex-1 text-xs font-bold text-emerald-600">{successMessage}</Text>
            </View>
          )}

          {/* SECTION 1: ESSENTIAL INFO */}
          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted tracking-widest uppercase mb-3 ml-1">Meeting Details</Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-3xl border p-5 shadow-sm"
            >
              {/* Meeting Title Input */}
              <View className="mb-4">
                <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 ml-0.5">Topic</Text>
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderColor: isTitleFocused ? colors.primary : colors.border,
                  }}
                  className="flex-row items-center rounded-2xl border px-4 py-3.5"
                >
                  <Ionicons
                    name="videocam-outline"
                    size={20}
                    color={isTitleFocused ? colors.primary : colors.muted}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    onFocus={() => setIsTitleFocused(true)}
                    onBlur={() => setIsTitleFocused(false)}
                    placeholder="E.g., Design Review, Sync Session"
                    placeholderTextColor={colors.muted}
                    className="flex-1 text-sm font-semibold text-foreground p-0"
                    style={{ color: colors.foreground }}
                  />
                </View>
              </View>

              {/* Destination Link */}
              <View>
                <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 ml-0.5">Where or Link</Text>
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderColor: isLinkFocused ? colors.primary : colors.border,
                  }}
                  className="flex-row items-center rounded-2xl border px-4 py-3.5"
                >
                  <Ionicons
                    name="link-outline"
                    size={20}
                    color={isLinkFocused ? colors.primary : colors.muted}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={meetingLink}
                    onChangeText={setMeetingLink}
                    onFocus={() => setIsLinkFocused(true)}
                    onBlur={() => setIsLinkFocused(false)}
                    placeholder="Paste location or link here"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    keyboardType="url"
                    className="flex-1 text-sm font-semibold text-foreground p-0"
                    style={{ color: colors.foreground }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* SECTION 2: SCHEDULE */}
          <View className="mb-6">
            <Text className="text-[11px] font-bold text-muted tracking-widest uppercase mb-3 ml-1">Schedule</Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-3xl border p-5 shadow-sm"
            >
              <View className="flex-row gap-3">
                {/* Custom Styled Date Display */}
                <Pressable
                  onPress={() => {
                    setShowDatePicker(!showDatePicker);
                    setShowTimePicker(false);
                  }}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: showDatePicker ? colors.primary : colors.border,
                  }}
                  className="flex-1 rounded-2xl border p-4 items-start"
                >
                  <View className="bg-primary/10 rounded-xl p-2 mb-3">
                    <Ionicons name="calendar" size={18} color={colors.primary} />
                  </View>
                  <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Date</Text>
                  <Text className="text-sm font-bold text-foreground">
                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </Pressable>

                {/* Custom Styled Time Display */}
                <Pressable
                  onPress={() => {
                    setShowTimePicker(!showTimePicker);
                    setShowDatePicker(false);
                  }}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: showTimePicker ? colors.primary : colors.border,
                  }}
                  className="flex-1 rounded-2xl border p-4 items-start"
                >
                  <View className="bg-primary/10 rounded-xl p-2 mb-3">
                    <Ionicons name="time" size={18} color={colors.primary} />
                  </View>
                  <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Time</Text>
                  <Text className="text-sm font-bold text-foreground">
                    {selectedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </Pressable>
              </View>

              {/* Inline Gorgeous Datepicker */}
              {showDatePicker && (
                <View
                  style={{ backgroundColor: colors.background, borderColor: colors.border }}
                  className="mt-4 rounded-2xl border p-3 items-center overflow-hidden"
                >
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant={colors.background === '#000000' || colors.background === '#121212' ? 'dark' : 'light'}
                    onChange={handleDateChange}
                  />
                </View>
              )}

              {/* Inline Beautiful Timepicker */}
              {showTimePicker && (
                <View
                  style={{ backgroundColor: colors.background, borderColor: colors.border }}
                  className="mt-4 rounded-2xl border p-3 items-center overflow-hidden"
                >
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={colors.background === '#000000' || colors.background === '#121212' ? 'dark' : 'light'}
                    onChange={handleTimeChange}
                  />
                </View>
              )}
            </View>
          </View>

          {/* SECTION 3: FREQUENCY & DURATION */}
          <View className="mb-8">
            <Text className="text-[11px] font-bold text-muted tracking-widest uppercase mb-3 ml-1">Occurrence & Limits</Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-3xl border p-5 shadow-sm gap-y-6"
            >
              {/* Duration Selectors */}
              <View>
                <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3 ml-0.5">Duration</Text>
                <View className="flex-row gap-2">
                  {DURATIONS.map((dur) => {
                    const isSelected = duration === dur.value;
                    return (
                      <Pressable
                        key={dur.value}
                        onPress={() => setDuration(dur.value)}
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                        className="flex-1 items-center justify-center rounded-2xl border py-3.5 px-1"
                      >
                        <Text
                          style={{ color: isSelected ? '#ffffff' : colors.foreground }}
                          className="text-sm font-bold mb-0.5"
                        >
                          {dur.label}
                        </Text>
                        <Text
                          style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : colors.muted }}
                          className="text-[9px] font-medium"
                          numberOfLines={1}
                        >
                          {dur.desc}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Recurrence Grid */}
              <View>
                <Text className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3 ml-0.5">Recurrence</Text>
                <View className="flex-row flex-wrap gap-2">
                  {FREQUENCIES.map((f) => {
                    const isSelected = frequency === f.id;
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => setFrequency(f.id)}
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                        className="flex-row items-center rounded-xl border px-3 py-2.5"
                      >
                        <Ionicons
                          name={f.icon}
                          size={13}
                          color={isSelected ? '#ffffff' : colors.muted}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{ color: isSelected ? '#ffffff' : colors.foreground }}
                          className="text-xs font-bold capitalize"
                        >
                          {f.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Action Button */}
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                opacity: loading || pressed ? 0.85 : 1,
              },
            ]}
            className="flex-row items-center justify-center rounded-2xl py-4 mb-2 shadow-sm"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text className="text-base font-bold text-white">Update Meeting Session</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}