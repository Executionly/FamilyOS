
import { Platform } from 'react-native';
import SpInAppUpdates, {
  IAUInstallStatus,
  IAUUpdateKind,
} from 'sp-react-native-in-app-updates';

export const inAppUpdates = new SpInAppUpdates(__DEV__);

export type UpdateDownloadState = {
  downloaded: boolean;
  progress: number;
};

export function listenForUpdateDownload(
  onStateChange: (state: UpdateDownloadState) => void,
) {
  if (Platform.OS !== 'android' || __DEV__) {
    return () => {};
  }

  const listener = (event: {
    status: number;
    bytesDownloaded: number;
    totalBytesToDownload: number;
  }) => {
    const total = event.totalBytesToDownload || 0;
    const progress =
      total > 0
        ? Math.round((event.bytesDownloaded / total) * 100)
        : 0;

    onStateChange({
      downloaded: event.status === IAUInstallStatus.DOWNLOADED,
      progress,
    });
  };

  inAppUpdates.addStatusUpdateListener(listener);

  return () => {
    inAppUpdates.removeStatusUpdateListener(listener);
  };
}

export async function installDownloadedUpdate() {
  if (Platform.OS !== 'android') {
    return;
  }

  inAppUpdates.installUpdate();
}

export async function startFlexibleUpdate() {
  if (Platform.OS !== 'android') {
    return;
  }

  await inAppUpdates.startUpdate({
    updateType: IAUUpdateKind.FLEXIBLE,
  });
}
