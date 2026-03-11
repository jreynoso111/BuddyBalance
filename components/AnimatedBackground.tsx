import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
    Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/components/useColorScheme';

const { width, height } = Dimensions.get('window');

export const AnimatedBackground = ({ children, style }: { children: React.ReactNode, style?: any }) => {
    const colorScheme = useColorScheme();
    const progress = useSharedValue(0);
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 15000, easing: Easing.linear }),
            -1,
            true
        );
    }, []);

    const animatedStyle1 = useAnimatedStyle(() => {
        const translateX = interpolate(progress.value, [0, 1], [-20, 20]);
        const translateY = interpolate(progress.value, [0, 1], [-30, 30]);
        return {
            transform: [{ translateX }, { translateY }, { scale: 1.2 }],
        };
    });

    const animatedStyle2 = useAnimatedStyle(() => {
        const translateX = interpolate(progress.value, [0, 1], [30, -30]);
        const translateY = interpolate(progress.value, [0, 1], [20, -20]);
        return {
            transform: [{ translateX }, { translateY }, { scale: 1.1 }],
        };
    });

    return (
        <View style={[styles.container, isDark && styles.containerDark, style]}>
            {/* Abstract Animated Blobs */}
            <Animated.View style={[styles.blob, styles.blob1, animatedStyle1]}>
                <LinearGradient
                    colors={isDark ? ['#111827', '#1F2937'] : ['#4F46E5', '#818CF8']}
                    style={styles.gradient}
                />
            </Animated.View>
            <Animated.View style={[styles.blob, styles.blob2, animatedStyle2]}>
                <LinearGradient
                    colors={isDark ? ['#1E293B', '#334155'] : ['#7C3AED', '#A78BFA']}
                    style={styles.gradient}
                />
            </Animated.View>
            <View style={[styles.overlay, isDark && styles.overlayDark]} />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Clean white background
    },
    containerDark: {
        backgroundColor: '#020617',
    },
    blob: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: (width * 0.8) / 2,
        opacity: 0.15, // Reduced opacity for subtleness
    },
    blob1: {
        top: -width * 0.2,
        left: -width * 0.2,
    },
    blob2: {
        bottom: -width * 0.2,
        right: -width * 0.2,
    },
    gradient: {
        flex: 1,
        borderRadius: (width * 0.8) / 2,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.4)', // Light white overlay
    },
    overlayDark: {
        backgroundColor: 'rgba(2, 6, 23, 0.42)',
    },
    content: {
        flex: 1,
    },
});
