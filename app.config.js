/** @type {import('expo/config').ExpoConfig} */
const env = {
  appName: "Fambound",
  appSlug: "fambound",
  logoUrl: "",
  scheme: "fambound",
  iosBundleId: "com.app.fambound",
  androidPackage: "com.app.fambound",
};

module.exports = {
  owner: "kinos.family",
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  platforms: ["ios", "android"],
  orientation: "portrait",
  icon: "./assets/images/logo.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff",
      foregroundImage: "./assets/images/logo.png",
      backgroundImage: "./assets/images/logo.png",
      monochromeImage: "./assets/images/logo.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    "expo-router",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/logo.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#ffffff",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          extraProguardRules: "-keep class expo.modules.** { *; }\n-dontwarn expo.modules.**"
        }
      }
    ],
    "expo-asset"
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
  updates: {
    url: "https://u.expo.dev/d688098d-c12b-4669-b7fa-cf0ddffe4132"
  },
  runtimeVersion: {
    policy: "fingerprint"
  },
  extra: {
    eas: {
      projectId: "d688098d-c12b-4669-b7fa-cf0ddffe4132"
    }
  }
};
