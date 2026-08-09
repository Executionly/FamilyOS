import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { COUNTRIES } from '@/constants/countries';
import { useColors } from '@/hooks/use-colors';

interface Props {
  visible: boolean;
  selected: string | null;
  onSelect: (country: string) => void;
  onClose: () => void;
}

export function CountryPickerModal({ visible, selected, onSelect, onClose }: Props) {
  const colors = useColors();
  const [search, setSearch] = useState('');

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-background rounded-t-2xl max-h-[75%] p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-foreground">Select Country</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary font-semibold">Done</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Search country"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base mb-3"
            style={{ color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                }}
                className={`flex-row items-center py-3 px-2 rounded-lg ${item.name === selected ? 'bg-primary/10' : ''}`}
              >
                <Text className="text-base mr-2">{item.flag}</Text>
                <Text className={item.name === selected ? 'text-primary font-semibold' : 'text-foreground'}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
}