import { ScrollView, Text, View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';

export default function CalendarScreen() {
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
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  const getDaysArray = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleAddEvent = () => {
    router.push('/(stack)/create-event');
  };

  const selectedDayEvents = getEventsForDay(selectedDate);
  const days = getDaysArray();

  if (loading && events.length === 0) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 py-8">
          <Text className="text-2xl font-bold text-foreground mb-6">Calendar</Text>

          {error && (
            <View className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
              <Text className="text-red-800 text-sm">{error}</Text>
            </View>
          )}

          {/* Month Navigation */}
          <View className="flex-row justify-between items-center mb-6">
            <Pressable onPress={handlePrevMonth} className="p-2">
              <Text className="text-primary font-bold text-lg">←</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-foreground">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable onPress={handleNextMonth} className="p-2">
              <Text className="text-primary font-bold text-lg">→</Text>
            </Pressable>
          </View>

          {/* Calendar Grid */}
          <View className="mb-6 p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
            {/* Day Headers */}
            <View className="flex-row mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <View key={day} className="flex-1 items-center py-2">
                  <Text className="text-xs font-semibold text-muted">{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Days */}
            <View>
              {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
                <View key={weekIndex} className="flex-row">
                  {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
                    <Pressable
                      key={`${weekIndex}-${dayIndex}`}
                      onPress={() => day && setSelectedDate(day)}
                      className={`flex-1 aspect-square items-center justify-center rounded border ${
                        day && isSameDay(day, selectedDate) ? 'border-primary bg-primary' : 'border-border'
                      }`}
                      style={{
                        backgroundColor:
                          day && isSameDay(day, selectedDate)
                            ? colors.primary
                            : day && getEventsForDay(day).length > 0
                            ? colors.surface
                            : 'transparent',
                      }}
                    >
                      {day && (
                        <>
                          <Text
                            className={`text-sm font-semibold ${
                              isSameDay(day, selectedDate) ? 'text-white' : 'text-foreground'
                            }`}
                          >
                            {day.getDate()}
                          </Text>
                          {getEventsForDay(day).length > 0 && (
                            <View className="w-1 h-1 rounded-full bg-primary mt-1" />
                          )}
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Events for Selected Day */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            {selectedDayEvents.length === 0 ? (
              <View className="p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
                <Text className="text-muted text-center">No events scheduled</Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={selectedDayEvents}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View className="mb-3 p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
                    <View className="flex-row items-start gap-3">
                      <View
                        className="w-3 h-3 rounded-full mt-1.5"
                        style={{ backgroundColor: item.color || colors.primary }}
                      />
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">{item.title}</Text>
                        <Text className="text-sm text-muted mt-1">
                          {formatTime(item.start_date)} - {formatTime(item.end_date)}
                        </Text>
                        {item.location && (
                          <Text className="text-sm text-muted mt-1">📍 {item.location}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Event Button */}
      <View className="px-6 pb-8">
        <Pressable
          onPress={handleAddEvent}
          className="py-4 rounded-lg items-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white font-semibold text-lg">+ Add Event</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
