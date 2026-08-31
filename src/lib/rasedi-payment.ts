/**
 * VIP plan definitions used across the app for WhatsApp/Telegram contact flow.
 * These plan IDs, prices, and durations are displayed to users when they request VIP access.
 */

export type RasediPlanId = 'vip_1_month' | 'vip_3_months' | 'vip_6_months' | 'vip_1_year';

export type RasediPlan = {
  id: RasediPlanId;
  durationDays: number;
  durationLabel: string;
  priceIQD: number;
  badge?: string;
  popular?: boolean;
};

export const RASEDI_VIP_PLANS: RasediPlan[] = [
  {
    id: 'vip_1_month',
    durationDays: 30,
    durationLabel: '1 Month',
    priceIQD: 5000,
    badge: 'Starter',
  },
  {
    id: 'vip_3_months',
    durationDays: 90,
    durationLabel: '3 Months',
    priceIQD: 13000,
    badge: 'Popular',
    popular: true,
  },
  {
    id: 'vip_6_months',
    durationDays: 180,
    durationLabel: '6 Months',
    priceIQD: 25000,
    badge: 'Value',
  },
  {
    id: 'vip_1_year',
    durationDays: 365,
    durationLabel: '1 Year',
    priceIQD: 50000,
    badge: 'Best Value',
  },
];
