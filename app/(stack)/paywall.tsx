import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/purchases';

const FEATURES = [
  { icon: 'sparkles', text: 'AI Family Assistant that manages your calendar, tasks & more' },
  { icon: 'bulb-outline', text: 'Personalized family recommendations & insights' },
  { icon: 'people-circle-outline', text: 'AI-assisted family meetings & agendas' },
  { icon: 'compass-outline', text: 'Family mission, vision & values builder' },
  { icon: 'book-outline', text: 'Full family legacy & story building tools' },
  { icon: 'cloud-outline', text: 'Unlimited photo & memory storage' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { family } = useFamilyStore();

  const [offering, setOffering] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const current = await getOfferings();
        setOffering(current);
        // Default to the annual package if present — matches "recommended" from the pricing doc
        const annual = current?.availablePackages?.find((p: any) => p.packageType === 'ANNUAL');
        setSelectedPackage(annual ?? current?.availablePackages?.[0] ?? null);
      } catch (err) {
        console.error('Failed to load offerings:', err);
        setError('Could not load pricing. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    setError(null);
    try {
      await purchasePackage(selectedPackage);
      // family.subscription_tier updates via the RevenueCat webhook — give it a moment, then close
      router.back();
    } catch (err: any) {
      if (!err?.userCancelled) {
        setError('Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      await restorePurchases();
      router.back();
    } catch {
      setError('Nothing to restore, or restore failed.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} className="mb-4 self-end">
          <Ionicons name="close" size={24} color={colors.muted} />
        </Pressable>

        <View className="mb-6 items-center">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text className="text-center text-2xl font-extrabold text-foreground">
            Unlock Your Family's Intelligence Layer
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">
            AI-powered guidance, deeper insights, and tools to help your family grow together.
          </Text>
        </View>

        <View className="mb-6">
          {FEATURES.map((f) => (
            <View key={f.text} className="mb-3 flex-row items-start">
              <Ionicons name={f.icon as any} size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <Text className="ml-3 flex-1 text-sm text-foreground">{f.text}</Text>
            </View>
          ))}
        </View>

        {error && (
          <View className="mb-4 rounded-lg border border-error/20 bg-error/10 p-3">
            <Text className="text-xs text-error">{error}</Text>
          </View>
        )}

        {/* Package selection — pulled live from RevenueCat, never hardcoded */}
        <View className="mb-6 gap-2">
          {(offering?.availablePackages ?? []).map((pkg: any) => {
            const isSelected = selectedPackage?.identifier === pkg.identifier;
            const isAnnual = pkg.packageType === 'ANNUAL';
            return (
              <Pressable
                key={pkg.identifier}
                onPress={() => setSelectedPackage(pkg)}
                className={`rounded-2xl border-2 p-4 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-foreground">
                        {isAnnual ? 'Annual' : 'Monthly'}
                      </Text>
                      {isAnnual && (
                        <View className="rounded-full bg-primary px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-white">BEST VALUE</Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-1 text-lg font-extrabold text-foreground">
                      {pkg.product.priceString}
                      <Text className="text-xs font-normal text-muted">
                        {isAnnual ? '/year' : '/month'}
                      </Text>
                    </Text>
                  </View>
                  <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                    {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
          className="items-center rounded-2xl bg-primary py-4"
        >
          {purchasing ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">Upgrade to Premium</Text>}
        </Pressable>

        <Pressable onPress={handleRestore} disabled={purchasing} className="mt-4 items-center">
          <Text className="text-xs font-semibold text-muted">Restore Purchases</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}