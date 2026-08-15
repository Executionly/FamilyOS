import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = 'appl_xxx';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';
let purchasesInitialized = false;
export function initPurchases(familyId: string) {
  if (purchasesInitialized) return;
  if(Platform.OS === 'ios') return
  purchasesInitialized = true;
  // Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE)
  Purchases.configure({
    // apiKey: Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID,
    apiKey: REVENUECAT_API_KEY_ANDROID,
    appUserID: familyId, // this is what makes app_user_id in the webhook match your family_id
  });
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  // console.log('All offerings:', JSON.stringify(offerings.all));
  // console.log('Current offering:', JSON.stringify(offerings.current));
  return offerings.current;
}

export async function purchasePackage(pkg: any) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}