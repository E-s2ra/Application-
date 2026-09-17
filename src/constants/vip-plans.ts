/**
 * VIP plan definitions and manual contact-based payment system.
 * Admin contact info for WhatsApp and Telegram.
 */

export type VipPlanId = 'vip_1_month' | 'vip_3_months' | 'vip_6_months' | 'vip_1_year';

export type VipPlan = {
  id: VipPlanId;
  durationDays: number;
  durationLabel: string;
  durationLabelKu: string;
  priceIQD: number;
  badge?: string;
  badgeKu?: string;
  popular?: boolean;
};

export const VIP_PLANS: VipPlan[] = [
  {
    id: 'vip_1_month',
    durationDays: 30,
    durationLabel: '1 Month',
    durationLabelKu: '١ مانگ',
    priceIQD: 5000,
    badge: 'Starter',
    badgeKu: 'دەستپێک',
  },
  {
    id: 'vip_3_months',
    durationDays: 90,
    durationLabel: '3 Months',
    durationLabelKu: '٣ مانگ',
    priceIQD: 13000,
    badge: 'Popular',
    badgeKu: 'باوترین',
    popular: true,
  },
  {
    id: 'vip_6_months',
    durationDays: 180,
    durationLabel: '6 Months',
    durationLabelKu: '٦ مانگ',
    priceIQD: 25000,
    badge: 'Value',
    badgeKu: 'باشترین نرخ',
  },
  {
    id: 'vip_1_year',
    durationDays: 365,
    durationLabel: '1 Year',
    durationLabelKu: '١ ساڵ',
    priceIQD: 50000,
    badge: 'Best Value',
    badgeKu: 'زیادترین بەرز',
  },
];

// ─── Admin Contact Channels ───────────────────────────────────────────────────
// To change contact info: update these values only.

export const ADMIN_CONTACT = {
  whatsappNumber: '9647824076461',       // E.164 format without +
  whatsappDisplay: '+964 782 407 6461',
  telegramUsername: 'esmahil219',
  telegramDisplay: '@esmahil219',
};

export function buildWhatsAppVipUrl(
  planLabel: string,
  priceIQD: number,
  userEmail?: string | null,
): string {
  const account = userEmail ? ` (Account: ${userEmail})` : '';
  const msg = `Hi AniFlix! I want to subscribe to VIP — ${planLabel} — ${priceIQD.toLocaleString()} IQD${account}`;
  return `https://wa.me/${ADMIN_CONTACT.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

export function buildTelegramVipUrl(
  planLabel: string,
  priceIQD: number,
  userEmail?: string | null,
): string {
  const account = userEmail ? ` (Account: ${userEmail})` : '';
  const msg = `Hi AniFlix! I want to subscribe to VIP — ${planLabel} — ${priceIQD.toLocaleString()} IQD${account}`;
  return `https://t.me/${ADMIN_CONTACT.telegramUsername}?text=${encodeURIComponent(msg)}`;
}