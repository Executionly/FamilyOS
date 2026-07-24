import { ScrollView, Text, View, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

export default function ProfileScreen() {
  const colors = useColors();

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 py-8">
          <Text className="text-2xl font-bold text-foreground mb-6">Profile</Text>
          
          <View 
            className="flex-1 rounded-lg border border-border p-6 justify-center items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-lg font-semibold text-foreground mb-2">Coming Soon</Text>
            <Text className="text-muted text-center">
              Profile settings and family member management will be available soon.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
