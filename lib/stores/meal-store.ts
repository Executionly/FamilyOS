import { create } from 'zustand';
import { supabase } from '@/lib/_core/supabase';
import { embedContent } from '../services/embed-content';

export interface MealIngredient {
  id?: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  sort_order?: number;
}

export interface Meal {
  id: string;
  family_id: string;
  name: string;
  description?: string;
  prep_minutes?: number;
  category: 'meal' | 'snack';
  servings?: number;
  photo_url?: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  meal_ingredient?: MealIngredient[];
}

interface MealState {
  meals: Meal[];
  loading: boolean;
  error: string | null;

  fetchMeals: (familyId: string) => Promise<void>;
  createMeal: (
    familyId: string,
    createdBy: string,
    meal: { name: string; description?: string; category?: 'meal' | 'snack'; prep_minutes?: number; servings?: number; tags?: string[] },
    ingredients: MealIngredient[]
  ) => Promise<Meal>;
  updateMeal: (
    mealId: string,
    updates: Partial<Pick<Meal, 'name' | 'description' | 'prep_minutes' | 'servings' | 'tags' | 'photo_url'>>,
    ingredients?: MealIngredient[]
  ) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
}

export const useMealStore = create<MealState>((set, get) => ({
  meals: [],
  loading: false,
  error: null,

  fetchMeals: async (familyId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meal')
        .select('*, meal_ingredient(*)')
        .eq('family_id', familyId)
        .order('name');

      if (error) throw error;
      set({ meals: data || [], error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch meals';
      set({ error: message });
    } finally {
      set({ loading: false });
    }
  },

  createMeal: async (familyId, createdBy, meal, ingredients) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meal')
        .insert([{ family_id: familyId, created_by: createdBy, tags: [], ...meal }])
        .select()
        .single();
console.log("error",error)
      if (error) throw error;

      if (ingredients.length > 0) {
        const { error: ingError } = await supabase.from('meal_ingredient').insert(
          ingredients.map((ing, i) => ({
            meal_id: data.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit, 
            sort_order: i,
          }))
        );
        if (ingError) throw ingError;
      }

      const newMeal = { ...data, meal_ingredient: ingredients };
      set((state) => ({ meals: [...state.meals, newMeal].sort((a, b) => a.name.localeCompare(b.name)), error: null }));

      embedContent({
        family_id: familyId,
        source_type: 'meal',
        source_id: data.id,
        content: `Meal: ${meal.name}. ${meal.description ?? ''} Tags: ${meal.tags?.join(', ') ?? 'none'}. Ingredients: ${ingredients.map((i) => i.name).join(', ')}.`,
      });

      return newMeal;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create meal';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateMeal: async (mealId, updates, ingredients) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meal')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', mealId)
        .select()
        .single();

      if (error) throw error;

      if (ingredients) {
        // Replace ingredient set wholesale — simplest correct approach for an edit form
        await supabase.from('meal_ingredient').delete().eq('meal_id', mealId);
        if (ingredients.length > 0) {
          await supabase.from('meal_ingredient').insert(
            ingredients.map((ing, i) => ({
              meal_id: mealId,
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              sort_order: i,
            }))
          );
        }
      }

      set((state) => ({
        meals: state.meals.map((m) => (m.id === mealId ? { ...m, ...data, meal_ingredient: ingredients ?? m.meal_ingredient } : m)),
        error: null,
      }));

      embedContent({
        family_id: data.family_id,
        source_type: 'meal',
        source_id: mealId,
        content: `Meal: ${data.name}. ${data.description ?? ''} Tags: ${data.tags?.join(', ') ?? 'none'}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update meal';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteMeal: async (mealId: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.from('meal').delete().eq('id', mealId);
      if (error) throw error;
      set((state) => ({ meals: state.meals.filter((m) => m.id !== mealId), error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete meal';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));