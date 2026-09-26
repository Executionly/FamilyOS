import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';


export default function KnowYourFamilyCard() {
    const router = useRouter();
    const colors = useColors();
    return (
        <Pressable
        onPress={() => router.push('/(stack)/my-profile')}
        style={({ pressed }) => [
        {
            backgroundColor: colors.surface,
            // borderColor: `${colors.primary}35`,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: pressed ? 2 : 6 },
            shadowOpacity: pressed ? 0.08 : 0.14,
            shadowRadius: pressed ? 6 : 14,
            elevation: pressed ? 2 : 5,
            transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        ]}
        className="mb-3 overflow-hidden rounded-[18px] border border-muted"
        >
        <View className="flex-row items-center px-4 py-3.5">
            {/* Compact 3D icon tile */}
            <View
            style={{
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.28,
                shadowRadius: 7,
                elevation: 4,
            }}
            className="mr-3.5 h-11 w-11 items-center justify-center rounded-[13px]"
            >
            <View
            style={{
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderColor: 'rgba(255,255,255,0.28)',
            }}
            className="absolute left-1.5 right-1.5 top-1.5 h-2 rounded-full border"
            />

                <Ionicons name="people" size={21} color="#FFFFFF" />
            </View>

            {/* Content */}
            <View className="flex-1">
                <Text className="text-[14px] font-extrabold tracking-[-0.2px] text-foreground">
                    Know Your Family
                </Text>

                <Text
                    numberOfLines={2}
                    className="mt-1 text-[11px] font-medium leading-[15px] text-muted"
                >
                    Understand how each family member is wired and how your strengths
                    and differences fit together.
                </Text>
            </View>

            {/* Simple premium action */}
            <View
            style={{
                backgroundColor: `${colors.primary}12`,
                borderColor: `${colors.primary}28`,
            }}
            className="ml-3 h-8 w-8 items-center justify-center rounded-full border"
            >
                <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={colors.primary}
                />
            </View>
        </View>

        {/* Thin dimensional base edge */}
        <View
            style={{
            backgroundColor: `${colors.primary}22`,
            }}
            className="h-[3px] w-full"
        />
        </Pressable>
    );
}
