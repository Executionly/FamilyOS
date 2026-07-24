import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const LegacyLayout = () => {
  return (
    <Stack screenOptions={{headerShown: false}}>
        <Stack.Screen name='index'/>
        <Stack.Screen name='add-memory'/>
        <Stack.Screen name='add-story'/>
    </Stack>
  )
}

export default LegacyLayout

const styles = StyleSheet.create({})