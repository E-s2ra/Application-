import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-language';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Copy, CreditCard, Loader2, Sparkles, XCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { RASEDI_VIP_PLANS, RasediPlanId, submitManualPaymentProof } from '@/lib/rasedi-payment';
import { IRAQI_PAYMENT_METHODS } from '@/constants/payment-methods';

export default function FibPaymentScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { isKu } = useTranslation();

  const activeMethod = IRAQI_PAYMENT_METHODS[0]; // FIB is at index 0
  const [selectedPlanId, setSelectedPlanId] = useState<RasediPlanId>('vip_3_months');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedPlan = RASEDI_VIP_PLANS.find((p) => p.id === selectedPlanId)!;

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${label} copied to clipboard!`);
    } else {
      Alert.alert('Copied', `${label} copied to clipboard!`);
    }
  };

  const getPlanDurationLabel = (id: string) => {
    switch (id) {
      case 'vip_1_month': return isKu ? '١ مانگ' : '1 Month';
      case 'vip_3_months': return isKu ? '٣ مانگ' : '3 Months';
      case 'vip_6_months': return isKu ? '٦ مانگ' : '6 Months';
      case 'vip_1_year': return isKu ? '١ ساڵ' : '1 Year';
      default: return '';
    }
  };

  const handleSubmitProof = async () => {
    if (!transactionRef.trim()) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(isKu ? 'تکایە ژمارەی حەواڵە بنووسە' : 'Please enter the transaction reference number.');
      } else {
        Alert.alert('Required', isKu ? 'تکایە ژمارەی حەواڵە بنووسە' : 'Please enter the transaction reference number.');
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    const result = await submitManualPaymentProof({
      planId: selectedPlanId,
      method: activeMethod.id,
      transactionRef: transactionRef.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitStatus('success');
    } else {
      setSubmitStatus('failed');
      setErrorMessage(result.error || 'Failed to submit payment proof.');
    }
  };

  if (submitStatus === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={themeColors.text} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {isKu ? 'پارەدان سەرکەوتوو بوو' : 'Payment Submitted'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <CheckCircle2 color="#00E676" size={80} />
          </View>
          <Text style={[styles.successTitle, { color: themeColors.text }]}>
            {isKu ? 'داواکارییەکەت نێردرا!' : 'Request Sent!'}
          </Text>
          <Text style={[styles.successSubtitle, { color: themeColors.textSecondary }]}>
            {isKu
              ? 'سوپاس بۆ ناردنی پارە. ئەدمینەکانمان بە زووترین کات پێداچوونەوەی بۆ دەکەن و ئەکاونتەکەت چالاک دەکەن.'
              : 'Thank you for your payment. Our admins will verify the transaction and activate your VIP shortly.'}
          </Text>
          
          <View style={styles.successDetailsCard}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>{isKu ? 'پلان:' : 'Plan:'}</Text>
              <Text style={styles.successValue}>{getPlanDurationLabel(selectedPlanId)}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>{isKu ? 'بڕی پارە:' : 'Amount:'}</Text>
              <Text style={styles.successValue}>{selectedPlan.priceIQD.toLocaleString()} IQD</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>{isKu ? 'ژمارەی حەواڵە:' : 'Reference:'}</Text>
              <Text style={styles.successValue}>{transactionRef}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: themeColors.primary, marginTop: 40 }]}
            onPress={() => router.replace('/(tabs)/profile')}
          >
            <Text style={styles.primaryBtnText}>
              {isKu ? 'گەڕانەوە بۆ پرۆفایل' : 'Back to Profile'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={themeColors.text} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {isKu ? 'پارەدان لە ڕێگەی FIB' : 'FIB Payment'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Step 1: Select Plan */}
        <View style={styles.sectionHeader}>
          <View style={[styles.stepCircle, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {isKu ? 'هەڵبژاردنی پلان' : 'Select Plan'}
          </Text>
        </View>

        <View style={styles.plansGrid}>
          {RASEDI_VIP_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <Pressable
                key={plan.id}
                style={[
                  styles.planCard,
                  isSelected && styles.planCardSelected,
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                onPress={() => setSelectedPlanId(plan.id)}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, plan.popular ? styles.planBadgePopular : styles.planBadgeStandard]}>
                    <Text style={styles.planBadgeText}>
                      {isKu && plan.popular ? 'باوترین' : plan.badge.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.planDuration}>{getPlanDurationLabel(plan.id)}</Text>
                <Text style={styles.planPrice}>
                  {plan.priceIQD.toLocaleString()} <Text style={styles.planCurrency}>{isKu ? 'د.ع' : 'IQD'}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Step 2: Transfer Details */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <View style={[styles.stepCircle, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.stepNum}>2</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {isKu ? 'زانیارییەکانی حەواڵە' : 'Transfer Details'}
          </Text>
        </View>

        <View style={styles.transferBox}>
          <View style={styles.transferHeader}>
            <CreditCard color="#38BDF8" size={24} />
            <Text style={styles.transferTitle}>{isKu ? activeMethod.nameKu : activeMethod.name}</Text>
          </View>
          <Text style={styles.transferInstructions}>
            {isKu ? activeMethod.instructionsKu : activeMethod.instructions}
          </Text>
          
          <View style={styles.amountBanner}>
            <Text style={styles.amountLabel}>{isKu ? 'بڕی حەواڵە دەکرێت' : 'Amount to send'}</Text>
            <Text style={styles.amountValue}>{selectedPlan.priceIQD.toLocaleString()} IQD</Text>
          </View>

          <View style={styles.accountCard}>
            <View>
              <Text style={styles.accountLabel}>{isKu ? 'ژمارەی هەژمار' : 'Account Number'}</Text>
              <Text style={styles.accountNumber}>{activeMethod.accountNumber}</Text>
              <Text style={styles.accountName}>{activeMethod.accountName}</Text>
            </View>
            <Pressable 
              style={styles.copyBtn}
              onPress={() => handleCopy(activeMethod.accountNumber, 'Account Number')}
            >
              <Copy color="#38BDF8" size={16} />
              <Text style={styles.copyText}>{isKu ? 'کۆپی' : 'Copy'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Step 3: Enter Proof */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <View style={[styles.stepCircle, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.stepNum}>3</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {isKu ? 'دڵنیابوونەوەی پارەدان' : 'Confirm Payment'}
          </Text>
        </View>

        <View style={styles.proofBox}>
          <Text style={styles.inputLabel}>
            {isKu ? 'ژمارەی حەواڵە (Transaction Number)' : 'Transaction Reference Number'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isKu ? 'نموونە: 123456789' : 'e.g. 123456789'}
            placeholderTextColor="#8E8EA4"
            value={transactionRef}
            onChangeText={setTransactionRef}
            editable={!isSubmitting}
            keyboardType="default"
          />

          {submitStatus === 'failed' && (
            <View style={styles.errorBox}>
              <XCircle color="#FF3B30" size={16} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.submitBtn, 
              (!transactionRef.trim() || isSubmitting) && styles.submitBtnDisabled
            ]}
            onPress={handleSubmitProof}
            disabled={!transactionRef.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 color="#FFF" size={20} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {isKu ? 'ناردنی دڵنیایی پارەدان' : 'Submit Payment Proof'}
                </Text>
                <ChevronRight color="#FFF" size={20} />
              </>
            )}
          </Pressable>
          <Text style={styles.disclaimerText}>
            {isKu 
              ? 'تێبینی: ئەکاونتەکەت چالاک دەکرێت دوای ئەوەی ئەدمینەکانمان بەدواداچوون بۆ حەواڵەکەت دەکەن.'
              : 'Note: Your VIP will be activated once our admins verify your transaction.'}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2C',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  planCard: {
    width: '48%',
    backgroundColor: '#1E1E2C',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2A2A3E',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#E50914',
    backgroundColor: '#261418',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgePopular: {
    backgroundColor: '#E50914',
  },
  planBadgeStandard: {
    backgroundColor: '#38BDF8',
  },
  planBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planDuration: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  planPrice: {
    color: '#FFB800',
    fontSize: 20,
    fontWeight: '900',
  },
  planCurrency: {
    fontSize: 12,
    color: '#FFF',
  },
  transferBox: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242436',
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  transferTitle: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
  transferInstructions: {
    color: '#E0E0F0',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  amountBanner: {
    backgroundColor: '#1E1E2C',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amountLabel: {
    color: '#8E8EA4',
    fontSize: 14,
    fontWeight: '600',
  },
  amountValue: {
    color: '#FFB800',
    fontSize: 20,
    fontWeight: '900',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D0D15',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262638',
  },
  accountLabel: {
    color: '#8E8EA4',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  accountNumber: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  accountName: {
    color: '#FFB800',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  copyText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  proofBox: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242436',
  },
  inputLabel: {
    color: '#E0E0F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0D0D15',
    borderWidth: 1,
    borderColor: '#262638',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#E50914',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  disclaimerText: {
    color: '#8E8EA4',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successDetailsCard: {
    backgroundColor: '#1E1E2C',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 16,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    color: '#8E8EA4',
    fontSize: 14,
    fontWeight: '600',
  },
  successValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
