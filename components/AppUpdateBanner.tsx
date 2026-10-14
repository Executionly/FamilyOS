import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { installDownloadedUpdate, listenForUpdateDownload, UpdateDownloadState } from '@/lib/services/app-update-manager';
import { checkIOSVersion, IOSUpdateInfo } from '@/lib/services/ios-version-check';


const NAVY = '#102B3A';
const BLUE = '#2263E8';
const MINT = '#B8F1D2';

export default function AppUpdateBanner() {
  const [update, setUpdate] = useState<UpdateDownloadState>({
    downloaded: false,
    progress: 0,
  });

  const [iosUpdate, setIOSUpdate] = useState<IOSUpdateInfo | null>(null);
  const [iosPromptDismissed, setIOSPromptDismissed] = useState(false);

  const checkForIOSUpdate = useCallback(async () => {
    if (Platform.OS !== 'ios' || __DEV__) {
      return;
    }

    const result = await checkIOSVersion();

    setIOSUpdate((previous) => {
      // Reset dismissal if Apple publishes a different version.
      if (previous?.latestVersion !== result?.latestVersion) {
        setIOSPromptDismissed(false);
      }

      return result;
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    return listenForUpdateDownload(setUpdate);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios' || __DEV__) {
      return;
    }

    void checkForIOSUpdate();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkForIOSUpdate();
      }
    });

    return () => subscription.remove();
  }, [checkForIOSUpdate]);

  const isIOSUpdateAvailable =
    Platform.OS === 'ios' &&
    iosUpdate !== null &&
    !iosPromptDismissed;

  const isAndroidUpdateDownloaded =
    Platform.OS === 'android' && update.downloaded;

  const visible = isIOSUpdateAvailable || isAndroidUpdateDownloaded;

  const handleIOSUpdate = async () => {
    if (!iosUpdate) return;

    try {
      await Linking.openURL(iosUpdate.storeUrl);
    } catch (error) {
      console.warn('Unable to open the App Store:', error);
    }
  };

  if (!visible) {
    return null;
  }

  const isIOS = isIOSUpdateAvailable && !!iosUpdate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (Platform.OS === 'ios') {
          setIOSPromptDismissed(true);
        }
      }}
    >
      <View className="flex-1 items-center justify-center bg-[#07131D]/75 px-5 py-8">
        <View className="w-full max-w-sm overflow-hidden rounded-[30px] bg-white shadow-2xl">
          {/* Branded update header */}
          <View className="overflow-hidden bg-[#102B3A] px-6 pb-6 pt-5">
            <View className="absolute -right-10 -top-12 h-44 w-44 rounded-full border-[26px] border-white/5" />
            <View className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-[#FE6A50]/10" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center rounded-full bg-white/10 px-3 py-1.5">
                <View className="mr-2 h-1.5 w-1.5 rounded-full bg-[#8BE0B0]" />
                <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/85">
                  Fambound update
                </Text>
              </View>
              {isIOS && (
                <Pressable
                  onPress={() => setIOSPromptDismissed(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Remind me later"
                  hitSlop={10}
                  className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </Pressable>
              )}
            </View>

            <View className="mt-6 flex-row items-center">
              <View className="h-[62px] w-[62px] items-center justify-center rounded-[21px] bg-[#FE6A50]">
                <Ionicons name={isIOS ? 'arrow-up-circle' : 'cloud-done'} size={31} color="#FFFFFF" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-[1.7px] text-white/55">
                  {isIOS ? 'A fresh version is here' : 'Download complete'}
                </Text>
                <Text className="mt-1 text-2xl font-black text-white">
                  {isIOS ? 'A better Fambound' : 'Ready when you are'}
                </Text>
              </View>
            </View>

            <Text className="mt-5 text-sm leading-[22px] text-white/75">
              {isIOS
                ? 'A new version is ready with the latest improvements and experience. Update when it works for you.'
                : 'The latest version is safely downloaded. Restart Fambound to finish the update and get back to your family.'}
            </Text>
          </View>

          {/* Version details for the App Store update */}
          <View className="px-6 pb-6 pt-5">
            {isIOS && iosUpdate ? (
              <>
                <View className="rounded-[20px] border border-[#E9EEF1] bg-[#F7F9FA] p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#7C8992]">
                        Installed
                      </Text>
                      <Text className="mt-1.5 text-lg font-extrabold text-[#53636E]">
                        {iosUpdate.currentVersion}
                      </Text>
                    </View>
                    <View className="mx-3 h-9 w-9 items-center justify-center rounded-full bg-white">
                      <Ionicons name="arrow-forward" size={16} color={BLUE} />
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#2263E8]">
                        New version
                      </Text>
                      <Text className="mt-1.5 text-lg font-extrabold text-[#102B3A]">
                        {iosUpdate.latestVersion}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center px-1">
                  <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#EAF2FF]">
                    <Ionicons name="shield-checkmark" size={15} color={BLUE} />
                  </View>
                  <Text className="flex-1 text-xs font-medium leading-5 text-[#6E7C86]">
                    Update securely through the Apple App Store.
                  </Text>
                </View>

                <Pressable
                  className="mt-5 min-h-[54px] flex-row items-center justify-center rounded-2xl bg-[#2263E8] px-4"
                  onPress={() => {
                    void handleIOSUpdate();
                  }}
                  accessibilityRole="button"
                >
                  <Text className="text-sm font-extrabold text-white">Update Fambound</Text>
                  <Ionicons name="arrow-up-right-box" size={17} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </Pressable>

                <Pressable
                  className="mt-2 min-h-[44px] items-center justify-center rounded-2xl px-4"
                  onPress={() => setIOSPromptDismissed(true)}
                  accessibilityRole="button"
                >
                  <Text className="text-sm font-bold text-[#6E7C86]">Maybe later</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View className="flex-row items-center rounded-[20px] border border-[#D9F1E3] bg-[#F1FBF5] p-4">
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <Ionicons name="checkmark-circle" size={25} color="#218653" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-[#174C32]">Download complete</Text>
                    <Text className="mt-1 text-xs leading-4 text-[#5E7E6A]">
                      Your update is ready to install.
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row items-start px-1">
                  <Ionicons name="information-circle-outline" size={16} color="#7C8992" />
                  <Text className="ml-2 flex-1 text-xs leading-5 text-[#6E7C86]">
                    Fambound will restart to finish installing the update.
                  </Text>
                </View>

                <Pressable
                  className="mt-5 min-h-[54px] flex-row items-center justify-center rounded-2xl bg-[#2263E8] px-4"
                  onPress={() => {
                    void installDownloadedUpdate();
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={17} color="#FFFFFF" />
                  <Text className="ml-2 text-sm font-extrabold text-white">Restart and update</Text>
                </Pressable>
              </>
            )}

            <View className="mt-5 flex-row items-center justify-center">
              <View className="mr-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: MINT }} />
              <Text className="text-[10px] font-semibold tracking-wide text-[#97A2A9]">
                {isIOS ? 'Your choice, your timing' : 'Downloaded and ready to install'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
