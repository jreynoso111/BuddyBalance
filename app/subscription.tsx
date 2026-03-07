import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View as RNView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Check, RefreshCcw, Sparkles } from 'lucide-react-native';
import { Card, Screen, Text, View } from '@/components/Themed';
import { useAuthStore } from '@/store/authStore';
import {
  configureBillingForUser,
  describePackage,
  fetchPremiumOffering,
  getBillingEntitlementId,
  getBillingUnavailableReason,
  getPlanTierFromCustomerInfo,
  isBillingAvailable,
  purchasePremiumPackage,
  restorePremiumAccess,
  syncPlanTierFromBillingServer,
} from '@/services/billing';
import { PLAN_LIMITS } from '@/services/subscriptionPlan';

export default function SubscriptionScreen() {
  const { user, planTier, setPlanTier } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'purchase' | 'restore' | null>(null);
  const [featuredPackage, setFeaturedPackage] = useState<any>(null);
  const [packageDescription, setPackageDescription] = useState('');
  const [packageTitle, setPackageTitle] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const billingError = getBillingUnavailableReason();

  const loadBillingState = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const customerInfo = await configureBillingForUser({
        userId: user.id,
        email: user.email || null,
        phone: (user.phone as string | null | undefined) || null,
        displayName: (user.user_metadata?.full_name as string | undefined) || null,
      });

      if (customerInfo) {
        setPlanTier(getPlanTierFromCustomerInfo(customerInfo));
        setManagementUrl(customerInfo.managementURL || null);
      }

      if (isBillingAvailable()) {
        const serverSync = await syncPlanTierFromBillingServer();
        setPlanTier(serverSync.planTier);

        const { featuredPackage: currentPackage } = await fetchPremiumOffering();
        setFeaturedPackage(currentPackage);
        setPackageDescription(describePackage(currentPackage));
        setPackageTitle(currentPackage?.product?.title || 'Premium');
        setPriceLabel(currentPackage?.product?.priceString || '');
      }
    } catch (error: any) {
      console.error('billing screen load failed:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [setPlanTier, user?.email, user?.id, user?.phone, user?.user_metadata?.full_name]);

  useFocusEffect(
    useCallback(() => {
      void loadBillingState();
    }, [loadBillingState])
  );

  const handlePurchase = async () => {
    if (!featuredPackage) {
      Alert.alert('Premium unavailable', 'No purchase option is configured yet in RevenueCat.');
      return;
    }

    setAction('purchase');
    try {
      const result = await purchasePremiumPackage(featuredPackage);
      setPlanTier(result.planTier);
      Alert.alert(
        result.planTier === 'premium' ? 'Premium unlocked' : 'Purchase received',
        result.synced
          ? 'Your plan has been updated automatically.'
          : 'The purchase completed, but the server sync still needs a valid RevenueCat backend configuration.'
      );
      await loadBillingState();
    } catch (error: any) {
      if (error?.userCancelled) {
        return;
      }

      Alert.alert('Purchase failed', error?.message || 'The purchase could not be completed.');
    } finally {
      setAction(null);
    }
  };

  const handleRestore = async () => {
    setAction('restore');
    try {
      const result = await restorePremiumAccess();
      setPlanTier(result.planTier);
      Alert.alert(
        result.planTier === 'premium' ? 'Premium restored' : 'Restore finished',
        result.planTier === 'premium'
          ? result.synced
            ? 'Your plan has been updated automatically.'
            : 'Your access was restored locally, but the backend sync still needs the RevenueCat server keys.'
          : 'No Premium entitlement was found for this account.'
      );
      await loadBillingState();
    } catch (error: any) {
      Alert.alert('Restore failed', error?.message || 'The restore request could not be completed.');
    } finally {
      setAction(null);
    }
  };

  const handleOpenManageUrl = async () => {
    if (!managementUrl) return;
    const supported = await Linking.canOpenURL(managementUrl);
    if (!supported) {
      Alert.alert('Unavailable', 'The subscription management page could not be opened on this device.');
      return;
    }

    await Linking.openURL(managementUrl);
  };

  const planTitle = planTier === 'premium' ? 'Premium active' : 'Free plan';

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.heroCard}>
          <RNView style={styles.heroIcon}>
            <Sparkles size={22} color="#6366F1" />
          </RNView>
          <Text style={styles.heroEyebrow}>Plan</Text>
          <Text style={styles.heroTitle}>{planTitle}</Text>
          <Text style={styles.heroText}>
            Premium removes the friend and active record limits and keeps the plan in sync after purchase or restore.
          </Text>
        </Card>

        <Card style={styles.compareCard}>
          <Text style={styles.sectionTitle}>What Premium unlocks</Text>
          {[
            `Unlimited linked friends instead of ${PLAN_LIMITS.free.linkedFriends}`,
            `Unlimited active records instead of ${PLAN_LIMITS.free.activeRecords}`,
            'Restore purchases on a new device',
            `Automatic access sync from the "${getBillingEntitlementId()}" entitlement`,
          ].map((benefit) => (
            <RNView key={benefit} style={styles.benefitRow}>
              <RNView style={styles.benefitIcon}>
                <Check size={14} color="#10B981" />
              </RNView>
              <Text style={styles.benefitText}>{benefit}</Text>
            </RNView>
          ))}
        </Card>

        {!isBillingAvailable() ? (
          <Card style={styles.stateCard}>
            <Text style={styles.stateTitle}>Billing not configured yet</Text>
            <Text style={styles.stateText}>{billingError}</Text>
            <Text style={styles.stateFootnote}>
              Add the RevenueCat public SDK key for this platform and keep the Premium entitlement id in the app config.
            </Text>
          </Card>
        ) : loading ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.stateText}>Loading your plan and the current Premium package...</Text>
          </Card>
        ) : (
          <Card style={styles.purchaseCard}>
            <Text style={styles.sectionTitle}>Current offer</Text>
            {featuredPackage ? (
              <>
                <Text style={styles.packageTitle}>{packageTitle}</Text>
                <Text style={styles.packagePrice}>{priceLabel}</Text>
                <Text style={styles.packageDescription}>{packageDescription}</Text>

                <TouchableOpacity style={styles.primaryButton} onPress={handlePurchase} disabled={action !== null}>
                  {action === 'purchase' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {planTier === 'premium' ? 'Buy again or change plan' : 'Upgrade to Premium'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.stateText}>
                RevenueCat is connected, but no current offering/package is configured yet for this app.
              </Text>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={handleRestore} disabled={action !== null}>
              {action === 'restore' ? (
                <ActivityIndicator color="#1E293B" />
              ) : (
                <RNView style={styles.secondaryButtonContent}>
                  <RefreshCcw size={16} color="#1E293B" />
                  <Text style={styles.secondaryButtonText}>Restore purchases</Text>
                </RNView>
              )}
            </TouchableOpacity>

            {managementUrl ? (
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenManageUrl}>
                <Text style={styles.linkButtonText}>Manage subscription in store</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 16,
  },
  heroCard: {
    padding: 20,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginBottom: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#6366F1',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  compareCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  stateCard: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
    textAlign: 'center',
  },
  stateFootnote: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },
  purchaseCard: {
    padding: 20,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  packagePrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 18,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  linkButton: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
});
