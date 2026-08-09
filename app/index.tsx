import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store';
import { router, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGES } from '@/constants/images';


type AppStatusType = 'BOOTSTRAPPING' | 'UNAUTHENTICATED' | 'AUTHENTICATED'
const index = () => {
    const segments = useSegments();
    const [appStatus, setAppStatus] = useState<AppStatusType>("BOOTSTRAPPING")
    const { initialize, isAuthenticated, loading: authLoading } = useAuthStore();
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.96)).current;
    const translateY = useRef(new Animated.Value(8)).current;

    useEffect(() => {
        const init = async () => {
            await initialize();
        };

        init();
    }, [initialize]);

    // useEffect(() => {
    //     if (authLoading) return; // wait for initialize to finish resolving either way

    //     const inAuthGroup = segments[0] === '(auth)';

    //     if (!isAuthenticated && !inAuthGroup) {
    //     router.replace('/sign-in');
    //     } else if (isAuthenticated && inAuthGroup) {
    //     router.replace('/(tabs)');
    //     }
    // }, [authLoading, isAuthenticated, segments]);

    useEffect(() => {
        if (appStatus !== 'BOOTSTRAPPING') return

        opacity.setValue(0);
        scale.setValue(0.96);
        translateY.setValue(8);

        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 700,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 1,
                duration: 700,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 700,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, [appStatus])

    useEffect(() => {
        if (authLoading) return;

        const start = Date.now();

        const nextStatus = isAuthenticated
            ? "AUTHENTICATED"
            : "UNAUTHENTICATED";

        const MIN_SPLASH = 3000;

        const timeout = setTimeout(() => {
            setAppStatus(nextStatus);
        }, Math.max(0, MIN_SPLASH - (Date.now() - start)));

        return () => clearTimeout(timeout);
    }, [authLoading, isAuthenticated]);

    useEffect(() => {
        if(authLoading) return
        if (appStatus === 'UNAUTHENTICATED') {
            router.replace('/get-started')
        }
        
        if (appStatus === 'AUTHENTICATED') {
            router.replace('/(tabs)')
        }
    }, [appStatus,authLoading])

  if (appStatus === 'BOOTSTRAPPING') {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <View className="items-center justify-center flex-1">
                    <Animated.Image
                        source={IMAGES.logo}
                        resizeMode="contain"
                        className="w-40 h-40"
                        style={{
                            opacity,
                            transform: [
                                { scale },
                                { translateY },
                            ],
                        }}
                    />
                    {/* <Animated.View
                        className="w-40 h-40 bg-primary-light rounded-full"
                    >
                    </Animated.View>
                    <Text className='text-lg font-bold text-primary-light text-center mt-1 italic'>
                        Fambound™
                    </Text> */}
                </View>
            </SafeAreaView>
        );
    }

    return null
}

export default index
