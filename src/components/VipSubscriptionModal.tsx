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
  TextInput,
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
  Smartphone,
  Copy,
  Send,
  CheckCircle2,
  Ticket,
} from 'lucide-react-native';
import {
  RASEDI_VIP_PLANS,
  RasediPlanId,
  createRasediCheckout,
  verifyRasediPayment,
  simulateTestPaymentSuccess,
  submitManualPaymentProof,
} from '@/lib/rasedi-payment';
import { IRAQI_PAYMENT_METHODS, ManualPaymentMethod } from '@/constants/payment-methods';

interface VipSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VipSubscriptionModal({ visible, onClose }: VipSubscriptionModalProps) {
  const themeColors = useTheme();
  const { user } = useAuth();
  const { isVIP, vipDaysRemaining } = useGamification();

  const [selectedPlanId, setSelectedPlanId] = useState<RasediPlanId>('vip_3_months');
  const [paymentTab, setPaymentTab] = useState<'manual' | 'automated'>('manual');
  const [selectedMethodId, setSelectedMethodId] = useState<ManualPaymentMethod>('fib');
  const [transactionProof, setTransactionProof] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const selectedPlan = RASEDI_VIP_PLANS.find((p) => p.id === selectedPlanId) || RASEDI_VIP_PLANS[1];
  const activeMethod = IRAQI_PAYMENT_METHODS.find((m) => m.id === selectedMethodId) || IRAQI_PAYMENT_METHODS[0];

  const handleCopyAccount = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeMethod.accountNumber);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = async () => {
    if (!user) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please sign in to your account first.');
      } else {
        Alert.alert('Sign In Required', 'Please sign in to your account first.');
      }
      return;
    }

    if (!transactionProof.trim()) {
      const err = selectedMethodId === 'asiacell' ? 'Please enter the 14-digit Card PIN.' : 'Please enter the Transaction ID or Sender Phone Number.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err);
      } else {
        Alert.alert('Missing Information', err);
      }
      return;
    }

    setSubmittingManual(true);
    const res = await submitManualPaymentProof({
      planId: selectedPlanId,
      method: selectedMethodId,
      transactionRef: transactionProof.trim(),
      senderPhone: senderPhone.trim(),
      voucherPin: selectedMethodId === 'asiacell' ? transactionProof.trim() : undefined,
    });
    setSubmittingManual(false);

    if (res.success && res.orderId) {
      setSubmittedOrderId(res.orderId);
      setTransactionProof('');
      setSenderPhone('');
    } else {
      const err = res.error || 'Failed to submit payment proof.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err);
      } else {
        Alert.alert('Error', err);
      }
    }
  };

  const handleSubscribeAutomated = async () => {
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

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(result.paymentUrl, '_blank');
    } else {
      await Linking.openURL(result.paymentUrl);
    }
  };

  const handleSimulatePayment = async () => {
    if (!lastOrderId) return;
    setVerifying(true);
    const res = await simulateTestPaymentSuccess(lastOrderId);
    setVerifying(false);

    if (res.success) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('🎉 Test Payment Verified! Your VIP subscription has been activated in Docker PostgreSQL.');
      } else {
        Alert.alert('🎉 Test Success', 'Your VIP subscription has been activated in Docker PostgreSQL.');
      }
      onClose();
    } else {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(res.message || 'Failed to simulate test payment.');
      } else {
        Alert.alert('Simulation Error', res.message || 'Failed to simulate test payment.');
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

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
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
            </View>

            {/* Plan Cards */}
            <Text style={styles.plansSectionTitle}>1. SELECT YOUR VIP PLAN</Text>
            <View style={styles.plansGrid}>
              {RASEDI_VIP_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      Platform.OS === 'web' && ({ cursor: 'pointer', userSelect: 'none' } as any),
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
                    <Text style={styles.planDays}>{plan.durationDays} Days VIP</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Payment Method Tabs */}
            <Text style={styles.plansSectionTitle}>2. CHOOSE PAYMENT METHOD</Text>
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tabButton, paymentTab === 'manual' && styles.tabButtonActive]}
                onPress={() => setPaymentTab('manual')}
              >
                <Smartphone size={16} color={paymentTab === 'manual' ? '#FFF' : '#8E8EA4'} />
                <Text style={[styles.tabText, paymentTab === 'manual' && styles.tabTextActive]}>
                  Direct Wallet Transfer (FIB / ZainCash)
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabButton, paymentTab === 'automated' && styles.tabButtonActive]}
                onPress={() => setPaymentTab('automated')}
              >
                <CreditCard size={16} color={paymentTab === 'automated' ? '#FFF' : '#8E8EA4'} />
                <Text style={[styles.tabText, paymentTab === 'automated' && styles.tabTextActive]}>
                  RASEDI Gateway (Online)
                </Text>
              </Pressable>
            </View>

            {/* Tab A: Direct Iraqi Wallet Transfer */}
            {paymentTab === 'manual' && (
              <View style={styles.manualContainer}>
                {/* Method selector pills */}
                <View style={styles.methodsRow}>
                  {IRAQI_PAYMENT_METHODS.map((m) => {
                    const isMSelected = selectedMethodId === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        style={[
                          styles.methodPill,
                          isMSelected && { borderColor: m.badgeColor, backgroundColor: '#1A1A2E' },
                          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                        ]}
                        onPress={() => {
                          setSelectedMethodId(m.id);
                          setSubmittedOrderId(null);
                        }}
                      >
                        <Text style={[styles.methodPillText, isMSelected && { color: m.badgeColor, fontWeight: '800' }]}>
                          {m.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Transfer Info Box */}
                <View style={styles.transferInfoBox}>
                  <Text style={styles.transferTitle}>{activeMethod.nameAr}</Text>
                  <Text style={styles.transferInstructions}>{activeMethod.instructionsAr}</Text>

                  {selectedMethodId !== 'asiacell' && (
                    <View style={styles.accountRow}>
                      <View>
                        <Text style={styles.accountLabel}>Transfer to Account / Number:</Text>
                        <Text style={styles.accountNumber}>{activeMethod.accountNumber}</Text>
                        <Text style={styles.accountHolder}>{activeMethod.accountName}</Text>
                      </View>

                      <Pressable style={styles.copyBtn} onPress={handleCopyAccount}>
                        <Copy size={16} color="#FFF" />
                        <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
                      </Pressable>
                    </View>
                  )}

                  <View style={styles.amountBadge}>
                    <Text style={styles.amountBadgeText}>
                      Required Amount: <Text style={{ color: '#FFB800', fontWeight: '900' }}>{selectedPlan.priceIQD.toLocaleString()} IQD</Text>
                    </Text>
                  </View>
                </View>

                {/* Submission Form */}
                {submittedOrderId ? (
                  <View style={styles.successBox}>
                    <CheckCircle2 size={32} color="#00E676" />
                    <Text style={styles.successTitle}>Payment Proof Submitted! 🎉</Text>
                    <Text style={styles.successSub}>
                      Your order <Text style={{ color: '#FFB800' }}>#{submittedOrderId.slice(0, 18)}</Text> has been sent to the admin. Your VIP Sovereign access will be activated within a few minutes!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.formBox}>
                    <Text style={styles.formLabel}>
                      {selectedMethodId === 'asiacell' ? 'Enter 14-Digit Card PIN (كود كارت الرصيد):' : 'Enter Transfer Number / Transaction ID (رقم الحوالة أو العملية):'}
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={selectedMethodId === 'asiacell' ? 'e.g. 12345678901234' : 'e.g. TX-987654321 / 0770XXXXXXX'}
                      placeholderTextColor="#666680"
                      value={transactionProof}
                      onChangeText={setTransactionProof}
                    />

                    {selectedMethodId !== 'asiacell' && (
                      <>
                        <Text style={[styles.formLabel, { marginTop: 10 }]}>Your Sender Phone Number (رقم هاتفك):</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 0770XXXXXXX / 0780XXXXXXX"
                          placeholderTextColor="#666680"
                          keyboardType="phone-pad"
                          value={senderPhone}
                          onChangeText={setSenderPhone}
                        />
                      </>
                    )}

                    <Pressable
                      style={[styles.submitProofBtn, { opacity: submittingManual ? 0.7 : 1 }]}
                      onPress={handleManualSubmit}
                      disabled={submittingManual}
                    >
                      {submittingManual ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <View style={styles.payBtnContent}>
                          <Send size={16} color="#FFF" />
                          <Text style={styles.submitProofText}>Submit Payment Proof (إرسال إشعار الدفع)</Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Tab B: Automated RASEDI Gateway */}
            {paymentTab === 'automated' && (
              <View style={{ gap: 12 }}>
                <View style={styles.paymentMethodNotice}>
                  <View style={styles.methodIconBox}>
                    <CreditCard size={18} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodTitle}>Secured by RASEDI · FIB & Iraqi E-Wallets</Text>
                    <Text style={styles.methodSub}>
                      Automated checkout via First Iraqi Bank (FIB), RASEDI Wallet, and Visa/Mastercard.
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.payButton, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleSubscribeAutomated}
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
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Pressable
                      style={[styles.simulateButton, Platform.OS === 'web' && ({ cursor: 'pointer', userSelect: 'none' } as any)]}
                      onPress={handleSimulatePayment}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.simulateButtonText}>
                          ⚡ Confirm Test Payment (Sandbox Activation)
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <View style={styles.securityFooter}>
              <ShieldCheck size={14} color="#8E8EA4" />
              <Text style={styles.securityText}>
                End-to-end encrypted · Local Iraqi payments protected by AniFlix
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
    maxWidth: 560,
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
    paddingVertical: 16,
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
  scrollView: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web'
      ? ({
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        } as any)
      : {}),
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#242436',
    gap: 8,
  },
  benefitsHeading: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    color: '#FFF',
    fontSize: 12,
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
    gap: 8,
  },
  planCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#242436',
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  planCardSelected: {
    borderColor: '#FFB800',
    backgroundColor: '#1E1A10',
  },
  planBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    fontSize: 13,
    fontWeight: '700',
  },
  planPrice: {
    color: '#FFB800',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  planCurrency: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  planDays: {
    color: '#8E8EA4',
    fontSize: 10,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#242436',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  tabButtonActive: {
    backgroundColor: '#E50914',
  },
  tabText: {
    color: '#8E8EA4',
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  manualContainer: {
    gap: 12,
  },
  methodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262638',
    backgroundColor: '#141420',
  },
  methodPillText: {
    color: '#8E8EA4',
    fontSize: 11,
    fontWeight: '600',
  },
  transferInfoBox: {
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242436',
    gap: 10,
  },
  transferTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  transferInstructions: {
    color: '#E0E0F0',
    fontSize: 12,
    lineHeight: 18,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D0D15',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262638',
  },
  accountLabel: {
    color: '#8E8EA4',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  accountNumber: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 1,
  },
  accountHolder: {
    color: '#FFB800',
    fontSize: 11,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  copyBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  amountBadge: {
    backgroundColor: '#261F0E',
    borderWidth: 1,
    borderColor: '#FFB800',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  amountBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  formBox: {
    backgroundColor: '#141420',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242436',
  },
  formLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0D0D15',
    borderWidth: 1,
    borderColor: '#262638',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 13,
  },
  submitProofBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  submitProofText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  successBox: {
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  successTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  successSub: {
    color: '#D1FAE5',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  simulateButton: {
    backgroundColor: '#059669',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  simulateButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
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
