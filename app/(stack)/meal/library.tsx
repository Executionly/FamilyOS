import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMealStore } from '@/lib/stores/meal-store';
import { isAdminAccess } from '@/utils';

export default function MealLibraryScreen() {
  const router = useRouter();
  const colors = useColors();

  const { family, currentMember } = useFamilyStore();
  const { meals, loading, fetchMeals, deleteMeal } = useMealStore();

  const isEditor = isAdminAccess(currentMember?.role);

  useEffect(() => {
    if (family?.id) {
      fetchMeals(family.id);
    }
  }, [family?.id]);

  const handleDelete = (meal: (typeof meals)[number]) => {
    Alert.alert(
      'Delete meal',
      `Remove "${meal.name}" from your meal library?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMeal(meal.id),
        },
      ],
    );
  };

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Meal Library" showBack />

      <View className="flex-1 px-4 pt-4">
        {/* Page introduction */}
        <View className="mb-5 flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
              Family kitchen
            </Text>

            <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Meal library
            </Text>

            <Text className="mt-1 text-xs font-medium leading-5 text-muted">
              Save family favourites and reuse them in your weekly plan.
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

        {/* Library summary */}
        {!loading && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}
            className="mb-5 flex-row items-center rounded-[22px] border px-4 py-3.5"
          >
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
            >
              <Ionicons
                name="book-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                Saved recipes
              </Text>

              <Text className="mt-1 text-base font-black text-foreground">
                {meals.length}{' '}
                {meals.length === 1 ? 'meal' : 'meals'}
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.primary}
            />
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center">
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
              Loading your meals
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Preparing your family library
            </Text>
          </View>
        ) : (
          <FlatList
            data={meals}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: isEditor ? 100 : 24,
            }}
            ListEmptyComponent={
              <View className="items-center px-8 py-16">
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}
                  className="h-16 w-16 items-center justify-center rounded-2xl border"
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={29}
                    color={colors.muted}
                  />
                </View>

                <Text className="mt-4 text-base font-black text-foreground">
                  No meals yet
                </Text>

                <Text className="mt-1 text-center text-xs leading-5 text-muted">
                  Add your family&apos;s favourite meals to start building your
                  library.
                </Text>

                {isEditor && (
                  <Pressable
                    onPress={() =>
                      router.push('/(stack)/meal/create-meal')
                    }
                    style={({ pressed }) => ({
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.78 : 1,
                    })}
                    className="mt-5 flex-row items-center rounded-xl px-4 py-3"
                  >
                    <Ionicons name="add" size={17} color="#FFFFFF" />

                    <Text className="ml-1.5 text-xs font-black text-white">
                      Add your first meal
                    </Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
                className="mb-3 overflow-hidden rounded-[22px] border"
              >
                <View className="flex-row items-start px-4 py-4">
                  <View
                    style={{ backgroundColor: `${colors.primary}14` }}
                    className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View className="flex-1 pr-3">
                    <Text className="text-base font-black text-foreground">
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

                  {isEditor && (
                    <Pressable
                      onPress={() => handleDelete(item)}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        backgroundColor: pressed
                          ? '#EF444415'
                          : `${colors.muted}10`,
                        opacity: pressed ? 0.65 : 1,
                      })}
                      className="h-9 w-9 items-center justify-center rounded-xl"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#EF4444"
                      />
                    </Pressable>
                  )}
                </View>

                {!!item.meal_ingredient &&
                  item.meal_ingredient.length > 0 && (
                    <View
                      style={{
                        borderTopColor: colors.border,
                        backgroundColor: `${colors.primary}05`,
                      }}
                      className="border-t px-4 py-3"
                    >
                      <View className="mb-2 flex-row items-center">
                        <Ionicons
                          name="list-outline"
                          size={14}
                          color={colors.primary}
                        />

                        <Text className="ml-2 text-[10px] font-black uppercase tracking-[1.2px] text-muted">
                          Ingredients
                        </Text>
                      </View>

                      <Text className="text-xs leading-5 text-foreground">
                        {item.meal_ingredient
                          .map((ingredient) => ingredient.name)
                          .join(' · ')}
                      </Text>
                    </View>
                  )}

                {!!item.tags && item.tags.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 px-4 pb-4 pt-3">
                    {item.tags.map((tag) => (
                      <View
                        key={tag}
                        style={{
                          backgroundColor: `${colors.primary}12`,
                          borderColor: `${colors.primary}25`,
                        }}
                        className="rounded-full border px-2.5 py-1.5"
                      >
                        <Text
                          style={{ color: colors.primary }}
                          className="text-[10px] font-black"
                        >
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          />
        )}

        {/* Add meal action */}
        {isEditor && !loading && meals.length > 0 && (
          <View className="absolute bottom-12 left-4 right-4">
            <Pressable
              onPress={() =>
                router.push('/(stack)/meal/create-meal')
              }
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
                Add Meal
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
