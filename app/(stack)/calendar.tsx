import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { CATEGORIES } from '@/constants/event-categories';
import { expandAllOccurrences } from '@/utils/event-occurences';

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();

  const { family } = useFamilyStore();
  const { events, loading, error, fetchEvents } = useCalendarStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (family?.id) {
      fetchEvents(family.id);
    }
  }, [family?.id, fetchEvents]);

  const getDaysInMonth = (date: Date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ).getDay();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const monthOccurrences = useMemo(() => {
    const rangeStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );

    rangeStart.setDate(rangeStart.getDate() - 7);

    const rangeEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    );

    rangeEnd.setDate(rangeEnd.getDate() + 7);

    return expandAllOccurrences(events, rangeStart, rangeEnd);
  }, [events, currentMonth]);

  const getEventsForDay = (date: Date) => {
    return monthOccurrences.filter((occurrence) =>
      isSameDay(
        new Date(occurrence.occurrence_date),
        date,
      ),
    );
  };

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const monthDays: (Date | null)[] = [];

    for (let index = 0; index < firstDay; index++) {
      monthDays.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      monthDays.push(
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          day,
        ),
      );
    }

    return monthDays;
  }, [currentMonth]);

  const selectedDayEvents = getEventsForDay(selectedDate);

  const handlePrevMonth = () => {
    const previousMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1,
    );

    setCurrentMonth(previousMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1,
    );

    setCurrentMonth(nextMonth);
  };

  const handleToday = () => {
    const today = new Date();

    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handleAddEvent = () => {
    router.push('/(stack)/create-event');
  };

  if (loading && events.length === 0) {
    return (
      <ScreenContainer
        containerClassName="bg-background"
        safeAreaClassName="bg-background"
      >
        <View className="flex-1 items-center justify-center">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="items-center rounded-3xl border px-8 py-7"
          >
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-4 h-12 w-12 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="calendar-outline"
                size={25}
                color={colors.primary}
              />
            </View>

            <ActivityIndicator color={colors.primary} />

            <Text className="mt-4 text-sm font-black text-foreground">
              Loading your calendar
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Getting your family events
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Family Calendar" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 24,
        }}
      >
        {/* Calendar introduction */}
        <View className="mb-5 flex-row items-end justify-between">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
              Family planning
            </Text>

            <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Your calendar
            </Text>

            <Text className="mt-1 text-xs font-medium text-muted">
              Keep everyone aligned with what&apos;s ahead.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: `${colors.primary}14`,
              borderColor: `${colors.primary}28`,
            }}
            className="h-11 w-11 items-center justify-center rounded-2xl border"
          >
            <Ionicons
              name="calendar"
              size={22}
              color={colors.primary}
            />
          </View>
        </View>

        {error && (
          <View
            style={{
              backgroundColor: '#EF44440D',
              borderColor: '#EF444440',
            }}
            className="mb-4 flex-row items-start rounded-2xl border px-4 py-3.5"
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color="#EF4444"
            />

            <Text className="ml-3 flex-1 text-sm leading-5 text-red-500">
              {error}
            </Text>
          </View>
        )}

        {/* Calendar card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 7 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
            elevation: 3,
          }}
          className="mb-6 overflow-hidden rounded-[26px] border"
        >
          {/* Month header */}
          <View
            style={{
              backgroundColor: `${colors.primary}08`,
              borderBottomColor: `${colors.primary}16`,
            }}
            className="flex-row items-center justify-between border-b px-5 py-4"
          >
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={10}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? `${colors.primary}20`
                  : `${colors.primary}12`,
              })}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="chevron-back"
                size={17}
                color={colors.primary}
              />
            </Pressable>

            <View className="items-center">
              <Text className="text-base font-black text-foreground">
                {currentMonth.toLocaleDateString('en-US', {
                  month: 'long',
                })}
              </Text>

              <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                {currentMonth.getFullYear()}
              </Text>
            </View>

            <Pressable
              onPress={handleNextMonth}
              hitSlop={10}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? `${colors.primary}20`
                  : `${colors.primary}12`,
              })}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {/* Today shortcut */}
          <View className="items-center pt-3">
            <Pressable
              onPress={handleToday}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
              })}
              className="flex-row items-center"
            >
              <Ionicons
                name="locate-outline"
                size={13}
                color={colors.primary}
              />

              <Text
                style={{ color: colors.primary }}
                className="ml-1.5 text-[10px] font-black uppercase tracking-wider"
              >
                Today
              </Text>
            </Pressable>
          </View>

          {/* Weekday labels */}
          <View className="mt-4 flex-row px-4">
            {WEEK_DAYS.map((day, index) => (
              <View
                key={`${day}-${index}`}
                className="flex-1 items-center py-2"
              >
                <Text className="text-[10px] font-black uppercase text-muted">
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View className="px-4 pb-5">
            {Array.from({
              length: Math.ceil(days.length / 7),
            }).map((_, weekIndex) => (
              <View key={weekIndex} className="flex-row">
                {days
                  .slice(weekIndex * 7, (weekIndex + 1) * 7)
                  .map((day, dayIndex) => {
                    const dayEvents = day
                      ? getEventsForDay(day)
                      : [];

                    const selected =
                      day && isSameDay(day, selectedDate);

                    const today =
                      day && isSameDay(day, new Date());

                    return (
                      <Pressable
                        key={`${weekIndex}-${dayIndex}`}
                        onPress={() => {
                          if (day) setSelectedDate(day);
                        }}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                          transform: [
                            { scale: pressed ? 0.94 : 1 },
                          ],
                        })}
                        className="flex-1 items-center justify-center py-1.5"
                      >
                        <View
                          style={{
                            backgroundColor: selected
                              ? colors.primary
                              : 'transparent',
                            borderColor: today && !selected
                              ? colors.primary
                              : 'transparent',
                            borderWidth: today && !selected
                              ? 1
                              : 0,
                          }}
                          className="h-10 w-10 items-center justify-center rounded-2xl"
                        >
                          {day && (
                            <Text
                              style={{
                                color: selected
                                  ? '#FFFFFF'
                                  : today
                                    ? colors.primary
                                    : colors.foreground,
                              }}
                              className="text-sm font-black"
                            >
                              {day.getDate()}
                            </Text>
                          )}

                          {day && dayEvents.length > 0 && (
                            <View className="absolute bottom-1.5 flex-row items-center gap-0.5">
                              {dayEvents
                                .slice(0, 3)
                                .map((event, eventIndex) => (
                                  <View
                                    key={`${event.id}-${eventIndex}`}
                                    style={{
                                      backgroundColor: selected
                                        ? '#FFFFFF'
                                        : event.color ||
                                          colors.primary,
                                    }}
                                    className="h-1 w-1 rounded-full"
                                  />
                                ))}
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            ))}
          </View>
        </View>

        {/* Selected date heading */}
        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-muted">
              Selected day
            </Text>

            <Text className="mt-1 text-lg font-black text-foreground">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View
            style={{ backgroundColor: `${colors.primary}14` }}
            className="rounded-full px-2.5 py-1"
          >
            <Text
              style={{ color: colors.primary }}
              className="text-[10px] font-black"
            >
              {selectedDayEvents.length}{' '}
              {selectedDayEvents.length === 1 ? 'event' : 'events'}
            </Text>
          </View>
        </View>

        {/* Selected day events */}
        {selectedDayEvents.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="mb-5 items-center rounded-[24px] border px-6 py-8"
          >
            <View
              style={{ backgroundColor: `${colors.primary}12` }}
              className="mb-3 h-12 w-12 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="calendar-clear-outline"
                size={23}
                color={colors.primary}
              />
            </View>

            <Text className="text-sm font-black text-foreground">
              Nothing scheduled
            </Text>

            <Text className="mt-1 text-center text-xs leading-5 text-muted">
              This day is clear. Add an event when something comes up.
            </Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={selectedDayEvents}
            keyExtractor={(item) =>
              `${item.id}-${item.occurrence_date}`
            }
            renderItem={({ item }) => {
              const category =
                CATEGORIES.find(
                  (categoryItem) =>
                    categoryItem.key === item.category,
                ) ?? CATEGORIES[0];

              const isFullDay = [
                'birthday',
                'anniversary',
              ].includes(item.category);

              const startDate = new Date(item.occurrence_date);
              const originalStartDate = new Date(item.start_date);
              const originalEndDate = new Date(item.end_date);

              const duration =
                originalEndDate.getTime() -
                originalStartDate.getTime();

              const endDate = new Date(
                startDate.getTime() + duration,
              );

              return (
                <Pressable
                  disabled={item.category === 'birthday'}
                  onPress={() =>
                    router.push(
                      `/(stack)/create-event?eventId=${item.id}`,
                    )
                  }
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity:
                      item.category === 'birthday'
                        ? 1
                        : pressed
                          ? 0.82
                          : 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  })}
                  className="mb-3 overflow-hidden rounded-[22px] border"
                >
                  <View className="flex-row">
                    <View
                      style={{
                        backgroundColor:
                          item.color || colors.primary,
                      }}
                      className="w-1.5"
                    />

                    <View className="flex-1 px-4 py-4">
                      <View className="flex-row items-start">
                        <View className="flex-1 pr-3">
                          <Text className="text-base font-black text-foreground">
                            {item.title}
                          </Text>

                          {!isFullDay && (
                            <View className="mt-2 flex-row items-center">
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color={colors.primary}
                              />

                              <Text className="ml-1.5 text-xs font-semibold text-muted">
                                {formatTime(
                                  item.occurrence_date,
                                )}{' '}
                                – {formatTime(endDate.toISOString())}
                              </Text>
                            </View>
                          )}

                          {isFullDay && (
                            <View className="mt-2 flex-row items-center">
                              <Ionicons
                                name="sunny-outline"
                                size={14}
                                color={colors.primary}
                              />

                              <Text className="ml-1.5 text-xs font-semibold text-muted">
                                All day
                              </Text>
                            </View>
                          )}
                        </View>

                        <View
                          style={{
                            backgroundColor: `${colors.primary}12`,
                          }}
                          className="flex-row items-center rounded-full px-2.5 py-1.5"
                        >
                          <Ionicons
                            name={category.icon}
                            size={11}
                            color={colors.primary}
                          />

                          <Text
                            style={{ color: colors.primary }}
                            className="ml-1 text-[9px] font-black"
                          >
                            {category.label}
                          </Text>
                        </View>
                      </View>

                      {item.location && (
                        <View className="mt-3 flex-row items-center">
                          <Ionicons
                            name="location-outline"
                            size={14}
                            color={colors.muted}
                          />

                          <Text
                            numberOfLines={1}
                            className="ml-1.5 flex-1 text-xs font-medium text-muted"
                          >
                            {item.location}
                          </Text>
                        </View>
                      )}

                      {!!item.recurrence && (
                        <View className="mt-2 flex-row items-center">
                          <Ionicons
                            name="repeat-outline"
                            size={14}
                            color={colors.muted}
                          />

                          <Text className="ml-1.5 text-[11px] font-medium italic text-muted">
                            Repeats {item.recurrence}
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.category !== 'birthday' && (
                      <View className="items-center justify-center pr-4">
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.muted}
                        />
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </ScrollView>

      {/* Add event action */}
      <View
        className="px-4 pt-2"
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          onPress={handleAddEvent}
          style={({
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 12,
            elevation: 4,
          })}
          className="flex-row items-center justify-center rounded-2xl py-4"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />

          <Text className="ml-2 text-sm font-black text-white">
            Add Event
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
