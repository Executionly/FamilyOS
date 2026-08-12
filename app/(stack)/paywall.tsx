import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFamilyStore } from '@/lib/stores/family-store';
import { getOfferings, initPurchases, purchasePackage, restorePurchases } from '@/lib/purchases';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';
import { useAuthStore } from '@/lib/stores/auth-store';

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
  const { initialize } = useAuthStore();
  const { family } = useFamilyStore();
  const {onboarded} = useLocalSearchParams()

  const [offering, setOffering] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);


  useEffect(() => {
    (async () => {
      if(onboarded === 'true') {
        await initialize()
      }
      try {
        initPurchases(family?.id!);
        const current = await getOfferings();
        console.log('Loaded offerings:', current);
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
  }, [onboarded]);

  const handlePurchase = async () => {
    if (!selectedPackage || !family?.id) return;
    setPurchasing(true);
    setError(null);
    try {
      await purchasePackage(selectedPackage);

      // Purchase succeeded on-device — now wait for the webhook to actually
      // land and flip subscription_tier before treating this as "done"
      setPurchasing(false);
      setConfirming(true);

      const confirmed = await useSubscriptionStore.getState().pollUntilPremium(family.id);

      setConfirming(false);

      if (confirmed) {
        router.back();
      } else {
        // Purchase went through on RevenueCat's side, but our webhook hasn't
        // reflected it yet — don't block the user, just let them know
        setError("Your purchase went through — it may take a moment to fully activate. You're all set, just give it a minute.");
      }
    } catch (err: any) {
      setPurchasing(false);
      setConfirming(false);
      if (!err?.userCancelled) {
        setError('Purchase failed. Please try again.');
      }
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

  const handleNavigateBack = () => {
    if(onboarded === 'true') {
      router.replace('/(tabs)');
      return;
    }
    router.back();
  }

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
        <Pressable 
        onPress={handleNavigateBack} 
        className="mb-4 self-end">
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
          <View className="mb-4 rounded-lg border border-error p-3">
            <Text className="text-xs text-error">{error}</Text>
          </View>
        )}

        {/* Package selection — pulled live from RevenueCat, never hardcoded */}
        <View className="mb-6 gap-2">
          {(offering?.availablePackages ?? []).map((pkg: any) => {
            const isSelected = selectedPackage?.identifier === pkg.identifier;
            const isAnnual = pkg.packageType === 'ANNUAL';
            console.log("PKG", pkg)
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
                        {/* {isAnnual ? 'Annual' : 'Monthly'}  */}
                        {pkg?.product?.title}
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
          disabled={purchasing || confirming || !selectedPackage}
          className="items-center rounded-2xl bg-primary py-4"
        >
          {purchasing || confirming ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#fff" />
              <Text className="text-sm font-semibold text-white">
                {confirming ? 'Confirming your subscription...' : 'Processing...'}
              </Text>
            </View>
          ) : (
            <Text className="text-base font-bold text-white">Upgrade to Premium</Text>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} disabled={purchasing} className="mt-4 items-center">
          <Text className="text-xs font-semibold text-muted">Restore Purchases</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}