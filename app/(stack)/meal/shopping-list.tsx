import { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMealPlanStore } from '@/lib/stores/meal-plan-store';
import { isAdminAccess } from '@/utils';

export default function ShoppingListScreen() {
  const colors = useColors();

  const { family, currentMember } = useFamilyStore();

  const {
    currentPlan,
    shoppingList,
    loading,
    generateShoppingList,
    fetchShoppingList,
    toggleShoppingItem,
  } = useMealPlanStore();

  const isEditor = isAdminAccess(currentMember?.role);

  useEffect(() => {
    if (family?.id && currentPlan?.id) {
      fetchShoppingList(family.id, currentPlan.id);
    }
  }, [family?.id, currentPlan?.id]);

  const handleRegenerate = () => {
    if (family?.id && currentPlan?.id) {
      generateShoppingList(family.id, currentPlan.id);
    }
  };

  const uncheckedCount = shoppingList.filter(
    (item) => !item.checked,
  ).length;

  const checkedCount = shoppingList.length - uncheckedCount;

  const completionPercentage = useMemo(() => {
    if (!shoppingList.length) return 0;

    return Math.round(
      (checkedCount / shoppingList.length) * 100,
    );
  }, [checkedCount, shoppingList.length]);

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
      <AppHeader title="Shopping List" showBack />

      <View className="flex-1 px-4 pt-4">
        {/* Page introduction */}
        <View className="mb-5 flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[1.6px] text-muted">
              Weekly preparation
            </Text>

            <Text className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Shopping list
            </Text>

            <Text className="mt-1 text-xs font-medium leading-5 text-muted">
              Keep track of everything needed for this week&apos;s meals.
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
              name="cart-outline"
              size={23}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Progress summary */}
        {shoppingList.length > 0 && (
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
            className="mb-5 overflow-hidden rounded-[24px] border"
          >
            <View className="flex-row items-center px-4 py-4">
              <View
                style={{
                  backgroundColor:
                    completionPercentage === 100
                      ? '#10B98118'
                      : `${colors.primary}14`,
                }}
                className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
              >
                <Ionicons
                  name={
                    completionPercentage === 100
                      ? 'checkmark-circle'
                      : 'cart-outline'
                  }
                  size={22}
                  color={
                    completionPercentage === 100
                      ? '#10B981'
                      : colors.primary
                  }
                />
              </View>

              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-[1.3px] text-muted">
                  Your progress
                </Text>

                <Text className="mt-1 text-base font-black text-foreground">
                  {completionPercentage === 100
                    ? 'Everything is checked off'
                    : `${uncheckedCount} ${
                        uncheckedCount === 1 ? 'item' : 'items'
                      } left`}
                </Text>
              </View>

              <Text
                style={{
                  color:
                    completionPercentage === 100
                      ? '#10B981'
                      : colors.primary,
                }}
                className="text-lg font-black"
              >
                {completionPercentage}%
              </Text>
            </View>

            <View
              style={{ backgroundColor: colors.border }}
              className="mx-4 mb-4 h-2 overflow-hidden rounded-full"
            >
              <View
                style={{
                  width: `${completionPercentage}%`,
                  backgroundColor:
                    completionPercentage === 100
                      ? '#10B981'
                      : colors.primary,
                }}
                className="h-full rounded-full"
              />
            </View>

            <View
              style={{
                backgroundColor: `${colors.primary}08`,
                borderTopColor: colors.border,
              }}
              className="flex-row items-center border-t px-4 py-3"
            >
              <Text className="flex-1 text-[11px] font-semibold text-muted">
                {checkedCount} of {shoppingList.length} items completed
              </Text>

              {currentPlan && (
                <Text
                  style={{ color: colors.primary }}
                  className="text-[10px] font-black uppercase tracking-wider"
                >
                  This week
                </Text>
              )}
            </View>
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <View
              style={{ backgroundColor: `${colors.primary}14` }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            >
              <Ionicons
                name="cart-outline"
                size={27}
                color={colors.primary}
              />
            </View>

            <ActivityIndicator color={colors.primary} />

            <Text className="mt-4 text-sm font-black text-foreground">
              Preparing your list
            </Text>

            <Text className="mt-1 text-xs text-muted">
              Loading this week&apos;s ingredients
            </Text>
          </View>
        ) : (
          <FlatList
            data={shoppingList}
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
                    name="cart-outline"
                    size={29}
                    color={colors.muted}
                  />
                </View>

                <Text className="mt-4 text-base font-black text-foreground">
                  No shopping list yet
                </Text>

                <Text className="mt-1 text-center text-xs leading-5 text-muted">
                  Generate a list from this week&apos;s meal plan to see your
                  ingredients here.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  toggleShoppingItem(item.id, !item.checked)
                }
                style={({
                  backgroundColor: colors.surface,
                  borderColor: item.checked
                    ? `${colors.primary}30`
                    : colors.border,
                  transform: [{ scale:  1 }],
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1,
                })}
                className="mb-2.5 flex-row items-center rounded-2xl border px-4 py-3.5"
              >
                <View
                  style={{
                    backgroundColor: item.checked
                      ? colors.primary
                      : 'transparent',
                    borderColor: item.checked
                      ? colors.primary
                      : colors.border,
                  }}
                  className="mr-3 h-6 w-6 items-center justify-center rounded-lg border-2"
                >
                  {item.checked && (
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color="#FFFFFF"
                    />
                  )}
                </View>

                <View className="flex-1">
                  <Text
                    style={{
                      color: colors.foreground,
                      textDecorationLine: item.checked
                        ? 'line-through'
                        : 'none',
                    }}
                    className="text-sm font-bold"
                  >
                    {item.name}
                  </Text>

                  {item.checked && (
                    <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Completed
                    </Text>
                  )}
                </View>

                {item.quantity != null && (
                  <View
                    style={{
                      backgroundColor: item.checked
                        ? `${colors.muted}10`
                        : `${colors.primary}12`,
                    }}
                    className="ml-3 rounded-full px-2.5 py-1.5"
                  >
                    <Text
                      style={{
                        color: item.checked
                          ? colors.muted
                          : colors.primary,
                      }}
                      className="text-xs font-black"
                    >
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ''}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          />
        )}

        {/* Generate action */}
        {isEditor && !loading && (
          <View className="absolute bottom-12 left-4 right-4">
            <Pressable
              onPress={handleRegenerate}
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
              <Ionicons
                name="refresh-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text className="ml-2 text-sm font-black text-white">
                Generate from This Week&apos;s Plan
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
