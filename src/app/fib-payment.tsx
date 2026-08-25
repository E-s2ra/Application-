import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, ExternalLink, MessageSquare, Send, ShieldCheck } from 'lucide-react-native';
import { RASEDI_VIP_PLANS, RasediPlanId } from '@/lib/rasedi-payment';
import { OFFICIAL_CONTACT_CHANNELS, createWhatsAppVipMessage, createTelegramVipMessage } from '@/constants/payment-methods';

export default function FibPaymentScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { user } = useAuth();
  const { language } = useTranslation();
  const isKu = language === 'ku';

  const [selectedPlanId, setSelectedPlanId] = useState<RasediPlanId>('vip_3_months');

  const selectedPlan = RASEDI_VIP_PLANS.find((p) => p.id === selectedPlanId)!;

  const getPlanDurationLabel = (id: string) => {
    switch (id) {
      case 'vip_1_month': return isKu ? '١ مانگ' : '1 Month';
      case 'vip_3_months': return isKu ? '٣ مانگ' : '3 Months';
      case 'vip_6_months': return isKu ? '٦ مانگ' : '6 Months';
      case 'vip_1_year': return isKu ? '١ ساڵ' : '1 Year';
      default: return '';
    }
  };

  const handleContactWhatsApp = async () => {
    const url = createWhatsAppVipMessage(
      getPlanDurationLabel(selectedPlan.id),
      selectedPlan.priceIQD,
      user?.email
    );
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/${OFFICIAL_CONTACT_CHANNELS.whatsappNumber}`);
      }
    } catch (_err) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        Alert.alert('Contact Support', `WhatsApp: ${OFFICIAL_CONTACT_CHANNELS.whatsappDisplay}`);
      }
    }
  };

  const handleContactTelegram = async () => {
    const url = createTelegramVipMessage(
      getPlanDurationLabel(selectedPlan.id),
      selectedPlan.priceIQD,
      user?.email
    );
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://t.me/${OFFICIAL_CONTACT_CHANNELS.telegramUsername}`);
      }
    } catch (_err) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        Alert.alert('Contact Support', `Telegram: ${OFFICIAL_CONTACT_CHANNELS.telegramDisplay}`);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={themeColors.text} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {isKu ? 'کڕینی ئەندامێتی VIP' : 'VIP Subscription Payment'}
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
            {isKu ? 'هەڵبژاردنی پلانی VIP' : 'Select VIP Plan'}
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

        {/* Step 2: Contact Support */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <View style={[styles.stepCircle, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.stepNum}>2</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {isKu ? 'پەیوەندیکردن بۆ چالاککردن' : 'Contact Support to Activate'}
          </Text>
        </View>

        <View style={styles.contactContainer}>
          <Text style={styles.contactInstructions}>
            {isKu
              ? 'بۆ چالاککردنی خێرای VIP، دەتوانیت ڕاستەوخۆ لە ڕێگەی واتسئاپ یان تێلیگرام پەیوەندی بە بەڕێوەبەران بوبکەیت:'
              : 'To activate your VIP plan immediately, contact our official support team via WhatsApp or Telegram:'}
          </Text>

          <View style={styles.selectedPlanSummary}>
            <Text style={styles.summaryLabel}>{isKu ? 'پلانی هەڵبژێردراو:' : 'Selected Plan:'}</Text>
            <Text style={styles.summaryValue}>
              {getPlanDurationLabel(selectedPlan.id)} — {selectedPlan.priceIQD.toLocaleString()} {isKu ? 'دینار' : 'IQD'}
            </Text>
          </View>

          {/* WhatsApp Button */}
          <Pressable style={styles.whatsappBtn} onPress={handleContactWhatsApp}>
            <View style={styles.btnLeftContent}>
              <View style={styles.whatsappIconCircle}>
                <MessageSquare size={20} color="#FFF" />
              </View>
              <View>
                <Text style={styles.btnTitle}>
                  {isKu ? 'پەیوەندی لە ڕێگەی WhatsApp' : 'Contact via WhatsApp'}
                </Text>
                <Text style={styles.btnSubtitle}>{OFFICIAL_CONTACT_CHANNELS.whatsappDisplay}</Text>
              </View>
            </View>
            <ExternalLink size={18} color="#25D366" />
          </Pressable>

          {/* Telegram Button */}
          <Pressable style={styles.telegramBtn} onPress={handleContactTelegram}>
            <View style={styles.btnLeftContent}>
              <View style={styles.telegramIconCircle}>
                <Send size={20} color="#FFF" />
              </View>
              <View>
                <Text style={styles.btnTitle}>
                  {isKu ? 'پەیوەندی لە ڕێگەی Telegram' : 'Contact via Telegram'}
                </Text>
                <Text style={styles.btnSubtitle}>{OFFICIAL_CONTACT_CHANNELS.telegramDisplay}</Text>
              </View>
            </View>
            <ExternalLink size={18} color="#0088CC" />
          </Pressable>
        </View>

        {/*
        ================================================================================
        ARCHIVED MANUAL FIB SUBMISSION FORM (KEEP FOR FUTURE RESTORATION)
        ================================================================================
        <View style={styles.proofBox}>
          <Text style={styles.inputLabel}>
            {isKu ? 'ژمارەی حەواڵە (Transaction Number)' : 'Transaction Reference Number'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isKu ? 'نموونە: 123456789' : 'e.g. 123456789'}
            placeholderTextColor="#8E8EA4"
            value=""
            onChangeText={() => {}}
          />
        </View>
        ================================================================================
        */}

        <View style={styles.securityFooter}>
          <ShieldCheck size={16} color="#8E8EA4" />
          <Text style={styles.securityText}>
            {isKu
              ? 'پشتیوانی خێرا 24/7 · بە تەواوی پارێزراوە لەلایەن AniFlix'
              : 'Fast 24/7 Support · Direct assistance from AniFlix'}
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
    borderColor: '#0356C5',
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
    backgroundColor: '#0356C5',
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
  contactContainer: {
    backgroundColor: '#141420',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242436',
    gap: 14,
  },
  contactInstructions: {
    color: '#E0E0F0',
    fontSize: 14,
    lineHeight: 22,
  },
  selectedPlanSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1810',
    borderWidth: 1,
    borderColor: '#3D3010',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryLabel: {
    color: '#8E8EA4',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#FFB800',
    fontSize: 15,
    fontWeight: '800',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F291E',
    borderWidth: 1,
    borderColor: '#25D366',
    borderRadius: 14,
    padding: 16,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  whatsappIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E2433',
    borderWidth: 1,
    borderColor: '#0088CC',
    borderRadius: 14,
    padding: 16,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  telegramIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  btnTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  btnSubtitle: {
    color: '#8E8EA4',
    fontSize: 12,
    marginTop: 2,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  securityText: {
    color: '#8E8EA4',
    fontSize: 12,
  },
});
