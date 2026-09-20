import { View, Text, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useState } from 'react';

export function PointsInfoButton() {
  const colors = useColors();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        className="w-10 h-10 rounded-xl border items-center justify-center"
      >
        <Ionicons name="help-circle-outline" size={18} color={colors.foreground} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={() => setVisible(false)}>
          <Pressable style={{ backgroundColor: colors.background }} className="w-full rounded-3xl p-6" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center mb-4">
              <View style={{ backgroundColor: `${colors.primary}15` }} className="w-11 h-11 rounded-2xl items-center justify-center mr-3">
                <Ionicons name="calculator-outline" size={20} color={colors.primary} />
              </View>
              <Text className="text-base font-black text-foreground">How Points Work</Text>
            </View>

            <View className="gap-3">
              <View className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginTop: 1 }} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-foreground">Base points: 100</Text>
                  <Text className="text-xs text-muted mt-0.5">Awarded for every correct answer.</Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <Ionicons name="flash" size={18} color="#F59E0B" style={{ marginTop: 1 }} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-foreground">Speed bonus: up to +50</Text>
                  <Text className="text-xs text-muted mt-0.5">
                    The faster you answer correctly, the bigger the bonus — answer instantly for close to
                    +50, or just before time runs out for close to +0.
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <Ionicons name="close-circle" size={18} color="#EF4444" style={{ marginTop: 1 }} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-foreground">Wrong or no answer: 0</Text>
                  <Text className="text-xs text-muted mt-0.5">No points, no penalty — just move on.</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => setVisible(false)}
              style={{ backgroundColor: colors.primary }}
              className="mt-6 items-center rounded-2xl py-3.5"
            >
              <Text className="text-sm font-bold text-white">Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}