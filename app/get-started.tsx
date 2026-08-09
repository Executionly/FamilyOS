import { Link, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { Ionicons } from "@expo/vector-icons";


export default function GetStartedScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer
      containerClassName="bg-background"
      safeAreaClassName="bg-background"
    >
        <ScrollView>
            <View className="flex-1 px-6">

                {/* Decorative Background */}
                <View
                className="absolute -top-28 -right-20 h-72 w-72 rounded-full"
                style={{
                    backgroundColor: `${colors.primary}12`,
                }}
                />

                <View
                className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full"
                style={{
                    backgroundColor: `${colors.primary}08`,
                }}
                />

                {/* Hero */}
                <View className="flex-1 items-center justify-center">

                    {/* Replace this with your illustration */}
                    <View
                        className="mb-10 h-56 w-56 items-center justify-center rounded-full"
                        style={{
                        backgroundColor: `${colors.primary}15`,
                        }}
                    >
                        <Text style={{ fontSize: 90 }}>🏡</Text>
                    </View>

                    {/* Logo */}
                    <Text className="mb-3 text-5xl font-bold text-foreground">
                        Fambound
                    </Text>

                    <Text className="mb-3 text-center text-3xl font-bold text-foreground">
                        Build one home for everyone you love.
                    </Text>

                    <Text className="mb-10 px-6 text-center text-base leading-6 text-muted">
                        Organize schedules, chat together, plan meals, assign chores and
                        let your family's AI keep everyone connected.
                    </Text>

                    {/* Features */}

                    <View className="w-full gap-3">

                        <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
                            <Ionicons name="calendar" size={24} color="#0369A1" />
                            <View className="ml-3">
                                <Text className="font-semibold text-foreground">
                                Shared Calendar
                                </Text>
                                <Text className="text-sm text-muted">
                                Never miss an important family moment.
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
                            <Ionicons name="chatbubbles" size={24} color="#0369A1" />
                            <View className="ml-3 ">
                                <Text className="font-semibold text-foreground">
                                Family Chat
                                </Text>
                                <Text className="text-sm text-muted">
                                Stay connected wherever everyone is.
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
                            <Ionicons name="sparkles" size={24} color="#0369A1" />
                            <View className="ml-3">
                                <Text className="font-semibold text-foreground">
                                AI Family Assistant
                                </Text>
                                <Text className="text-sm text-muted">
                                Meals, reminders, planning and more.
                                </Text>
                            </View>
                        </View>

                    </View>
                </View>

                {/* Bottom */}

                <View className="pb-8 mt-3">

                    <TouchableOpacity
                        onPress={() => router.push("/(auth)/sign-up")}
                        className="mb-4 items-center rounded-xl bg-primary py-4"
                    >
                        <Text className="text-base font-semibold text-white">
                        Get Started
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row items-center justify-center">
                        <Text className="text-sm text-muted">
                        Already have an account?{" "}
                        </Text>

                        <Link href="/(auth)/sign-in" asChild>
                        <Pressable>
                            <Text className="text-sm font-semibold text-primary">
                            Sign In
                            </Text>
                        </Pressable>
                        </Link>
                    </View>

                </View>

            </View>
        </ScrollView>
    </ScreenContainer>
  );
}