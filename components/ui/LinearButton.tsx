import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useColors } from '@/hooks/use-colors'
import { Ionicons } from '@expo/vector-icons'
import { ComponentProps } from "react";

const LinearButton = ({onPress, title,icon}:{
    onPress: ()=>void;
    title: string;
    icon: ComponentProps<typeof Ionicons>["name"];
}) => {
    const colors = useColors()
  return (
    <Pressable onPress={onPress} style={{flex: 1}}>
        {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.85 : 1, borderRadius: 14 }} className="overflow-hidden">
            <LinearGradient
            colors={[colors.primary, colors.primary + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            
            >
            <View className="py-4 items-center flex-row justify-center">
                <Ionicons name={icon} size={16} color={colors.background} style={{ marginRight: 6 }} />
                <Text className="text-background font-bold text-sm">
                    {title}
                </Text>
            </View>
            </LinearGradient>
        </View>
        )}
    </Pressable>
  )
}

export default LinearButton

const styles = StyleSheet.create({})