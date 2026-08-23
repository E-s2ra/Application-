import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import {
  Crown,
  X,
  Check,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Zap,
  ExternalLink,
  ArrowRight,
} from 'lucide-react-native';
import { RASEDI_VIP_PLANS, RasediPlanId, createRasediCheckout, verifyRasediPayment } from '@/lib/rasedi-payment';

interface VipSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VipSubscriptionModal({ visible, onClose }: VipSubscriptionModalProps) {
  const themeColors = useTheme();
  const { user } = useAuth();
  const { isVIP, vipDaysRemaining } = useGamification();

  const [selectedPlanId, setSelectedPlanId] = useState<RasediPlanId>('vip_3_months');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const selectedPlan = RASEDI_VIP_PLANS.find((p) => p.id === selectedPlanId) || RASEDI_VIP_PLANS[1];

  const handleSubscribe = async () => {
    if (!user) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please sign in to your account first to subscribe to VIP.');
      } else {
        Alert.alert('Sign In Required', 'Please sign in to your account first to subscribe to VIP.');
      }
      return;
    }

    setLoading(true);
    const result = await createRasediCheckout(selectedPlanId);
    setLoading(false);

    if (!result.success || !result.paymentUrl) {
      const err = result.error || 'Failed to start payment session with RASEDI.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err);
      } else {
        Alert.alert('Payment Error', err);
      }
      return;
    }

    if (result.orderId) {
      setLastOrderId(result.orderId);
    }

    // Open RASEDI payment gateway
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(result.paymentUrl, '_blank');
    } else {
      await Linking.openURL(result.paymentUrl);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!lastOrderId) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('No recent payment session found. Please choose a plan and pay first.');
      } else {
        Alert.alert('Notice', 'No recent payment session found. Please choose a plan and pay first.');
      }
      return;
    }

    setVerifying(true);
    const check = await verifyRasediPayment(lastOrderId);
    setVerifying(false);

    if (check.success && check.status === 'completed') {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Payment Verified! 🎉 Your VIP subscription is now active.');
      } else {
        Alert.alert('Success! 🎉', 'Payment Verified! Your VIP subscription is now active.');
      }
      onClose();
    } else {
      const msg = check.message || 'Payment is still pending verification with RASEDI.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Payment Status', msg);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: '#0D0D15' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.crownCircle}>
                <Crown size={22} color="#FFB800" />
              </View>
              <View>
                <Text style={styles.modalTitle}>AniFlix VIP Sovereign</Text>
                <Text style={styles.modalSubtitle}>Ultra HD 4K, Ad-Free & Exclusive Series</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#FFF" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Active VIP Status Banner */}
            {isVIP && (
              <View style={styles.activeVipBanner}>
                <Sparkles color="#FFB800" size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeVipTitle}>Active VIP Subscription</Text>
                  <Text style={styles.activeVipSub}>
                    You currently have {vipDaysRemaining} days remaining. Subscribing will extend your active time!
                  </Text>
                </View>
              </View>
            )}

            {/* VIP Benefits List */}
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsHeading}>👑 VIP MEMBERSHIP BENEFITS</Text>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>100% Commercial-Free & Ad-Free Streaming</Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>Ultra HD 4K & Uncapped Master Bitrate</Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>Early Access to New Releases & Exclusive Series</Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>Exclusive VIP Sovereign Badge & Gold Discord Role</Text>
              </View>
            </View>

            {/* Plan Cards */}
            <Text style={styles.plansSectionTitle}>SELECT YOUR SUBSCRIPTION PLAN</Text>

            <View style={styles.plansGrid}>
              {RASEDI_VIP_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                    ]}
                    onPress={() => setSelectedPlanId(plan.id)}
                  >
                    {plan.badge && (
                      <View
                        style={[
                          styles.planBadge,
                          plan.popular ? styles.planBadgePopular : styles.planBadgeStandard,
                        ]}
                      >
                        <Text style={styles.planBadgeText}>{plan.badge.toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={styles.planDuration}>{plan.durationLabel}</Text>
                    <Text style={styles.planPrice}>
                      {plan.priceIQD.toLocaleString()} <Text style={styles.planCurrency}>IQD</Text>
                    </Text>
                    <Text style={styles.planDays}>
                      {plan.durationDays} Days Uncapped VIP
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Payment Method Notice */}
            <View style={styles.paymentMethodNotice}>
              <View style={styles.methodIconBox}>
                <CreditCard size={18} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>Secured by RASEDI · FIB & Iraqi E-Wallets</Text>
                <Text style={styles.methodSub}>
                  Pay seamlessly using First Iraqi Bank (FIB), RASEDI Wallet, or local cards.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <Pressable
              style={[styles.payButton, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.payBtnContent}>
                  <Text style={styles.payButtonText}>
                    Subscribe for {selectedPlan.priceIQD.toLocaleString()} IQD
                  </Text>
                  <ArrowRight size={18} color="#FFF" />
                </View>
              )}
            </Pressable>

            {lastOrderId && (
              <Pressable
                style={styles.verifyButton}
                onPress={handleCheckPaymentStatus}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#38BDF8" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>
                    🔄 Check Payment Status with RASEDI
                  </Text>
                )}
              </Pressable>
            )}

            <View style={styles.securityFooter}>
              <ShieldCheck size={14} color="#8E8EA4" />
              <Text style={styles.securityText}>
                End-to-end encrypted · Automated backend payment verification
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '92%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262638',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2C',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  crownCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#261F0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#8E8EA4',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 20,
    paddingBottom: 30,
    gap: 16,
  },
  activeVipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#261F0E',
    borderWidth: 1,
    borderColor: '#FFB800',
    borderRadius: 12,
    padding: 14,
  },
  activeVipTitle: {
    color: '#FFB800',
    fontSize: 13,
    fontWeight: '800',
  },
  activeVipSub: {
    color: '#E0C888',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  benefitsCard: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242436',
    gap: 10,
  },
  benefitsHeading: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  plansSectionTitle: {
    color: '#8E8EA4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#242436',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#FFB800',
    backgroundColor: '#1E1A10',
  },
  planBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planBadgePopular: {
    backgroundColor: '#E50914',
  },
  planBadgeStandard: {
    backgroundColor: '#2A2A3E',
  },
  planBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  planDuration: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  planPrice: {
    color: '#FFB800',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  planCurrency: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  planDays: {
    color: '#8E8EA4',
    fontSize: 11,
    marginTop: 4,
  },
  paymentMethodNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F1622',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 12,
    padding: 14,
  },
  methodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#162840',
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  methodSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  payButton: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  verifyButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityText: {
    color: '#8E8EA4',
    fontSize: 11,
  },
});
