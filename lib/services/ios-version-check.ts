
import * as Application from 'expo-application';
import { Linking } from 'react-native';

const APP_STORE_ID = process.env.EXPO_PUBLIC_APP_STORE_ID;

type AppStoreLookupResponse = {
  resultCount: number;
  results?: Array<{
    version?: string;
    trackViewUrl?: string;
  }>;
};

export type IOSUpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  storeUrl: string;
};

function compareVersions(current: string, latest: string): boolean {
  const parse = (version: string) =>
    version.split('.').map((part) => {
      const match = part.match(/^\d+/);
      return match ? Number(match[0]) : 0;
    });

  const currentParts = parse(current);
  const latestParts = parse(latest);
  const length = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < length; i++) {
    const installed = currentParts[i] ?? 0;
    const published = latestParts[i] ?? 0;

    if (published > installed) return true;
    if (published < installed) return false;
  }

  return false;
}

export async function checkIOSVersion(): Promise<IOSUpdateInfo | null> {
  if (!APP_STORE_ID) {
    console.warn('EXPO_PUBLIC_APP_STORE_ID is not configured.');
    return null;
  }

  const currentVersion = Application.nativeApplicationVersion;

  if (!currentVersion) {
    return null;
  }

  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(
        APP_STORE_ID,
      )}`,
    );

    if (!response.ok) {
      throw new Error(`App Store lookup failed: ${response.status}`);
    }

    const data = (await response.json()) as AppStoreLookupResponse;
    const app = data.results?.[0];

    if (data.resultCount === 0 || !app?.version) {
      return null;
    }

    if (!compareVersions(currentVersion, app.version)) {
      return null;
    }

    return {
      currentVersion,
      latestVersion: app.version,
      storeUrl: `https://apps.apple.com/app/id${APP_STORE_ID}`,
    };
  } catch (error) {
    // Update checks must never prevent the app from opening.
    console.warn('Unable to check the App Store version:', error);
    return null;
  }
}

export async function openIOSAppStore(storeUrl: string) {
  await Linking.openURL(storeUrl);
}
