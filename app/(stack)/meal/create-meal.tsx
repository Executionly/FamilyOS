import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMealStore, MealIngredient } from '@/lib/stores/meal-store';
import { AppHeader } from '@/components/app-header';

const TAG_OPTIONS = ['vegetarian', 'kid-friendly', 'quick', 'budget', 'special-occasion'];

export default function CreateMealScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { createMeal, loading, error } = useMealStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [servings, setServings] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<MealIngredient[]>([{ name: '', quantity: null, unit: '' }]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [category, setCategory] = useState<'meal' | 'snack'>('meal');

  const updateIngredient = (index: number, field: keyof MealIngredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === index
          ? { ...ing, [field]: field === 'quantity' ? (value ? Number(value) : null) : value }
          : ing
      )
    );
  };

  const addIngredientRow = () => setIngredients((prev) => [...prev, { name: '', quantity: null, unit: '' }]);
  const removeIngredientRow = (index: number) => setIngredients((prev) => prev.filter((_, i) => i !== index));

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const handleSubmit = async () => {
    setValidationError(null);
    if (!name.trim()) {
      setValidationError('Please enter a meal name');
      return;
    }
    if (!family?.id || !currentMember?.user_id) return;

    const cleanIngredients = ingredients.filter((i) => i.name.trim());

    try {
      await createMeal(
        family.id,
        currentMember.user_id,
        {
          name: name.trim(),
          description: description.trim() || undefined,
          prep_minutes: prepMinutes ? Number(prepMinutes) : undefined,
          servings: servings ? Number(servings) : undefined,
          category,
          tags,
        },
        cleanIngredients
      );
      router.back();
    } catch {
      // error already in store
    }
  };

  const displayError = validationError || error;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title='Create Meal' showBack/>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {displayError && (
          <View style={{ backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#DC2626', fontSize: 13 }}>{displayError}</Text>
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 6 }}>Meal Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Jollof Rice with Chicken"
          placeholderTextColor={colors.muted}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.foreground, marginBottom: 16 }}
        />

        <Text className="mb-2 text-sm font-bold text-foreground">Type</Text>
        <View className="mb-4 flex-row gap-2">
        <Pressable
            onPress={() => setCategory('meal')}
            className={`flex-1 items-center rounded-xl border py-3 ${
            category === 'meal' ? 'border-primary bg-primary' : 'border-border bg-surface'
            }`}
        >
            <Text className={`text-sm font-semibold ${category === 'meal' ? 'text-white' : 'text-foreground'}`}>
            Meal
            </Text>
            <Text className={`mt-0.5 text-[10px] ${category === 'meal' ? 'text-white/80' : 'text-muted'}`}>
            Breakfast, lunch, dinner
            </Text>
        </Pressable>
        <Pressable
            onPress={() => setCategory('snack')}
            className={`flex-1 items-center rounded-xl border py-3 ${
            category === 'snack' ? 'border-primary bg-primary' : 'border-border bg-surface'
            }`}
        >
            <Text className={`text-sm font-semibold ${category === 'snack' ? 'text-white' : 'text-foreground'}`}>
            Snack
            </Text>
            <Text className={`mt-0.5 text-[10px] ${category === 'snack' ? 'text-white/80' : 'text-muted'}`}>
            Anytime snack option
            </Text>
        </Pressable>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 6 }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional notes"
          placeholderTextColor={colors.muted}
          multiline
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.foreground, marginBottom: 16, minHeight: 60 }}
        />

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 6 }}>Prep (min)</Text>
            <TextInput
              value={prepMinutes}
              onChangeText={setPrepMinutes}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={colors.muted}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.foreground }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 6 }}>Servings</Text>
            <TextInput
              value={servings}
              onChangeText={setServings}
              keyboardType="number-pad"
              placeholder="4"
              placeholderTextColor={colors.muted}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.foreground }}
            />
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>Tags</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {TAG_OPTIONS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? '#fff' : colors.foreground }}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>Ingredients</Text>
        {ingredients.map((ing, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <TextInput
              value={ing.name}
              onChangeText={(v) => updateIngredient(i, 'name', v)}
              placeholder="Ingredient"
              placeholderTextColor={colors.muted}
              style={{ flex: 2, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.foreground }}
            />
            <TextInput
              value={ing.quantity != null ? String(ing.quantity) : ''}
              onChangeText={(v) => updateIngredient(i, 'quantity', v)}
              placeholder="Qty"
              keyboardType="numeric"
              placeholderTextColor={colors.muted}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.foreground }}
            />
            <TextInput
              value={ing.unit ?? ''}
              onChangeText={(v) => updateIngredient(i, 'unit', v)}
              placeholder="Unit"
              placeholderTextColor={colors.muted}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.foreground }}
            />
            {ingredients.length > 1 && (
              <Pressable onPress={() => removeIngredientRow(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={colors.muted} />
              </Pressable>
            )}
          </View>
        ))}

        <Pressable onPress={addIngredientRow} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 6, fontSize: 13 }}>Add Ingredient</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Save Meal</Text>}
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}