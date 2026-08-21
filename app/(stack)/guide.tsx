import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { APP_GUIDE_SECTIONS } from '@/lib/app-guide-content';

export default function GuideScreen() {
  const router = useRouter();
  const colors = useColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Guide" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-1 text-xl font-extrabold text-foreground">What you can do here</Text>
        <Text className="mb-6 text-sm text-muted">
          A quick tour of everything in the app — tap any section to read more.
        </Text>

        <View
          className="overflow-hidden rounded-2xl"
          style={{
            backgroundColor: colors.surface,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          {APP_GUIDE_SECTIONS.map((section, index) => {
            const isExpanded = expandedId === section.id;
            const isLast = index === APP_GUIDE_SECTIONS.length - 1;

            return (
              <View key={section.id} style={{ borderColor: colors.border }} className={!isLast ? 'border-b' : ''}>
                <Pressable
                  onPress={() => setExpandedId(isExpanded ? null : section.id)}
                  className="flex-row items-center px-4 py-4"
                >
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.primary + '1A' }}
                  >
                    <Ionicons name={section.icon as any} size={16} color={colors.primary} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-foreground">{section.title}</Text>
                    <Text className="mt-0.5 text-xs text-muted">{section.summary}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.muted}
                  />
                </Pressable>

                {isExpanded && (
                  <View className="px-4 pb-4">
                    <Text className="text-sm leading-6 text-muted">{section.description}</Text>
                    {/* {section.route && (
                      <Pressable
                        onPress={() => router.push(section.route as any)}
                        className="mt-3 flex-row items-center self-start"
                      >
                        <Text className="text-sm font-semibold text-primary">Go there</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                      </Pressable>
                    )} */}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}