import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Wallet, ArrowRight, ShieldCheck, Zap } from 'lucide-react-native';
import { AnimatedBackground } from '@/components/AnimatedBackground';

const { width } = Dimensions.get('window');

export default function LandingPage() {
    const router = useRouter();

    return (
        <AnimatedBackground>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Animated.View
                        entering={FadeInUp.delay(300).duration(1000)}
                        style={styles.logoContainer}
                    >
                        <View style={styles.iconCircle}>
                            <Wallet size={48} color="#818CF8" />
                        </View>
                        <Text style={styles.title}>I GOT YOU</Text>
                        <Text style={styles.subtitle}>Hassle-free lending, for your loved ones.</Text>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInDown.delay(600).duration(1000)}
                        style={styles.featuresContainer}
                    >
                        <FeatureItem
                            icon={<ShieldCheck size={24} color="#A78BFA" />}
                            text="Secure & Reliable"
                        />
                        <FeatureItem
                            icon={<Zap size={24} color="#FBBF24" />}
                            text="Real-time Management"
                        />
                    </Animated.View>

                    <Animated.View
                        entering={FadeInDown.delay(900).duration(1000)}
                        style={styles.ctaContainer}
                    >
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && { transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={() => router.push('/(auth)/login')}
                        >
                            <Text style={styles.buttonText}>Get Started</Text>
                            <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
                        </Pressable>
                    </Animated.View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 jreynoso</Text>
                </View>
            </View>
        </AnimatedBackground>
    );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <View style={styles.featureItem}>
            {icon}
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(129, 140, 248, 0.3)',
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: 20,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 60,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    featureText: {
        color: '#1E293B',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    ctaContainer: {
        width: '100%',
    },
    button: {
        backgroundColor: '#6366F1',
        height: 64,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    footer: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    footerText: {
        color: '#475569',
        fontSize: 12,
    },
});
