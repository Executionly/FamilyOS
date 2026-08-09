import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMealStore } from '@/lib/stores/meal-store';
import { useMealPlanStore, MealSlot, MealPlanItem } from '@/lib/stores/meal-plan-store';
import { AppHeader } from '@/components/app-header';
import { TextInput } from 'react-native';
import { isAdminAccess } from '@/utils';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS: { key: MealSlot; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
];

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function MealPlannerScreen() {
    const router = useRouter();
    const colors = useColors();
    const { family, currentMember } = useFamilyStore();
    const { meals, fetchMeals } = useMealStore();
    const { currentPlan, loading, fetchPlanForWeek, createPlan, duplicatePlan, setPlanItem, removePlanItem } = useMealPlanStore();

    const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
    const [pickerFor, setPickerFor] = useState<{ day: number; slot: MealSlot } | null>(null);
    const [snackRuleModalVisible, setSnackRuleModalVisible] = useState(false);
    const [snackRuleDraft, setSnackRuleDraft] = useState('');
    const { updateSnackRule } = useMealPlanStore();

    const isEditor = isAdminAccess(currentMember?.role)
    const weekStartStr = weekStart.toISOString().split('T')[0];

    useEffect(() => {
        if (family?.id) {
        fetchMeals(family.id);
        fetchPlanForWeek(family.id, weekStartStr);
        }
    }, [family?.id, weekStartStr]);

    const itemsByDaySlot = useMemo(() => {
        const map: Record<string, MealPlanItem[]> = {};
        (currentPlan?.meal_plan_item ?? []).forEach((item) => {
            const key = `${item.day_of_week}-${item.slot}`;
            map[key] = [...(map[key] ?? []), item];
        });
        return map;
    }, [currentPlan]);

    const changeWeek = (delta: number) => {
        const next = new Date(weekStart);
        next.setDate(weekStart.getDate() + delta * 7);
        setWeekStart(next);
    };

    const handleCellPress = async (day: number, slot: MealSlot) => {
        if (!isEditor) return;

        let planId = currentPlan?.id;
        if (!planId) {
        if (!family?.id || !currentMember?.user_id) return; // ← user.id, not currentMember.id
            const newPlan = await createPlan(family.id, currentMember.user_id, weekStartStr); // ← user.id
            planId = newPlan.id;
        }
        setPickerFor({ day, slot });
    };

    const handlePickMeal = async (mealId: string) => {
        if (!pickerFor || !currentPlan) return;
        try {
            await setPlanItem(currentPlan.id, pickerFor.day, pickerFor.slot, mealId);
            setPickerFor(null);
        } catch (err) {
            console.error('Failed to set meal:', err);
            alert('Something went wrong saving that meal. Please try again.');
        }
    };

    const handleDuplicateLastWeek = async () => {
        if (!family?.id || !currentMember?.user_id) return;
        const lastWeek = new Date(weekStart);
        lastWeek.setDate(weekStart.getDate() - 7);
        const lastWeekStr = lastWeek.toISOString().split('T')[0];

        // Find last week's plan first
        const { data } = await (await import('@/lib/_core/supabase')).supabase
        .from('meal_plan')
        .select('id')
        .eq('family_id', family.id)
        .eq('week_start_date', lastWeekStr)
        .maybeSingle();

        if (!data) {
        alert('No plan found for last week to duplicate.');
        return;
        }

        await duplicatePlan(family.id, currentMember.user_id, data.id, weekStartStr);
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
            const newPlan = await createPlan(family.id, currentMember.user_id, weekStartStr);
                planId = newPlan.id;
            }
            await updateSnackRule(planId, snackRuleDraft.trim());
            setSnackRuleModalVisible(false);
        } catch (err) {
            console.error('Failed to save snack rule:', err);
            alert('Something went wrong saving the snack rule.');
        }
    };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title='Meal Planner' showBack/>
        {/* Week navigator */}
        <View className='pb-2'
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: colors.border }}>
            <Pressable onPress={() => changeWeek(-1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
            Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Pressable onPress={() => changeWeek(1)} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
            </Pressable>
        </View>

        {isEditor && (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-grow-0 h-14"
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, alignItems: 'center', gap: 8 }}
            >
                <Pressable
                onPress={handleDuplicateLastWeek}
                className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2"
                >
                <Ionicons name="repeat-outline" size={16} color={colors.primary} />
                <Text className="text-xs font-semibold text-primary">Use Last Week</Text>
                </Pressable>

                <Pressable
                onPress={() => router.push('/(stack)/meal/library')}
                className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2"
                >
                <Ionicons name="book-outline" size={16} color={colors.primary} />
                <Text className="text-xs font-semibold text-primary">Meal Library</Text>
                </Pressable>

                {currentPlan && (
                <Pressable
                    onPress={() => router.push('/(stack)/meal/shopping-list')}
                    className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2"
                >
                    <Ionicons name="cart-outline" size={16} color={colors.primary} />
                    <Text className="text-xs font-bold text-primary">Shopping List</Text>
                </Pressable>
                )}
            </ScrollView>
        )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView className='flex-1 mb-10'
        contentContainerStyle={{ padding: 16, }}>
            <View className='flex-1 px-2'>
                {DAY_NAMES.map((dayLabel, dayIdx) => (
                    <View key={dayIdx} style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>{dayLabel}</Text>

                    {SLOTS.map((slot) => {
                        const items = itemsByDaySlot[`${dayIdx}-${slot.key}`] ?? [];
                        const item = items[0];
                        return (
                        <Pressable
                            key={slot.key}
                            onPress={() => handleCellPress(dayIdx, slot.key)}
                            disabled={!isEditor}
                            style={{
                            flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
                            borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 6,
                            }}
                        >
                            <Ionicons name={slot.icon} size={16} color={colors.muted} style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 11, color: colors.muted, width: 66 }}>{slot.label}</Text>
                            <Text style={{ flex: 1, fontSize: 13, fontWeight: item?.meal ? '600' : '400', color: item?.meal ? colors.foreground : colors.muted }}>
                            {item?.meal?.name ?? 'Tap to add'}
                            </Text>
                            {item?.cook && (
                            <View style={{ backgroundColor: colors.primary + '15', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>{item.cook.name}</Text>
                            </View>
                            )}
                        </Pressable>
                        );
                    })}

                    {/* Snacks — list, not a single cell */}
                    <Pressable
                        onPress={() => handleCellPress(dayIdx, 'snack')}
                        disabled={!isEditor}
                        style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}
                    >
                        <Ionicons name="fast-food-outline" size={14} color={colors.muted} />
                        <Text style={{ fontSize: 11, color: colors.muted, marginRight: 4 }}>Snacks:</Text>
                        {(itemsByDaySlot[`${dayIdx}-snack`] ?? [])?.map((item) => (
                        <View key={item.id} style={{ backgroundColor: '#E4F1F5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>{item.meal?.name}</Text>
                            {isEditor && (
                            <Pressable onPress={() => removePlanItem(item.id)} hitSlop={6}>
                                <Ionicons name="close" size={12} color={colors.primary} />
                            </Pressable>
                            )}
                        </View>
                        ))}
                        {isEditor && (
                        <View style={{ borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, color: colors.muted }}>+ Add</Text>
                        </View>
                        )}
                    </Pressable>
                    </View>
                ))}

                {isEditor && (
                    <Pressable
                        onPress={() => setSnackRuleModalVisible(true)}
                        className="mt-2 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3"
                    >
                        <View className="flex-1">
                        <Text className="text-[11px] font-bold text-muted">SNACK RULE</Text>
                        <Text className="mt-0.5 text-sm text-foreground">
                            {currentPlan?.snack_rule_note || 'No rule set — tap to add one'}
                        </Text>
                        </View>
                        <Ionicons name="pencil-outline" size={16} color={colors.muted} />
                    </Pressable>
                )}

                {currentPlan?.snack_rule_note && (
                    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 4 }}>SNACK RULE</Text>
                    <Text style={{ fontSize: 13, color: colors.foreground }}>{currentPlan.snack_rule_note}</Text>
                    </View>
                )}
            </View>
        </ScrollView>
      )}

      {/* Meal picker modal */}
      {pickerFor && (
        <Modal
            visible={!!pickerFor}
            animationType="slide"
            transparent
            onRequestClose={() => setPickerFor(null)}
        >
            <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setPickerFor(null)}
            >
            <Pressable
                className="min-h-[400px] max-h-[70%] rounded-t-3xl bg-background p-4"
                onPress={(e) => e.stopPropagation()}
            >
                <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-foreground">
                    {pickerFor?.slot === 'snack' ? 'Add a Snack' : `Choose ${pickerFor?.slot}`}
                </Text>
                <Pressable onPress={() => setPickerFor(null)}>
                    <Text className="font-semibold text-primary">Cancel</Text>
                </Pressable>
                </View>

                <FlatList
                data={meals}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ flexGrow: 1 }}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-10">
                        <Text className="mb-2 text-muted">
                            {pickerFor?.slot === 'snack' ? 'No snacks in your library yet.' : 'No meals in your library yet.'}
                        </Text>
                        <Pressable onPress={() => { setPickerFor(null); router.push('/(stack)/meal/create-meal'); }}>
                            <Text className="font-bold text-primary">
                            {pickerFor?.slot === 'snack' ? 'Add your first snack' : 'Add your first meal'}
                            </Text>
                        </Pressable>
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable
                    onPress={() => handlePickMeal(item.id)}
                    className="border-b border-border py-3"
                    >
                    <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                    {item.description && (
                        <Text className="mt-0.5 text-xs text-muted">{item.description}</Text>
                    )}
                    </Pressable>
                )}
                />
            </Pressable>
            </Pressable>
        </Modal>
        )}

        <Modal visible={snackRuleModalVisible} animationType="fade" transparent onRequestClose={() => setSnackRuleModalVisible(false)}>
            <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => setSnackRuleModalVisible(false)}>
                <Pressable className="w-full rounded-2xl bg-background p-5" onPress={(e) => e.stopPropagation()}>
                <Text className="mb-3 text-base font-bold text-foreground">Snack Rule</Text>
                <TextInput
                    value={snackRuleDraft}
                    onChangeText={setSnackRuleDraft}
                    placeholder="e.g. Only the listed snacks are allowed this week"
                    placeholderTextColor={colors.muted}
                    multiline
                    className="mb-4 min-h-[80px] rounded-xl border border-border p-3 text-sm text-foreground"
                />
                <View className="flex-row gap-2">
                    <Pressable onPress={() => setSnackRuleModalVisible(false)} className="flex-1 items-center rounded-xl border border-border py-3">
                    <Text className="font-semibold text-foreground">Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleSaveSnackRule} className="flex-1 items-center rounded-xl bg-primary py-3">
                    <Text className="font-semibold text-white">Save</Text>
                    </Pressable>
                </View>
                </Pressable>
            </Pressable>
        </Modal>
    </ScreenContainer>
  );
}