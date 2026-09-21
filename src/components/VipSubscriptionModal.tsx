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
  MessageSquare,
  Send,
  ExternalLink,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  VIP_PLANS,
  VipPlanId,
  ADMIN_CONTACT,
  buildWhatsAppVipUrl,
  buildTelegramVipUrl,
} from '@/constants/vip-plans';

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

  const [selectedPlanId, setSelectedPlanId] = useState<VipPlanId>('vip_3_months');
  const selectedPlan = VIP_PLANS.find((p) => p.id === selectedPlanId) ?? VIP_PLANS[1];

  const planLabel = isKu ? selectedPlan.durationLabelKu : selectedPlan.durationLabel;

  // ── Contact Handlers ──────────────────────────────────────────────────────
  const openUrl = async (appUrl: string, webUrl: string, fallbackLabel: string) => {
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpen ? appUrl : webUrl);
    } catch {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(webUrl, '_blank');
      } else {
        Alert.alert('Contact Support', fallbackLabel);
      }
    }
  };

  const handleWhatsApp = () => {
    const webUrl = buildWhatsAppVipUrl(planLabel, selectedPlan.priceIQD, user?.email);
    const appUrl = `whatsapp://send?phone=${ADMIN_CONTACT.whatsappNumber}&text=${encodeURIComponent(
      `Hi AniFlix! I want to subscribe to VIP — ${planLabel} — ${selectedPlan.priceIQD.toLocaleString()} IQD${user?.email ? ` (Account: ${user.email})` : ''}`
    )}`;
    openUrl(appUrl, webUrl, `WhatsApp: ${ADMIN_CONTACT.whatsappDisplay}`);
  };

  const handleTelegram = () => {
    const url = buildTelegramVipUrl(planLabel, selectedPlan.priceIQD, user?.email);
    openUrl(url, url, `Telegram: ${ADMIN_CONTACT.telegramDisplay}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: themeColors.scrim,
            paddingTop: Math.max(insets.top + 8, 20),
            paddingBottom: Math.max(insets.bottom + 8, 20),
          },
        ]}
      >
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.crownCircle, { backgroundColor: themeColors.backgroundSelected }]}>
                <Crown size={20} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]} numberOfLines={1}>
                  {isKu ? 'ئابوونەی AniFlix VIP' : 'AniFlix VIP'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]} numberOfLines={2}>
                  {isKu
                    ? 'سەیرکردنی بێ ڕیکلام، ناوەڕۆکی کراوە، و باشترین کوالیتی بەردەست'
                    : 'Ad-free viewing, unlocked content, and the best available stream for each title'}
                </Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: pressed ? themeColors.backgroundSelected : themeColors.backgroundElement },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close VIP modal"
            >
              <X size={20} color={themeColors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator
            bounces
          >
            {/* ── Active VIP Banner ───────────────────────────────────── */}
            {isVIP && (
              <View style={[styles.activeVipBanner, { backgroundColor: themeColors.backgroundSelected }]}>
                <Sparkles color={themeColors.primary} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeVipTitle, { color: themeColors.primary }]}>
                    {isKu ? 'ئابوونەی چالاکی VIP' : 'Active VIP Subscription'}
                  </Text>
                  <Text style={[styles.activeVipSub, { color: themeColors.textSecondary }]}>
                    {isKu
                      ? `${vipDaysRemaining} ڕۆژت ماوە. نوێکردنەوە کاتەکەت زیاتر درێژ دەکاتەوە!`
                      : `You have ${vipDaysRemaining} days remaining. Subscribing will extend your active time!`}
                  </Text>
                </View>
              </View>
            )}

            {/* ── VIP Benefits ────────────────────────────────────────── */}
            <View style={[styles.benefitsCard, { backgroundColor: themeColors.backgroundElement }]}>
              <Text style={[styles.benefitsHeading, { color: themeColors.text }]}>
                {isKu ? 'تایبەتمەندییەکانی ئەندامێتی VIP' : 'What VIP includes'}
              </Text>
              {[
                {
                  en: '100% Ad-Free — No interruptions, ever',
                  ku: '١٠٠٪ بێ هیچ ڕیکلامێک و پەخشی ڕاستەوخۆ',
                },
                {
                  en: 'Best available stream quality for each title',
                  ku: 'باشترین کوالیتی بەردەست بۆ هەر ناوەڕۆکێک',
                },
                {
                  en: 'All Content Unlocked — No coins needed',
                  ku: 'گشت ناوەرۆکەکان کراوەن — بێ کۆین',
                },
              ].map((item, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Check size={16} color={themeColors.primary} />
                  <Text style={[styles.benefitText, { color: themeColors.text }]}>
                    {isKu ? item.ku : item.en}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Step 1 — Plan Selection ─────────────────────────────── */}
            <Text style={[styles.stepHeading, { color: themeColors.textSecondary }]}>
              {isKu ? '١. هەڵبژاردنی پلانی VIP' : '1. Choose a plan'}
            </Text>
            <View style={styles.plansGrid}>
              {VIP_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    style={[
                      styles.planCard,
                      { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                      isSelected && { backgroundColor: themeColors.backgroundSelected, borderColor: themeColors.primary },
                    ]}
                    onPress={() => setSelectedPlanId(plan.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${plan.durationLabel} VIP plan — ${plan.priceIQD.toLocaleString()} IQD`}
                    accessibilityState={{ checked: isSelected }}
                  >
                    {plan.badge && (
                      <View
                        style={[
                          styles.planBadge,
                          { backgroundColor: plan.popular ? themeColors.primary : themeColors.backgroundSelected },
                        ]}
                      >
                        <Text style={styles.planBadgeText}>
                          {isKu ? (plan.badgeKu ?? plan.badge) : plan.badge.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.planDuration, { color: themeColors.text }]}>
                      {isKu ? plan.durationLabelKu : plan.durationLabel}
                    </Text>
                    <Text style={[styles.planPrice, { color: isSelected ? themeColors.primary : themeColors.text }]}>
                      {plan.priceIQD.toLocaleString()}{' '}
                      <Text style={[styles.planCurrency, { color: themeColors.textSecondary }]}>{isKu ? 'د.ع' : 'IQD'}</Text>
                    </Text>
                    <Text style={[styles.planDays, { color: themeColors.textSecondary }]}>
                      {isKu ? `${plan.durationDays} ڕۆژ VIP` : `${plan.durationDays} Days VIP`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Step 2 — Contact Admin ──────────────────────────────── */}
            <Text style={[styles.stepHeading, { color: themeColors.textSecondary }]}>
              {isKu ? '٢. پەیوەندیکردن بۆ چالاككردنی VIP' : '2. Contact support to activate'}
            </Text>

            <View style={[styles.contactContainer, { backgroundColor: themeColors.backgroundElement }]}>
              <Text style={[styles.contactInstructions, { color: themeColors.textSecondary }]}>
                {isKu
                  ? 'پلانەکەت هەڵبژێرە، دوای پارەدان لە ڕێگەی WhatsApp یان Telegram پەیوەندی بە ئیدارەی ئەپ بکە. ئیدارە VIP بۆت دروست دەکات.'
                  : 'Select your plan, send the payment, then contact admin via WhatsApp or Telegram. The admin will manually activate VIP for your account.'}
              </Text>

              {/* Selected plan summary */}
              <View style={[styles.selectedPlanSummary, { backgroundColor: themeColors.backgroundSelected }]}>
                <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>
                  {isKu ? 'پلانی هەڵبژێردراو:' : 'Selected Plan:'}
                </Text>
                <Text style={[styles.summaryValue, { color: themeColors.text }]}>
                  {planLabel} — {selectedPlan.priceIQD.toLocaleString()} {isKu ? 'دینار' : 'IQD'}
                </Text>
              </View>

              {/* WhatsApp Button */}
              <Pressable
                style={({ pressed }) => [styles.whatsappBtn, pressed && { opacity: 0.8 }]}
                onPress={handleWhatsApp}
                accessibilityRole="button"
                accessibilityLabel="Contact via WhatsApp to activate VIP"
              >
                <View style={styles.btnLeftContent}>
                  <View style={styles.whatsappIconCircle}>
                    <MessageSquare size={18} color="#FFF" />
                  </View>
                  <View>
                    <Text style={[styles.btnTitle, { color: themeColors.text }]}>
                      {isKu ? 'پەیوەندی لە ڕێگەی WhatsApp' : 'Contact via WhatsApp'}
                    </Text>
                    <Text style={[styles.btnSubtitle, { color: themeColors.textSecondary }]}>{ADMIN_CONTACT.whatsappDisplay}</Text>
                  </View>
                </View>
                <ExternalLink size={16} color="#25D366" />
              </Pressable>

              {/* Telegram Button */}
              <Pressable
                style={({ pressed }) => [styles.telegramBtn, pressed && { opacity: 0.8 }]}
                onPress={handleTelegram}
                accessibilityRole="button"
                accessibilityLabel="Contact via Telegram to activate VIP"
              >
                <View style={styles.btnLeftContent}>
                  <View style={styles.telegramIconCircle}>
                    <Send size={18} color="#FFF" />
                  </View>
                  <View>
                    <Text style={[styles.btnTitle, { color: themeColors.text }]}>
                      {isKu ? 'پەیوەندی لە ڕێگەی Telegram' : 'Contact via Telegram'}
                    </Text>
                    <Text style={[styles.btnSubtitle, { color: themeColors.textSecondary }]}>{ADMIN_CONTACT.telegramDisplay}</Text>
                  </View>
                </View>
                <ExternalLink size={16} color="#0088CC" />
              </Pressable>
            </View>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <View style={styles.securityFooter}>
              <ShieldCheck size={14} color={themeColors.textMuted} />
              <Text style={[styles.securityText, { color: themeColors.textMuted }]}>
                {isKu
                  ? 'پشتیوانی بۆ چالاککردنی هەژمار'
                  : 'Support is available for account activation'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '94%',
    maxWidth: 520,
    height: '90%',
    maxHeight: '92%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  crownCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web'
      ? ({ overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as any)
      : {}),
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  // Active VIP Banner
  activeVipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  activeVipTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeVipSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  // Benefits
  benefitsCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  benefitsHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
  // Step headings
  stepHeading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  // Plan cards grid
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planCard: {
    flex: 1,
    minWidth: 130,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  planBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  planDuration: {
    fontSize: 13,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  planCurrency: {
    fontSize: 11,
    fontWeight: '700',
  },
  planDays: {
    fontSize: 10,
    marginTop: 4,
  },
  // Contact section
  contactContainer: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  contactInstructions: {
    fontSize: 13,
    lineHeight: 19,
  },
  selectedPlanSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  // WhatsApp & Telegram buttons
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.28)',
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
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
    backgroundColor: 'rgba(0, 136, 204, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 136, 204, 0.28)',
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
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
    fontWeight: '700',
  },
  btnSubtitle: {
    color: '#9AA5B5',
    fontSize: 11,
    marginTop: 2,
  },
  // Footer
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityText: {
    fontSize: 11,
  },
});
