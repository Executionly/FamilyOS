import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { embedContent } from '../services/embed-content';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  day_of_week: number; // 0 = Monday
  slot: MealSlot;
  meal_id: string | null;
  assigned_cook: string | null;
  meal?: { id: string; name: string };
  cook?: { id: string; name: string };
}

export interface MealPlan {
  id: string;
  family_id: string;
  week_start_date: string;
  snack_rule_note: string | null;
  created_by: string;
  meal_plan_item: MealPlanItem[];
}

export interface ShoppingListItem {
  id: string;
  family_id: string;
  meal_plan_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
}

interface MealPlanState {
  currentPlan: MealPlan | null;
  shoppingList: ShoppingListItem[];
  loading: boolean;
  error: string | null;

  fetchPlanForWeek: (familyId: string, weekStartDate: string) => Promise<void>;
  createPlan: (familyId: string, createdBy: string, weekStartDate: string, snackRuleNote?: string) => Promise<MealPlan>;
  duplicatePlan: (
    familyId: string,
    createdBy: string,
    fromPlanId: string,
    toWeekStartDate: string
  ) => Promise<MealPlan>;
  setPlanItem: (
    planId: string,
    dayOfWeek: number,
    slot: MealSlot,
    mealId: string | null,
    assignedCook?: string | null
  ) => Promise<void>;
  removePlanItem: (itemId: string) => Promise<void>;
  updateSnackRule: (planId: string, note: string) => Promise<void>;
  generateShoppingList: (familyId: string, planId: string) => Promise<void>;
  toggleShoppingItem: (itemId: string, checked: boolean) => Promise<void>;
  fetchShoppingList: (familyId: string, planId: string) => Promise<void>;
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  currentPlan: null,
  shoppingList: [],
  loading: false,
  error: null,

  fetchPlanForWeek: async (familyId, weekStartDate) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meal_plan')
        .select('*, meal_plan_item(*, meal:meal_id(id, name), cook:assigned_cook(id, name))')
        .eq('family_id', familyId)
        .eq('week_start_date', weekStartDate)
        .maybeSingle();

      if (error) throw error;
      set({ currentPlan: data, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch meal plan';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  createPlan: async (familyId, createdBy, weekStartDate, snackRuleNote) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meal_plan')
        .insert([{ family_id: familyId, created_by: createdBy, week_start_date: weekStartDate, snack_rule_note: snackRuleNote ?? null }])
        .select('*, meal_plan_item(*, meal:meal_id(id, name), cook:assigned_cook(id, name))')
        .single();

      if (error) throw error;
      set({ currentPlan: data, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create meal plan';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // "Use it again" — the core reuse feature
  duplicatePlan: async (familyId, createdBy, fromPlanId, toWeekStartDate) => {
    set({ loading: true });
    try {
      const { data: sourcePlan, error: sourceError } = await supabase
        .from('meal_plan')
        .select('*, meal_plan_item(*)')
        .eq('id', fromPlanId)
        .single();
      if (sourceError) throw sourceError;

      const { data: newPlan, error: planError } = await supabase
        .from('meal_plan')
        .insert([{
          family_id: familyId,
          created_by: createdBy,
          week_start_date: toWeekStartDate,
          snack_rule_note: sourcePlan.snack_rule_note,
        }])
        .select()
        .single();
      if (planError) throw planError;

      const itemsToCopy = (sourcePlan.meal_plan_item ?? []).map((item: MealPlanItem) => ({
        meal_plan_id: newPlan.id,
        day_of_week: item.day_of_week,
        slot: item.slot,
        meal_id: item.meal_id,
        assigned_cook: item.assigned_cook,
      }));

      if (itemsToCopy.length > 0) {
        const { error: itemsError } = await supabase.from('meal_plan_item').insert(itemsToCopy);
        if (itemsError) throw itemsError;
      }

      const { data: fullNewPlan, error: refetchError } = await supabase
        .from('meal_plan')
        .select('*, meal_plan_item(*, meal:meal_id(id, name), cook:assigned_cook(id, name))')
        .eq('id', newPlan.id)
        .single();
      if (refetchError) throw refetchError;

      set({ currentPlan: fullNewPlan, error: null });
      return fullNewPlan;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate meal plan';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Upsert a single slot — used by the weekly grid UI as the admin taps each cell
  setPlanItem: async (planId, dayOfWeek, slot, mealId, assignedCook) => {
    try {
        if (slot === 'snack') {
        // Snacks are a list — always insert a new row, never overwrite
        const { error } = await supabase.from('meal_plan_item').insert([{
            meal_plan_id: planId, day_of_week: dayOfWeek, slot, meal_id: mealId, assigned_cook: assignedCook ?? null,
        }]);
        if (error) throw error;
        } else {
        // breakfast/lunch/dinner — one per day. Check for an existing row, update if found, insert if not.
        const { data: existing, error: findError } = await supabase
            .from('meal_plan_item')
            .select('id')
            .eq('meal_plan_id', planId)
            .eq('day_of_week', dayOfWeek)
            .eq('slot', slot)
            .maybeSingle();

        if (findError) throw findError;

        if (existing) {
            const { error: updateError } = await supabase
            .from('meal_plan_item')
            .update({ meal_id: mealId, assigned_cook: assignedCook ?? null })
            .eq('id', existing.id);
            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await supabase.from('meal_plan_item').insert([{
            meal_plan_id: planId, day_of_week: dayOfWeek, slot, meal_id: mealId, assigned_cook: assignedCook ?? null,
            }]);
            if (insertError) throw insertError;
        }
        }

        const { data: refreshed, error: refetchError } = await supabase
        .from('meal_plan')
        .select('*, meal_plan_item(*, meal:meal_id(id, name), cook:assigned_cook(id, name))')
        .eq('id', planId)
        .single();
        if (refetchError) throw refetchError;

        set({ currentPlan: refreshed, error: null });

        embedContent({
        family_id: refreshed.family_id,
        source_type: 'meal_plan',
        source_id: planId,
        content: buildPlanSummary(refreshed),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update meal plan';
        set({ error: message });
        throw error;
    }
    },

  removePlanItem: async (itemId: string) => {
    try {
      const { error } = await supabase.from('meal_plan_item').delete().eq('id', itemId);
      if (error) throw error;
      set((state) => ({
        currentPlan: state.currentPlan
          ? { ...state.currentPlan, meal_plan_item: state.currentPlan.meal_plan_item.filter((i) => i.id !== itemId) }
          : null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove item';
      set({ error: message });
      throw error;
    }
  },

  updateSnackRule: async (planId: string, note: string) => {
    try {
      const { error } = await supabase.from('meal_plan').update({ snack_rule_note: note }).eq('id', planId);
      if (error) throw error;
      set((state) => ({
        currentPlan: state.currentPlan ? { ...state.currentPlan, snack_rule_note: note } : null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update snack rule';
      set({ error: message });
      throw error;
    }
  },

  // Aggregate ingredients across every meal in the plan into a shopping list
  generateShoppingList: async (familyId: string, planId: string) => {
    set({ loading: true });
    try {
      const { data: items, error: itemsError } = await supabase
        .from('meal_plan_item')
        .select('meal_id')
        .eq('meal_plan_id', planId)
        .not('meal_id', 'is', null);
      if (itemsError) throw itemsError;

      const mealIds = [...new Set((items ?? []).map((i) => i.meal_id))];
      if (mealIds.length === 0) {
        set({ shoppingList: [], loading: false });
        return;
      }

      const { data: ingredients, error: ingError } = await supabase
        .from('meal_ingredient')
        .select('name, quantity, unit')
        .in('meal_id', mealIds);
      if (ingError) throw ingError;

      // Aggregate by name+unit
      const aggregated = new Map<string, { name: string; quantity: number | null; unit: string | null }>();
        (ingredients ?? []).forEach((ing) => {
        const key = `${ing.name.toLowerCase()}::${ing.unit ?? ''}`;
        const existing = aggregated.get(key);
        if (!existing) {
            aggregated.set(key, { name: ing.name, quantity: ing.quantity, unit: ing.unit });
        } else if (existing.quantity != null && ing.quantity != null) {
            existing.quantity += ing.quantity;
        } else if (!existing) {
          aggregated.set(key, { name: ing.name, quantity: ing.quantity, unit: ing.unit });
        }
      });

      // Clear old auto-generated list for this plan, insert fresh
      await supabase.from('shopping_list_item').delete().eq('meal_plan_id', planId);

      const rows = Array.from(aggregated.values()).map((item) => ({
        family_id: familyId,
        meal_plan_id: planId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        checked: false,
      }));

      if (rows.length > 0) {
        const { data, error } = await supabase.from('shopping_list_item').insert(rows).select();
        if (error) throw error;
        set({ shoppingList: data || [], error: null });
      } else {
        set({ shoppingList: [] });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate shopping list';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchShoppingList: async (familyId: string, planId: string) => {
    try {
      const { data, error } = await supabase
        .from('shopping_list_item')
        .select('*')
        .eq('family_id', familyId)
        .eq('meal_plan_id', planId)
        .order('name');
      if (error) throw error;
      set({ shoppingList: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch shopping list';
      set({ error: message });
    }
  },

  toggleShoppingItem: async (itemId: string, checked: boolean) => {
    try {
      const { error } = await supabase.from('shopping_list_item').update({ checked }).eq('id', itemId);
      if (error) throw error;
      set((state) => ({
        shoppingList: state.shoppingList.map((i) => (i.id === itemId ? { ...i, checked } : i)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update item';
      set({ error: message });
    }
  },
}));

function buildPlanSummary(plan: MealPlan): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const byDay: Record<number, string[]> = {};
  plan.meal_plan_item.forEach((item) => {
    const label = `${item.slot}: ${item.meal?.name ?? 'TBD'}`;
    byDay[item.day_of_week] = [...(byDay[item.day_of_week] ?? []), label];
  });
  const summary = days.map((d, i) => `${d}: ${(byDay[i] ?? []).join(', ') || 'nothing planned'}`).join('. ');
  return `Meal plan for week of ${plan.week_start_date}: ${summary}. ${plan.snack_rule_note ? `Snack rule: ${plan.snack_rule_note}` : ''}`;
}