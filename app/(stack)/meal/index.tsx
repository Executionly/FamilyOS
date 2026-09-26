import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMealStore } from '@/lib/stores/meal-store';
import {
  useMealPlanStore,
  MealSlot,
  MealPlanItem,
} from '@/lib/stores/meal-plan-store';
import { isAdminAccess } from '@/utils';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const SHORT_DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const SLOTS: {
  key: MealSlot;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    icon: 'sunny-outline',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    icon: 'restaurant-outline',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    icon: 'moon-outline',
  },
];

function getMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);

  result.setDate(diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const sameMonth =
    weekStart.getMonth() === weekEnd.getMonth();

  if (sameMonth) {
    return `${weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}–${weekEnd.toLocaleDateString('en-US', {
      day: 'numeric',
    })}`;
  }

  return `${weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;
}

function getMealCount(
  itemsByDaySlot: Record<string, MealPlanItem[]>,
) {
  return Object.values(itemsByDaySlot).reduce(
    (total, items) => total + items.length,
    0,
  );
}

export default function MealPlannerScreen() {
  const router = useRouter();
  const colors = useColors();

  const { family, currentMember } = useFamilyStore();
  const { meals, fetchMeals } = useMealStore();

  const {
    currentPlan,
    loading,
    fetchPlanForWeek,
    createPlan,
    duplicatePlan,
    setPlanItem,
    removePlanItem,
    updateSnackRule,
  } = useMealPlanStore();

  const [weekStart, setWeekStart] = useState(() =>
    getMonday(new Date()),
  );

  const [pickerFor, setPickerFor] = useState<{
    day: number;
    slot: MealSlot;
  } | null>(null);

  const [snackRuleModalVisible, setSnackRuleModalVisible] =
    useState(false);

  const [snackRuleDraft, setSnackRuleDraft] = useState('');

  const isEditor = isAdminAccess(currentMember?.role);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  useEffect(() => {
    if (!family?.id) return;

    fetchMeals(family.id);
    fetchPlanForWeek(family.id, weekStartStr);
  }, [family?.id, weekStartStr]);

  const itemsByDaySlot = useMemo(() => {
    const result: Record<string, MealPlanItem[]> = {};

    (currentPlan?.meal_plan_item ?? []).forEach((item) => {
      const key = `${item.day_of_week}-${item.slot}`;

      result[key] = [...(result[key] ?? []), item];
    });

    return result;
  }, [currentPlan]);

  const plannedMealCount = useMemo(
    () => getMealCount(itemsByDaySlot),
    [itemsByDaySlot],
  );

  const changeWeek = (delta: number) => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + delta * 7);
    setWeekStart(nextWeek);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  const handleCellPress = async (
    day: number,
    slot: MealSlot,
  ) => {
    if (!isEditor) return;

    let planId = currentPlan?.id;

    if (!planId) {
      if (!family?.id || !currentMember?.user_id) return;

      const newPlan = await createPlan(
        family.id,
        currentMember.user_id,
        weekStartStr,
      );

      planId = newPlan.id;
    }

    setPickerFor({ day, slot });
  };

  const handlePickMeal = async (mealId: string) => {
    if (!pickerFor || !currentPlan) return;

    try {
      await setPlanItem(
        currentPlan.id,
        pickerFor.day,
        pickerFor.slot,
        mealId,
      );

      setPickerFor(null);
    } catch (error) {
      console.error('Failed to set meal:', error);
      alert('Something went wrong saving that meal. Please try again.');
    }
  };

  const handleDuplicateLastWeek = async () => {
    if (!family?.id || !currentMember?.user_id) return;

    const lastWeek = new Date(weekStart);
    lastWeek.setDate(weekStart.getDate() - 7);

    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    const { supabase } = await import('@/lib/_core/supabase');

    const { data } = await supabase
      .from('meal_plan')
      .select('id')
      .eq('family_id', family.id)
      .eq('week_start_date', lastWeekStr)
      .maybeSingle();

    if (!data) {
      alert('No plan found for last week to duplicate.');
      return;
    }

    await duplicatePlan(
      family.id,
      currentMember.user_id,
      data.id,
      weekStartStr,
    );
  };

  const openSnackRuleModal = () => {
    setSnackRuleDraft(currentPlan?.snack_rule_note ?? '');
    setSnackRuleModalVisible(true);
  };

  const handleSaveSnackRule = async () => {
    try {
      let planId = currentPlan?.id;

      if (!planId) {
        if (!family?.id || !currentMember?.user_id) return;

        const newPlan = await createPlan(
          family.id,
          currentMember.user_id,
          weekStartStr,
        );

        planId = newPlan.id;
      }

      await updateSnackRule(planId, snackRuleDraft.trim());
      setSnackRuleModalVisible(false);
    } catch (error) {
      console.error('Failed to save snack rule:', error);
      alert('Something went wrong saving the snack rule.');
    }
  };

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Meal Planner" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 34,
        }}
      >
        {/* Page introduction */}
        <View className="mb-5 flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
              Family planning
            </Text>

            <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Weekly meals
            </Text>

            <Text className="mt-1 text-xs font-medium leading-5 text-muted">
              Organise meals, snacks, and shopping for the week ahead.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: `${colors.primary}14`,
              borderColor: `${colors.primary}28`,
            }}
            className="ml-4 h-12 w-12 items-center justify-center rounded-2xl border"
          >
            <Ionicons
              name="restaurant-outline"
              size={23}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Week navigator */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
            elevation: 2,
          }}
          className="mb-4 overflow-hidden rounded-[24px] border"
        >
          <View
            style={{
              backgroundColor: `${colors.primary}08`,
              borderBottomColor: `${colors.primary}16`,
            }}
            className="flex-row items-center justify-between border-b px-4 py-4"
          >
            <Pressable
              onPress={() => changeWeek(-1)}
              hitSlop={10}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? `${colors.primary}20`
                  : `${colors.primary}12`,
                opacity: pressed ? 0.7 : 1,
              })}
              className="h-10 w-10 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={colors.primary}
              />
            </Pressable>

            <View className="items-center">
              <Text className="text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Week of
              </Text>

              <Text className="mt-1 text-base font-black text-foreground">
                {formatWeekRange(weekStart)}
              </Text>
            </View>

            <Pressable
              onPress={() => changeWeek(1)}
              hitSlop={10}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? `${colors.primary}20`
                  : `${colors.primary}12`,
                opacity: pressed ? 0.7 : 1,
              })}
              className="h-10 w-10 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.primary}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center">
              <Ionicons
                name="restaurant-outline"
                size={15}
                color={colors.primary}
              />

              <Text className="ml-2 text-xs font-semibold text-muted">
                {plannedMealCount}{' '}
                {plannedMealCount === 1
                  ? 'meal planned'
                  : 'meals planned'}
              </Text>
            </View>

            <Pressable
              onPress={goToCurrentWeek}
              style={({ pressed }) => ({
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <Text
                style={{ color: colors.primary }}
                className="text-[10px] font-black uppercase tracking-wider"
              >
                This week
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Editor shortcuts */}
        {isEditor && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              paddingBottom: 4,
            }}
            className="mb-5"
          >
            <ActionChip
              icon="repeat-outline"
              label="Use Last Week"
              onPress={handleDuplicateLastWeek}
              colors={colors}
            />

            <ActionChip
              icon="book-outline"
              label="Meal Library"
              onPress={() =>
                router.push('/(stack)/meal/library')
              }
              colors={colors}
            />

            {currentPlan && (
              <ActionChip
                icon="cart-outline"
                label="Shopping List"
                onPress={() =>
                  router.push('/(stack)/meal/shopping-list')
                }
                colors={colors}
              />
            )}
          </ScrollView>
        )}

        {loading ? (
          <View className="items-center justify-center py-20">
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="restaurant-outline"
                size={27}
                color={colors.primary}
              />
            </View>

            <ActivityIndicator color={colors.primary} />

            <Text className="mt-4 text-sm font-black text-foreground">
              Loading your meal plan
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Preparing the week ahead
            </Text>
          </View>
        ) : (
          <View>
            {/* Weekly meal plan */}
            {DAY_NAMES.map((dayLabel, dayIndex) => {
              const isToday =
                getMonday(new Date()).getTime() ===
                  weekStart.getTime() &&
                new Date().getDay() ===
                  (dayIndex === 6 ? 0 : dayIndex + 1);

              return (
                <View key={dayLabel} className="mb-5">
                  <View className="mb-2.5 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        style={{
                          backgroundColor: isToday
                            ? colors.primary
                            : `${colors.primary}14`,
                        }}
                        className="mr-2.5 h-8 w-8 items-center justify-center rounded-xl"
                      >
                        <Text
                          style={{
                            color: isToday
                              ? '#FFFFFF'
                              : colors.primary,
                          }}
                          className="text-[10px] font-black"
                        >
                          {SHORT_DAY_NAMES[dayIndex]}
                        </Text>
                      </View>

                      <Text className="text-base font-black text-foreground">
                        {dayLabel}
                      </Text>
                    </View>

                    {isToday && (
                      <View
                        style={{
                          backgroundColor: `${colors.primary}14`,
                        }}
                        className="rounded-full px-2.5 py-1"
                      >
                        <Text
                          style={{ color: colors.primary }}
                          className="text-[9px] font-black uppercase tracking-wider"
                        >
                          Today
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.04,
                      shadowRadius: 10,
                      elevation: 1,
                    }}
                    className="overflow-hidden rounded-[22px] border px-3"
                  >
                    {SLOTS.map((slot, slotIndex) => {
                      const items =
                        itemsByDaySlot[
                          `${dayIndex}-${slot.key}`
                        ] ?? [];

                      const item = items[0];

                      return (
                        <Pressable
                          key={slot.key}
                          onPress={() =>
                            handleCellPress(dayIndex, slot.key)
                          }
                          disabled={!isEditor}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.72 : 1,
                            borderBottomColor: colors.border,
                            borderBottomWidth:
                              slotIndex !== SLOTS.length - 1
                                ? 1
                                : 0,
                          })}
                          className="flex-row items-center py-3"
                        >
                          <View
                            style={{
                              backgroundColor: item
                                ? `${colors.primary}14`
                                : `${colors.muted}10`,
                            }}
                            className="mr-3 h-9 w-9 items-center justify-center rounded-xl"
                          >
                            <Ionicons
                              name={slot.icon}
                              size={17}
                              color={
                                item
                                  ? colors.primary
                                  : colors.muted
                              }
                            />
                          </View>

                          <View className="w-[72px]">
                            <Text className="text-[10px] font-black uppercase tracking-wider text-muted">
                              {slot.label}
                            </Text>
                          </View>

                          <View className="flex-1 pr-2">
                            <Text
                              numberOfLines={1}
                              className={`text-sm ${
                                item?.meal
                                  ? 'font-black text-foreground'
                                  : 'font-medium text-muted'
                              }`}
                            >
                              {item?.meal?.name ?? 'Tap to add'}
                            </Text>
                          </View>

                          {item?.cook && (
                            <View
                              style={{
                                backgroundColor: `${colors.primary}12`,
                              }}
                              className="max-w-[84px] rounded-full px-2.5 py-1"
                            >
                              <Text
                                numberOfLines={1}
                                style={{ color: colors.primary }}
                                className="text-[9px] font-black"
                              >
                                {item.cook.name}
                              </Text>
                            </View>
                          )}

                          {isEditor && (
                            <Ionicons
                              name="chevron-forward"
                              size={15}
                              color={colors.muted}
                              style={{ marginLeft: 8 }}
                            />
                          )}
                        </Pressable>
                      );
                    })}

                    {/* Snacks */}
                    <Pressable
                      onPress={() =>
                        handleCellPress(dayIndex, 'snack')
                      }
                      disabled={!isEditor}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.72 : 1,
                        borderTopColor: colors.border,
                        borderTopWidth: 1,
                      })}
                      className="flex-row flex-wrap items-center gap-2 py-3"
                    >
                      <View
                        style={{
                          backgroundColor: `${colors.primary}12`,
                        }}
                        className="h-8 w-8 items-center justify-center rounded-lg"
                      >
                        <Ionicons
                          name="fast-food-outline"
                          size={15}
                          color={colors.primary}
                        />
                      </View>

                      <Text className="text-[10px] font-black uppercase tracking-wider text-muted">
                        Snacks
                      </Text>

                      {(itemsByDaySlot[
                        `${dayIndex}-snack`
                      ] ?? []).map((item) => (
                        <View
                          key={item.id}
                          style={{
                            backgroundColor: `${colors.primary}12`,
                            borderColor: `${colors.primary}25`,
                          }}
                          className="flex-row items-center rounded-full border px-2.5 py-1.5"
                        >
                          <Text
                            numberOfLines={1}
                            style={{ color: colors.primary }}
                            className="max-w-[110px] text-[10px] font-black"
                          >
                            {item.meal?.name}
                          </Text>

                          {isEditor && (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                removePlanItem(item.id);
                              }}
                              hitSlop={6}
                              className="ml-1.5"
                            >
                              <Ionicons
                                name="close-circle"
                                size={14}
                                color={colors.primary}
                              />
                            </Pressable>
                          )}
                        </View>
                      ))}

                      {isEditor && (
                        <View
                          style={{
                            borderColor: colors.border,
                          }}
                          className="rounded-full border border-dashed px-2.5 py-1.5"
                        >
                          <Text className="text-[10px] font-bold text-muted">
                            + Add
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {/* Snack rule */}
            {isEditor && (
              <Pressable
                onPress={openSnackRuleModal}
                style={({
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                })}
                className="mb-4 flex-row items-center rounded-[22px] border px-4 py-4"
              >
                <View
                  style={{ backgroundColor: `${colors.primary}14` }}
                  className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                >
                  <Ionicons
                    name="options-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <View className="flex-1 pr-3">
                  <Text className="text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                    Snack rule
                  </Text>

                  <Text
                    numberOfLines={2}
                    className="mt-1 text-sm font-semibold text-foreground"
                  >
                    {currentPlan?.snack_rule_note ||
                      'No rule set — tap to add one'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.muted}
                />
              </Pressable>
            )}

            {!isEditor && currentPlan?.snack_rule_note && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
                className="mb-4 rounded-[22px] border px-4 py-4"
              >
                <View className="mb-2 flex-row items-center">
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.primary}
                  />

                  <Text className="ml-2 text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                    Snack rule
                  </Text>
                </View>

                <Text className="text-sm leading-5 text-foreground">
                  {currentPlan.snack_rule_note}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Meal picker */}
      {pickerFor && (
        <Modal
          visible={!!pickerFor}
          animationType="slide"
          transparent
          onRequestClose={() => setPickerFor(null)}
        >
          <Pressable
            onPress={() => setPickerFor(null)}
            className="flex-1 justify-end bg-black/45"
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{
                backgroundColor: colors.background,
              }}
              className="max-h-[78%] min-h-[420px] rounded-t-[30px] px-5 pb-6 pt-5"
            >
              <View className="mb-5 flex-row items-center justify-between">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-muted">
                    Meal library
                  </Text>

                  <Text className="mt-1 text-xl font-black text-foreground">
                    {pickerFor.slot === 'snack'
                      ? 'Add a snack'
                      : `Choose ${pickerFor.slot}`}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setPickerFor(null)}
                  style={{
                    backgroundColor: `${colors.primary}12`,
                  }}
                  className="h-9 w-9 items-center justify-center rounded-full"
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>
              </View>

              <FlatList
                data={meals}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 18,
                }}
                ListEmptyComponent={
                  <View className="items-center justify-center py-14">
                    <View
                      style={{
                        backgroundColor: `${colors.primary}14`,
                      }}
                      className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
                    >
                      <Ionicons
                        name={
                          pickerFor.slot === 'snack'
                            ? 'fast-food-outline'
                            : 'restaurant-outline'
                        }
                        size={25}
                        color={colors.primary}
                      />
                    </View>

                    <Text className="text-sm font-black text-foreground">
                      {pickerFor.slot === 'snack'
                        ? 'No snacks yet'
                        : 'No meals yet'}
                    </Text>

                    <Text className="mt-1 text-center text-xs text-muted">
                      Add something to your meal library first.
                    </Text>

                    <Pressable
                      onPress={() => {
                        setPickerFor(null);
                        router.push('/(stack)/meal/create-meal');
                      }}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.6 : 1,
                      })}
                      className="mt-4"
                    >
                      <Text
                        style={{ color: colors.primary }}
                        className="text-xs font-black"
                      >
                        Add your first{' '}
                        {pickerFor.slot === 'snack'
                          ? 'snack'
                          : 'meal'}
                      </Text>
                    </Pressable>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handlePickMeal(item.id)}
                    style={({
                      backgroundColor: colors.surface,
                    })}
                    className="mb-2 rounded-2xl border border-gray-200 px-4 py-3.5"
                  >
                    <View className="flex-row items-center">
                      <View
                        style={{
                          backgroundColor: `${colors.primary}14`,
                        }}
                        className="mr-3 h-9 w-9 items-center justify-center rounded-xl"
                      >
                        <Ionicons
                          name={
                            pickerFor.slot === 'snack'
                              ? 'fast-food-outline'
                              : 'restaurant-outline'
                          }
                          size={17}
                          color={colors.primary}
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-sm font-black text-foreground">
                          {item.name}
                        </Text>

                        {!!item.description && (
                          <Text
                            numberOfLines={2}
                            className="mt-1 text-xs leading-4 text-muted"
                          >
                            {item.description}
                          </Text>
                        )}
                      </View>

                      <Ionicons
                        name="add-circle-outline"
                        size={19}
                        color={colors.primary}
                      />
                    </View>
                  </Pressable>
                )}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Snack rule modal */}
      <Modal
        visible={snackRuleModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSnackRuleModalVisible(false)}
      >
        <Pressable
          onPress={() => setSnackRuleModalVisible(false)}
          className="flex-1 items-center justify-center bg-black/45 px-5"
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="w-full rounded-[26px] border p-5"
          >
            <View className="mb-5 flex-row items-center">
              <View
                style={{ backgroundColor: `${colors.primary}14` }}
                className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
              >
                <Ionicons
                  name="options-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View className="flex-1">
                <Text className="text-lg font-black text-foreground">
                  Snack rule
                </Text>

                <Text className="mt-1 text-xs text-muted">
                  Add a simple guideline for this week.
                </Text>
              </View>
            </View>

            <TextInput
              value={snackRuleDraft}
              onChangeText={setSnackRuleDraft}
              placeholder="e.g. Only the listed snacks are allowed this week"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              }}
              className="mb-4 min-h-[100px] rounded-2xl border px-4 py-3.5 text-sm"
            />

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => setSnackRuleModalVisible(false)}
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
                className="flex-1 items-center rounded-xl border py-3.5"
              >
                <Text className="text-sm font-black text-foreground">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveSnackRule}
                style={ ({
                  backgroundColor: colors.primary,
                })}
                className="flex-1 items-center rounded-xl py-3.5"
              >
                <Text className="text-sm font-black text-white">
                  Save Rule
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
      className="flex-row items-center rounded-xl border border-gray-300 px-3.5 py-2.5"
    >
      <Ionicons name={icon} size={15} color={colors.primary} />

      <Text
        style={{ color: colors.primary }}
        className="ml-1.5 text-[11px] font-black"
      >
        {label}
      </Text>
    </Pressable>
  );
}
