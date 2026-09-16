import React from 'react';
import { View, Text } from 'react-native';

export function MemberAvatarStack({ members }: { members: { name: string }[] }, { max = 3 }: { max?: number } = {}) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <View className="flex-row items-center">
      {visible.map((p, i) => (
        <View
          key={i}
          style={{ marginLeft: i > 0 ? -8 : 0 }}
          className="h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#EAF1F5]"
        >
          <Text className="text-[10px] font-bold text-[#044768]">{p.name.charAt(0).toUpperCase()}</Text>
        </View>
      ))}
      {overflow > 0 && (
        <View style={{ marginLeft: -8 }} className="h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#7C8A94]">
          <Text className="text-[10px] font-bold text-white">+{overflow}</Text>
        </View>
      )}
    </View>
  );
}