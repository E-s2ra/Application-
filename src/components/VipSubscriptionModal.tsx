import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import { useLanguage } from '@/hooks/use-language';
import {
  Crown,
  X,
  Check,
  Sparkles,
  ShieldCheck,
  Copy,
  Send,
  CheckCircle2,
} from 'lucide-react-native';
import {
  RASEDI_VIP_PLANS,
  RasediPlanId,
  submitManualPaymentProof,
} from '@/lib/rasedi-payment';
import { IRAQI_PAYMENT_METHODS } from '@/constants/payment-methods';

interface VipSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VipSubscriptionModal({ visible, onClose }: VipSubscriptionModalProps) {
  const themeColors = useTheme();
  const { user } = useAuth();
  const { isVIP, vipDaysRemaining } = useGamification();
  const { language } = useLanguage();
  const isKu = language === 'ku';

  const [selectedPlanId, setSelectedPlanId] = useState<RasediPlanId>('vip_3_months');
  const [transactionProof, setTransactionProof] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  const selectedPlan = RASEDI_VIP_PLANS.find((p) => p.id === selectedPlanId) || RASEDI_VIP_PLANS[1];
  const activeMethod = IRAQI_PAYMENT_METHODS[0];

  const getPlanDurationLabel = (id: RasediPlanId) => {
    if (!isKu) {
      if (id === 'vip_1_month') return '1 Month';
      if (id === 'vip_3_months') return '3 Months';
      if (id === 'vip_6_months') return '6 Months';
      return '1 Year';
    }
    if (id === 'vip_1_month') return '١ مانگ';
    if (id === 'vip_3_months') return '٣ مانگ';
    if (id === 'vip_6_months') return '٦ مانگ';
    return '١ ساڵ';
  };

  const handleCopyAccount = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeMethod.accountNumber);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = async () => {
    if (!user) {
      const msg = isKu ? 'تکایە سەرەتا بچۆ ژوورەوە بۆ ئەژمێرەکەت.' : 'Please sign in to your account first.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Sign In Required', msg);
      }
      return;
    }

    if (!transactionProof.trim()) {
      const err = isKu ? 'تکایە ژمارەی حەواڵەی FIB بنووسە.' : 'Please enter your FIB Transaction Number.';
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
      method: 'fib',
      transactionRef: transactionProof.trim(),
      senderPhone: senderPhone.trim(),
    });
    setSubmittingManual(false);

    if (res.success && res.orderId) {
      setSubmittedOrderId(res.orderId);
      setTransactionProof('');
      setSenderPhone('');
    } else {
      const err = res.error || (isKu ? 'ناردنی داواکاری سەرکەوتوو نەبوو.' : 'Failed to submit payment proof.');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err);
      } else {
        Alert.alert('Error', err);
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
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {isKu ? 'ئابوونەی AniFlix VIP Sovereign' : 'AniFlix VIP Sovereign'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  {isKu ? 'کوالیتی 4K، بە تەواوی بێ ڕیکلام و ئەڵقەی تایبەت' : 'Ultra HD 4K, Ad-Free & Exclusive Series'}
                </Text>
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
                  <Text style={styles.activeVipTitle}>
                    {isKu ? 'ئابوونەی چالاکی VIP' : 'Active VIP Subscription'}
                  </Text>
                  <Text style={styles.activeVipSub}>
                    {isKu
                      ? `${vipDaysRemaining} ڕۆژت ماوە. نوێکردنەوە کاتەکەت زیاتر درێژ دەکاتەوە!`
                      : `You currently have ${vipDaysRemaining} days remaining. Subscribing will extend your active time!`}
                  </Text>
                </View>
              </View>
            )}

            {/* VIP Benefits List */}
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsHeading}>
                {isKu ? '👑 تایبەتمەندییەکانی ئەندامێتی VIP' : '👑 VIP MEMBERSHIP BENEFITS'}
              </Text>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>
                  {isKu ? '١٠٠٪ بێ هیچ ڕیکلامێک و پەخشی ڕاستەوخۆ' : '100% Commercial-Free & Ad-Free Streaming'}
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>
                  {isKu ? 'کوالیتی بێ وێنەی Ultra HD 4K بە بەرزترین خێرایی' : 'Ultra HD 4K & Uncapped Master Bitrate'}
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>
                  {isKu ? 'بینینی زووتری ئەڵقە نوێیەکان و فیلمە تایبەتەکان' : 'Early Access to New Releases & Exclusive Series'}
                </Text>
              </View>
            </View>

            {/* Plan Cards */}
            <Text style={styles.plansSectionTitle}>
              {isKu ? '١. هەڵبژاردنی پلانی VIP' : '1. SELECT YOUR VIP PLAN'}
            </Text>
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
                        <Text style={styles.planBadgeText}>
                          {isKu && plan.popular ? 'باوترین' : plan.badge.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.planDuration}>{getPlanDurationLabel(plan.id)}</Text>
                    <Text style={styles.planPrice}>
                      {plan.priceIQD.toLocaleString()}{' '}
                      <Text style={styles.planCurrency}>{isKu ? 'د.ع' : 'IQD'}</Text>
                    </Text>
                    <Text style={styles.planDays}>
                      {isKu ? `${plan.durationDays} ڕۆژ VIP` : `${plan.durationDays} Days VIP`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* FIB Transfer Section */}
            <Text style={styles.plansSectionTitle}>
              {isKu ? '٢. پارەدان لە ڕێگەی FIB' : '2. FIRST IRAQI BANK (FIB) TRANSFER'}
            </Text>

            {/* Transfer Info Box */}
            <View style={styles.transferInfoBox}>
              <Text style={styles.transferTitle}>{isKu ? activeMethod.nameKu : activeMethod.name}</Text>
              <Text style={styles.transferInstructions}>
                {isKu ? activeMethod.instructionsKu : activeMethod.instructions}
              </Text>

              <View style={styles.accountRow}>
                <View>
                  <Text style={styles.accountLabel}>
                    {isKu ? 'ژمارەی ئەژمێری FIB:' : 'FIB Account / Phone Number:'}
                  </Text>
                  <Text style={styles.accountNumber}>{activeMethod.accountNumber}</Text>
                  <Text style={styles.accountHolder}>{activeMethod.accountName}</Text>
                </View>

                <Pressable style={styles.copyBtn} onPress={handleCopyAccount}>
                  <Copy size={16} color="#FFF" />
                  <Text style={styles.copyBtnText}>
                    {copied ? (isKu ? 'کۆپیکرا!' : 'Copied!') : isKu ? 'کۆپیکردن' : 'Copy'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.amountBadge}>
                <Text style={styles.amountBadgeText}>
                  {isKu ? 'بڕی پێویست: ' : 'Required Amount: '}
                  <Text style={{ color: '#FFB800', fontWeight: '900' }}>
                    {selectedPlan.priceIQD.toLocaleString()} {isKu ? 'دیناری عێراقی' : 'IQD'}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Submission Form */}
            {submittedOrderId ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={32} color="#00E676" />
                <Text style={styles.successTitle}>
                  {isKu ? 'بەڵگەی پارەدان نێردرا! 🎉' : 'Payment Proof Submitted! 🎉'}
                </Text>
                <Text style={styles.successSub}>
                  {isKu
                    ? `داواکاریەکەت #${submittedOrderId.slice(0, 18)} بۆ بەڕێوەبەر نێردرا. ئەندامێتی VIP لە ماوەی چەند خولەکێکدا چالاک دەکرێت!`
                    : `Your order #${submittedOrderId.slice(0, 18)} has been sent to the admin. Your VIP Sovereign access will be activated within a few minutes!`}
                </Text>
              </View>
            ) : (
              <View style={styles.formBox}>
                <Text style={styles.formLabel}>
                  {isKu
                    ? 'ژمارەی حەواڵەی FIB یان ژمارەی مۆبایلەکەت:'
                    : 'FIB Transaction Number / Sender Phone:'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. TX-987654321 / 0782XXXXXXX"
                  placeholderTextColor="#666680"
                  value={transactionProof}
                  onChangeText={setTransactionProof}
                />

                <Text style={[styles.formLabel, { marginTop: 10 }]}>
                  {isKu ? 'ژمارەی مۆبایلەکەت (ئارەزوومەندانە):' : 'Your Contact Phone (Optional):'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 0782XXXXXXX / 0770XXXXXXX"
                  placeholderTextColor="#666680"
                  keyboardType="phone-pad"
                  value={senderPhone}
                  onChangeText={setSenderPhone}
                />

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
                      <Text style={styles.submitProofText}>
                        {isKu ? 'ناردنی بەڵگەی پارەدانی FIB' : 'Submit FIB Payment Proof'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}

            <View style={styles.securityFooter}>
              <ShieldCheck size={14} color="#8E8EA4" />
              <Text style={styles.securityText}>
                {isKu
                  ? 'پارێزراوە بە تەواوی · هەموو پارەدانەکان لەلایەن AniFlix دەپارێزرێن'
                  : 'End-to-end encrypted · Direct FIB payments protected by AniFlix'}
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
    backgroundColor: '#8B0000',
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
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
