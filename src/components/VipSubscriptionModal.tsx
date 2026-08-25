import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  Linking,
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
  Send,
  MessageSquare,
  ExternalLink,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RASEDI_VIP_PLANS,
  RasediPlanId,
} from '@/lib/rasedi-payment';
import {
  OFFICIAL_CONTACT_CHANNELS,
  createWhatsAppVipMessage,
  createTelegramVipMessage,
} from '@/constants/payment-methods';

interface VipSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VipSubscriptionModal({ visible, onClose }: VipSubscriptionModalProps) {
  const themeColors = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isVIP, vipDaysRemaining } = useGamification();
  const { language } = useLanguage();
  const isKu = language === 'ku';

  const [selectedPlanId, setSelectedPlanId] = useState<RasediPlanId>('vip_3_months');

  const selectedPlan = RASEDI_VIP_PLANS.find((p) => p.id === selectedPlanId) || RASEDI_VIP_PLANS[1];

  const getPlanDurationLabel = (id: RasediPlanId) => {
    if (!isKu) {
      if (id === 'vip_1_month') return '1 Month';
      if (id === 'vip_3_months') return '3 Months';
      if (id === 'vip_6_months') return '6 Months';
      return '1 Year';
    }
    if (id === 'vip_1_month') return 'Ù¡ Ù…Ø§Ù†Ú¯';
    if (id === 'vip_3_months') return 'Ù£ Ù…Ø§Ù†Ú¯';
    if (id === 'vip_6_months') return 'Ù¦ Ù…Ø§Ù†Ú¯';
    return 'Ù¡ Ø³Ø§Úµ';
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top + 8, 20), paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        <View style={[styles.card, { backgroundColor: '#0D0D15' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.crownCircle}>
                <Crown size={22} color="#FFB800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {isKu ? 'Ø¦Ø§Ø¨ÙˆÙˆÙ†Û•ÛŒ AniFlix VIP Sovereign' : 'AniFlix VIP Sovereign'}
                </Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  {isKu ? 'Ú©ÙˆØ§Ù„ÛŒØªÛŒ 4KØŒ Ø¨Û• ØªÛ•ÙˆØ§ÙˆÛŒ Ø¨ÛŽ Ú•ÛŒÚ©Ù„Ø§Ù… Ùˆ Ø¦Û•ÚµÙ‚Û•ÛŒ ØªØ§ÛŒØ¨Û•Øª' : 'Ultra HD 4K, Ad-Free & Exclusive Series'}
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
                    {isKu ? 'Ø¦Ø§Ø¨ÙˆÙˆÙ†Û•ÛŒ Ú†Ø§Ù„Ø§Ú©ÛŒ VIP' : 'Active VIP Subscription'}
                  </Text>
                  <Text style={styles.activeVipSub}>
                    {isKu
                      ? `${vipDaysRemaining} Ú•Û†Ú˜Øª Ù…Ø§ÙˆÛ•. Ù†ÙˆÛŽÚ©Ø±Ø¯Ù†Û•ÙˆÛ• Ú©Ø§ØªÛ•Ú©Û•Øª Ø²ÛŒØ§ØªØ± Ø¯Ø±ÛŽÚ˜ Ø¯Û•Ú©Ø§ØªÛ•ÙˆÛ•!`
                      : `You currently have ${vipDaysRemaining} days remaining. Subscribing will extend your active time!`}
                  </Text>
                </View>
              </View>
            )}

            {/* VIP Benefits List */}
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsHeading}>
                {isKu ? 'ðŸ‘‘ ØªØ§ÛŒØ¨Û•ØªÙ…Û•Ù†Ø¯ÛŒÛŒÛ•Ú©Ø§Ù†ÛŒ Ø¦Û•Ù†Ø¯Ø§Ù…ÛŽØªÛŒ VIP' : 'ðŸ‘‘ VIP MEMBERSHIP BENEFITS'}
              </Text>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>
                  {isKu ? 'Ù¡Ù Ù Ùª Ø¨ÛŽ Ù‡ÛŒÚ† Ú•ÛŒÚ©Ù„Ø§Ù…ÛŽÚ© Ùˆ Ù¾Û•Ø®Ø´ÛŒ Ú•Ø§Ø³ØªÛ•ÙˆØ®Û†' : '100% Commercial-Free & Ad-Free Streaming'}
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>
                  {isKu ? 'Ú©ÙˆØ§Ù„ÛŒØªÛŒ Ø¨ÛŽ ÙˆÛŽÙ†Û•ÛŒ Ultra HD 4K Ø¨Û• Ø¨Û•Ø±Ø²ØªØ±ÛŒÙ† Ø®ÛŽØ±Ø§ÛŒÛŒ' : 'Ultra HD 4K & Uncapped Master Bitrate'}
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Check size={16} color="#00E676" />
                <Text style={styles.benefitText}>
                  {isKu ? 'Ø¨ÛŒÙ†ÛŒÙ†ÛŒ Ø²ÙˆÙˆØªØ±ÛŒ Ø¦Û•ÚµÙ‚Û• Ù†ÙˆÛŽÛŒÛ•Ú©Ø§Ù† Ùˆ ÙÛŒÙ„Ù…Û• ØªØ§ÛŒØ¨Û•ØªÛ•Ú©Ø§Ù†' : 'Early Access to New Releases & Exclusive Series'}
                </Text>
              </View>
            </View>

            {/* Plan Cards */}
            <Text style={styles.plansSectionTitle}>
              {isKu ? 'Ù¡. Ù‡Û•ÚµØ¨Ú˜Ø§Ø±Ø¯Ù†ÛŒ Ù¾Ù„Ø§Ù†ÛŒ VIP' : '1. SELECT YOUR VIP PLAN'}
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
                          {isKu && plan.popular ? 'Ø¨Ø§ÙˆØªØ±ÛŒÙ†' : plan.badge.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.planDuration}>{getPlanDurationLabel(plan.id)}</Text>
                    <Text style={styles.planPrice}>
                      {plan.priceIQD.toLocaleString()}{' '}
                      <Text style={styles.planCurrency}>{isKu ? 'Ø¯.Ø¹' : 'IQD'}</Text>
                    </Text>
                    <Text style={styles.planDays}>
                      {isKu ? `${plan.durationDays} Ú•Û†Ú˜ VIP` : `${plan.durationDays} Days VIP`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Direct Contact Payment Section */}
            <Text style={styles.plansSectionTitle}>
              {isKu ? 'Ù¢. Ù¾Û•ÛŒÙˆÛ•Ù†Ø¯ÛŒÚ©Ø±Ø¯Ù† Ø¨Û† Ú†Ø§Ù„Ø§Ú©Ú©Ø±Ø¯Ù†ÛŒ VIP' : '2. CONTACT TO ACTIVATE VIP'}
            </Text>

            <View style={styles.contactContainer}>
              <Text style={styles.contactInstructions}>
                {isKu
                  ? 'Ø¨Û† Ú©Ú•ÛŒÙ† Ùˆ Ú†Ø§Ù„Ø§Ú©Ú©Ø±Ø¯Ù†ÛŒ Ø®ÛŽØ±Ø§ÛŒ Ø¦Û•Ù†Ø¯Ø§Ù…ÛŽØªÛŒ VIPØŒ Ù„Û• Ú•ÛŽÚ¯Û•ÛŒ ÙˆØ§ØªØ³Ø¦Ø§Ù¾ ÛŒØ§Ù† ØªÛŽÙ„ÛŒÚ¯Ø±Ø§Ù… Ù¾Û•ÛŒÙˆÛ•Ù†Ø¯ÛŒ Ø¨Û• ØªÛŒÙ…ÛŒ Ù¾Ø´ØªÚ¯ÛŒØ±ÛŒ Ø¨Ú©Û•:'
                  : 'To purchase and activate your VIP subscription instantly, contact our official support via WhatsApp or Telegram:'}
              </Text>

              <View style={styles.selectedPlanSummary}>
                <Text style={styles.summaryLabel}>{isKu ? 'Ù¾Ù„Ø§Ù†ÛŒ Ù‡Û•ÚµØ¨Ú˜ÛŽØ±Ø¯Ø±Ø§Ùˆ:' : 'Selected Plan:'}</Text>
                <Text style={styles.summaryValue}>
                  {getPlanDurationLabel(selectedPlan.id)} â€” {selectedPlan.priceIQD.toLocaleString()} {isKu ? 'Ø¯ÛŒÙ†Ø§Ø±' : 'IQD'}
                </Text>
              </View>

              {/* WhatsApp Button */}
              <Pressable style={styles.whatsappBtn} onPress={handleContactWhatsApp}>
                <View style={styles.btnLeftContent}>
                  <View style={styles.whatsappIconCircle}>
                    <MessageSquare size={18} color="#FFF" />
                  </View>
                  <View>
                    <Text style={styles.btnTitle}>
                      {isKu ? 'Ù¾Û•ÛŒÙˆÛ•Ù†Ø¯ÛŒ Ù„Û• Ú•ÛŽÚ¯Û•ÛŒ WhatsApp' : 'Contact via WhatsApp'}
                    </Text>
                    <Text style={styles.btnSubtitle}>{OFFICIAL_CONTACT_CHANNELS.whatsappDisplay}</Text>
                  </View>
                </View>
                <ExternalLink size={16} color="#25D366" />
              </Pressable>

              {/* Telegram Button */}
              <Pressable style={styles.telegramBtn} onPress={handleContactTelegram}>
                <View style={styles.btnLeftContent}>
                  <View style={styles.telegramIconCircle}>
                    <Send size={18} color="#FFF" />
                  </View>
                  <View>
                    <Text style={styles.btnTitle}>
                      {isKu ? 'Ù¾Û•ÛŒÙˆÛ•Ù†Ø¯ÛŒ Ù„Û• Ú•ÛŽÚ¯Û•ÛŒ Telegram' : 'Contact via Telegram'}
                    </Text>
                    <Text style={styles.btnSubtitle}>{OFFICIAL_CONTACT_CHANNELS.telegramDisplay}</Text>
                  </View>
                </View>
                <ExternalLink size={16} color="#0088CC" />
              </Pressable>
            </View>

            {/*
            ================================================================================
            ARCHIVED MANUAL FIB TRANSACTION FORM (KEEP FOR FUTURE RESTORATION)
            ================================================================================
            <View style={styles.transferInfoBox}>
              <Text style={styles.transferTitle}>{isKu ? activeMethod.nameKu : activeMethod.name}</Text>
              <Text style={styles.transferInstructions}>
                {isKu ? activeMethod.instructionsKu : activeMethod.instructions}
              </Text>
              <View style={styles.accountRow}>
                <View>
                  <Text style={styles.accountLabel}>{isKu ? 'Ú˜Ù…Ø§Ø±Û•ÛŒ Ø¦Û•Ú˜Ù…ÛŽØ±ÛŒ FIB:' : 'FIB Account / Phone Number:'}</Text>
                  <Text style={styles.accountNumber}>{activeMethod.accountNumber}</Text>
                  <Text style={styles.accountHolder}>{activeMethod.accountName}</Text>
                </View>
                <Pressable style={styles.copyBtn} onPress={handleCopyAccount}>
                  <Copy size={16} color="#FFF" />
                  <Text style={styles.copyBtnText}>{copied ? (isKu ? 'Ú©Û†Ù¾ÛŒÚ©Ø±Ø§!' : 'Copied!') : isKu ? 'Ú©Û†Ù¾ÛŒÚ©Ø±Ø¯Ù†' : 'Copy'}</Text>
                </Pressable>
              </View>
            </View>
            ================================================================================
            */}

            <View style={styles.securityFooter}>
              <ShieldCheck size={14} color="#8E8EA4" />
              <Text style={styles.securityText}>
                {isKu
                  ? 'Ù¾Ø´ØªÛŒÙˆØ§Ù†ÛŒ Ø®ÛŽØ±Ø§ 24/7 Â· Ù¾Ø§Ø±ÛŽØ²Ø±Ø§ÙˆÛ• Ù„Û•Ù„Ø§ÛŒÛ•Ù† AniFlix Sovereign'
                  : 'Fast 24/7 Support Â· Protected by AniFlix Sovereign'}
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
    width: '94%',
    maxWidth: 520,
    height: '88%',
    maxHeight: '92%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262638',
    overflow: 'hidden',
    flexDirection: 'column',
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
  contactContainer: {
    backgroundColor: '#141420',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242436',
    gap: 12,
  },
  contactInstructions: {
    color: '#E0E0F0',
    fontSize: 12,
    lineHeight: 18,
  },
  selectedPlanSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1810',
    borderWidth: 1,
    borderColor: '#3D3010',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLabel: {
    color: '#8E8EA4',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#FFB800',
    fontSize: 13,
    fontWeight: '800',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F291E',
    borderWidth: 1,
    borderColor: '#25D366',
    borderRadius: 12,
    padding: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  whatsappIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 12,
    padding: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  telegramIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnSubtitle: {
    color: '#8E8EA4',
    fontSize: 11,
    marginTop: 2,
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
