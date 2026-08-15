import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import {  useCalendarStore } from '@/lib/stores/calendar-store';
import { AppHeader } from '@/components/app-header';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, EventCategory, RECURRING_PERSON_CATEGORIES } from '@/constants/event-categories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { useLocalSearchParams } from 'expo-router';


const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quaterly' | 'annually';

const LOCKED_RECURRENCE_OPTIONS: Recurrence[] = ['monthly', 'bimonthly', 'quaterly', 'annually'];
const ALL_RECURRENCE_OPTIONS: Recurrence[] = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quaterly', 'annually'];

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { family, members } = useFamilyStore();
  const { events, createEvent, updateEvent, loading } = useCalendarStore();


  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const isEditMode = !!eventId;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('general');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));
  const [location, setLocation] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [relatedMemberIds, setRelatedMemberIds] = useState<string[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const isPremium = family?.subscription_tier === 'premium';
  const isPersonCategory = RECURRING_PERSON_CATEGORIES.includes(category);
  const maxRelatedMembers = category === 'anniversary' ? 2 : category === 'birthday' ? 1 : undefined;

  // Prefill from the existing event when editing
  useEffect(() => {
    if (!isEditMode) return;
    const existing = events.find((e) => e.id === eventId);
    if (!existing) return;

    setTitle(existing.title);
    setCategory(existing.category);
    setStartDate(new Date(existing.start_date));
    setEndDate(new Date(existing.end_date));
    setLocation(existing.location ?? '');
    setSelectedColor(existing.color ?? COLORS[0]);
    setRecurrence((existing.recurrence as Recurrence) ?? 'none');
    setRelatedMemberIds(existing.related_member_ids ?? []);
  }, [isEditMode, eventId, events]);

  // Auto-set sensible defaults when switching into a person-category (create mode only —
  // don't fight the prefill effect above when editing)
  useEffect(() => {
    if (!isEditMode && isPersonCategory && recurrence === 'none') {
      setRecurrence('annually');
    }
  }, [category, isEditMode]);

  const toggleRelatedMember = (memberId: string) => {
    setRelatedMemberIds((prev) => {
      if (prev.includes(memberId)) return prev.filter((id) => id !== memberId);
      if (maxRelatedMembers && prev.length >= maxRelatedMembers) {
        return category === 'anniversary' ? [...prev.slice(1), memberId] : [memberId];
      }
      return [...prev, memberId];
    });
  };

  const handleRecurrencePress = (r: Recurrence) => {
    if (LOCKED_RECURRENCE_OPTIONS.includes(r) && !isPremium) {
      router.push('/(stack)/paywall');
      return;
    }
    setRecurrence(r);
  };

  const handleStartDateChange = (event: any, date?: Date) => {
    if (date) setStartDate(date);
    setShowStartDatePicker(false);
  };
  const handleStartTimeChange = (event: any, date?: Date) => {
    if (date) setStartDate(date);
    if (Platform.OS !== 'ios') setShowStartTimePicker(false);
  };
  const handleEndTimeChange = (event: any, date?: Date) => {
    if (date) setEndDate(date);
    if (Platform.OS !== 'ios') setShowEndTimePicker(false);
  };
  const handleEndDateChange = (event: any, date?: Date) => {
    if (date) setEndDate(date);
    setShowEndDatePicker(false);
  };

  const handleSubmit = async () => {
    if (!title?.trim() || !family?.id) {
      alert('Please enter an event title');
      return;
    }

    const payload = {
      title,
      category,
      start_date: startDate.toISOString(),
      end_date: isPersonCategory ? new Date(startDate.getTime() + 86400000).toISOString() : endDate.toISOString(),
      location: isPersonCategory ? undefined : (location || undefined),
      color: selectedColor,
      recurrence,
      related_member_ids: relatedMemberIds.length > 0 ? relatedMemberIds : undefined,
    };

    try {
      if (isEditMode && eventId) {
        await updateEvent(eventId, payload);
      } else {
        await createEvent(family.id, family.created_by, payload);
      }
      router.back();
    } catch (error) {
      console.error(isEditMode ? 'Error updating event:' : 'Error creating event:', error);
      alert(isEditMode ? 'Failed to update event' : 'Failed to create event');
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title={isEditMode ? 'Edit Event' : 'Create Event'} showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pb-8">

          {!isEditMode && (
            <View className="mb-4 rounded-2xl border border-primary bg-primary/5 p-3">
              <Text className="text-sm font-semibold text-foreground">Track more than birthdays</Text>
              <Text className="mt-1 text-xs leading-5 text-muted">
                Use your calendar for school schedules, medical appointments, travel plans, bills, birthdays,
                anniversaries, and anything else your family needs to stay on top of.
              </Text>
            </View>
          )}

          {/* Category */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-3">What's this for?</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const selected = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                      selected ? 'border-primary bg-primary' : 'border-border bg-surface'
                    }`}
                  >
                    <Ionicons name={cat.icon} size={14} color={selected ? '#fff' : colors.foreground} />
                    <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-foreground'}`}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Who's it about — only for birthday/anniversary */}
          {isPersonCategory && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">
                {category === 'anniversary' ? 'Who are the two people? (pick 2)' : "Who's this for?"}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(members ?? []).map((m) => {
                  const selected = relatedMemberIds.includes(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => toggleRelatedMember(m.id)}
                      className={`rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
                    >
                      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-foreground'}`}>{m.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Title */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">Title *</Text>
            <TextInput
              placeholder={category === 'birthday' ? "e.g. Mum's Birthday" : category === 'anniversary' ? 'e.g. Wedding Anniversary' : 'Event title'}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.muted}
              className="px-4 py-3 rounded-lg border border-border text-foreground"
              style={{ borderColor: colors.border, color: colors.foreground }}
            />
          </View>

          {/* Date */}
          {/* Date — matches the DOB pattern */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">
              {isPersonCategory ? 'Date' : 'Start Date & Time'}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setShowStartDatePicker(true)}
                className="flex-1 px-4 py-3 rounded-lg border border-border"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <Text className="text-foreground text-xs">{startDate.toLocaleDateString()}</Text>
              </Pressable>
              {!isPersonCategory && (
                <Pressable
                  onPress={() => setShowStartTimePicker(true)}
                  className="flex-1 px-4 py-3 rounded-lg border border-border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <Text className="text-foreground text-xs">
                    {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Pressable>
              )}
            </View>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
              />
            )}
            {showStartTimePicker && (
              <View>
                <DateTimePicker
                  value={startDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartTimeChange}
                />
                {Platform.OS === 'ios' && (
                  <Pressable
                    onPress={() => setShowStartTimePicker(false)}
                    className="mt-2 items-center rounded-lg py-2"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-sm font-semibold text-white">Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* End Date & Time */}
          {!isPersonCategory && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-2">End Date & Time</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setShowEndDatePicker(true)}
                  className="flex-1 px-4 py-3 rounded-lg border border-border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <Text className="text-foreground text-xs">{endDate.toLocaleDateString()}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowEndTimePicker(true)}
                  className="flex-1 px-4 py-3 rounded-lg border border-border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <Text className="text-foreground text-xs">
                    {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Pressable>
              </View>
              {showEndDatePicker && (
                <DateTimePicker 
                value={endDate} mode="date" 
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange} />
              )}
              {showEndTimePicker && (
                <View>
                  <DateTimePicker 
                  value={endDate} 
                  mode="time" 
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndTimeChange} />
                  {Platform.OS === 'ios' && (
                    <Pressable
                      onPress={() => setShowStartTimePicker(false)}
                      className="mt-2 items-center rounded-lg py-2"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text className="text-sm font-semibold text-white">Done</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Location */}
          {!isPersonCategory && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-2">Location</Text>
              <TextInput
                placeholder="Event location"
                value={location}
                onChangeText={setLocation}
                placeholderTextColor={colors.muted}
                className="px-4 py-3 rounded-lg border border-border text-foreground"
                style={{ borderColor: colors.border, color: colors.foreground }}
              />
            </View>
          )}

          {/* Color */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-3">Color</Text>
            <View className="flex-row gap-2 flex-wrap">
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded-full border-2 ${selectedColor === color ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </View>
          </View>

          {/* Recurrence — locked to annually for person categories; free tier capped at biweekly otherwise */}
          {!isPersonCategory ? (
            <View className="mb-8">
              <Text className="text-sm font-semibold text-foreground mb-3">Recurrence</Text>
              <View className="flex-row gap-2 flex-wrap">
                {ALL_RECURRENCE_OPTIONS.map((r) => {
                  const isLocked = LOCKED_RECURRENCE_OPTIONS.includes(r) && !isPremium;
                  const selected = recurrence === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => handleRecurrencePress(r)}
                      className={`flex-row items-center gap-1 px-3 py-2 rounded-lg border ${
                        selected ? 'border-primary' : 'border-border'
                      } ${isLocked ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: selected ? colors.primary : colors.surface }}
                    >
                      {isLocked && <Ionicons name="lock-closed" size={10} color={colors.muted} />}
                      <Text className={`text-xs font-semibold capitalize ${selected ? 'text-white' : 'text-foreground'}`}>
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!isPremium && (
                <View className="mt-3 flex-row items-start gap-2 rounded-xl bg-primary/5 p-3">
                  <Ionicons name="lock-closed" size={14} color={colors.primary} style={{ marginTop: 1 }} />
                  <Text className="flex-1 text-xs leading-5 text-muted">
                    Free plan events can repeat up to every two weeks. Monthly and longer recurrence is a
                    Premium feature — tap a locked option to upgrade.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="mb-8 flex-row items-center rounded-xl bg-primary/5 p-3">
              <Ionicons name="repeat" size={14} color={colors.primary} />
              <Text className="ml-2 text-xs text-muted">This repeats every year automatically</Text>
            </View>
          )}

          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="py-4 mb-2 rounded-lg items-center"
              style={{
                backgroundColor: colors.primary,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  {isEditMode ? 'Update Event' : 'Create Event'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

