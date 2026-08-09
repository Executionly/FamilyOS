import { useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useMealPlanStore } from '@/lib/stores/meal-plan-store';
import { AppHeader } from '@/components/app-header';
import { isAdminAccess } from '@/utils';

export default function ShoppingListScreen() {
  const colors = useColors();
  const { family, currentMember } = useFamilyStore();
  const { currentPlan, shoppingList, loading, generateShoppingList, fetchShoppingList, toggleShoppingItem } = useMealPlanStore();

  const isEditor = isAdminAccess(currentMember?.role)

  useEffect(() => {
    if (family?.id && currentPlan?.id) fetchShoppingList(family.id, currentPlan.id);
  }, [family?.id, currentPlan?.id]);

  const handleRegenerate = () => {
    if (family?.id && currentPlan?.id) generateShoppingList(family.id, currentPlan.id);
  };

  const uncheckedCount = shoppingList.filter((i) => !i.checked).length;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title='Shopping List' showBack/>
      <View style={{ flex: 1, padding: 16 }}>

        {shoppingList.length > 0 && (
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
            {uncheckedCount} of {shoppingList.length} items left
          </Text>
        )}

        {loading ? (
          <View className='flex-1 items-center justify-center'>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={shoppingList}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
                No shopping list yet — generate one from this week's meal plan.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => toggleShoppingItem(item.id, !item.checked)}
                style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
                  borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 8,
                }}
              >
                <Ionicons
                  name={item.checked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={item.checked ? colors.primary : colors.muted}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    flex: 1, fontSize: 14, color: colors.foreground,
                    textDecorationLine: item.checked ? 'line-through' : 'none',
                    opacity: item.checked ? 0.5 : 1,
                  }}
                >
                  {item.name}
                </Text>
                {item.quantity != null && (
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                  </Text>
                )}
              </Pressable>
            )}
          />
        )}
        {isEditor && <View className='mb-3'>
            <Pressable
            onPress={handleRegenerate}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 16 }}
            >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>Generate from This Week's Plan</Text>
            </Pressable>
        </View>}
      </View>
    </ScreenContainer>
  );
}