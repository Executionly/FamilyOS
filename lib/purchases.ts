import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = 'appl_xxx'; // from RevenueCat dashboard
const REVENUECAT_API_KEY_ANDROID = 'goog_xxx';
let purchasesInitialized = false;

export function initPurchases(familyId: string) {
  if (purchasesInitialized) return;
  purchasesInitialized = true;
  Purchases.configure({
    apiKey: Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID,
    appUserID: familyId, // this is what makes app_user_id in the webhook match your family_id
  });
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: any) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}