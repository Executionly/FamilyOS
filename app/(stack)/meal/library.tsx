import { useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMealStore } from '@/lib/stores/meal-store';
import { AppHeader } from '@/components/app-header';
import { isAdminAccess } from '@/utils';

export default function MealLibraryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { meals, loading, fetchMeals, deleteMeal } = useMealStore();
  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    if (family?.id) fetchMeals(family.id);
  }, [family?.id]);

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title='Meal Library' showBack/>
      <View style={{ flex: 1, padding: 16 }}>

        {loading ? (
          <View className='flex-1 items-center justify-center'>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={meals}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>No meals yet — add your first one.</Text>}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{item.name}</Text>
                    {item.description ? <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{item.description}</Text> : null}
                    {item.meal_ingredient && item.meal_ingredient.length > 0 && (
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
                        {item.meal_ingredient.map((i) => i.name).join(', ')}
                      </Text>
                    )}
                    {item.tags?.length > 0 && (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {item.tags.map((tag) => (
                          <View key={tag} style={{ backgroundColor: colors.primary + '15', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '600' }}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <Pressable onPress={() => deleteMeal(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
        {isEditor && <View className='mb-4'>
            <Pressable className=''
            onPress={() => router.push('/(stack)/meal/create-meal')}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 16 }}
            >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Add Meal</Text>
            </Pressable>
        </View>}
      </View>
    </ScreenContainer>
  );
}