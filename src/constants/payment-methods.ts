/*
================================================================================
ARCHIVED AUTOMATED / MANUAL FIB PAYMENT METHOD (KEEP FOR FUTURE RESTORATION)
================================================================================
export type ManualPaymentMethod = 'fib';

export type PaymentMethodConfig = {
  id: ManualPaymentMethod;
  name: string;
  nameKu: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  instructionsKu: string;
  badgeColor: string;
  iconName: string;
};

export const IRAQI_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'fib',
    name: 'First Iraqi Bank (FIB)',
    nameKu: 'بانکی یەکەمی عێراقی (FIB)',
    accountNumber: '07824076461',
    accountName: 'AniFlix Official (FIB)',
    instructions: 'Send the exact plan amount via FIB App to the number above and enter your Transaction Number below.',
    instructionsKu: 'بڕی پارەی دیاریکراو لە ڕێگەی ئەپی FIB بنێرە بۆ ئەم ژمارەیەی سەرەوە و ژمارەی حەواڵەکەت لە خوارەوە بنووسە.',
    badgeColor: '#38BDF8',
    iconName: 'CreditCard',
  },
];
================================================================================
*/

export type ManualPaymentMethod = 'fib' | 'whatsapp' | 'telegram';

export type PaymentMethodConfig = {
  id: ManualPaymentMethod;
  name: string;
  nameKu: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  instructionsKu: string;
  badgeColor: string;
  iconName: string;
};

// Kept for backward compatibility with imports
export const IRAQI_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'fib',
    name: 'First Iraqi Bank (FIB)',
    nameKu: 'بانکی یەکەمی عێراقی (FIB)',
    accountNumber: '07824076461',
    accountName: 'AniFlix Official (FIB)',
    instructions: 'Send the exact plan amount via FIB App to the number above and enter your Transaction Number below.',
    instructionsKu: 'بڕی پارەی دیاریکراو لە ڕێگەی ئەپی FIB بنێرە بۆ ئەم ژمارەیەی سەرەوە و ژمارەی حەواڵەکەت لە خوارەوە بنووسە.',
    badgeColor: '#38BDF8',
    iconName: 'CreditCard',
  },
];

export type ContactPaymentChannel = 'whatsapp' | 'telegram';

export type ContactPaymentConfig = {
  id: ContactPaymentChannel;
  name: string;
  nameKu: string;
  contactValue: string;
  badgeColor: string;
  getWhatsAppUrl: (planName: string, priceIQD: number, userEmail?: string) => string;
  getTelegramUrl: (planName: string, priceIQD: number, userEmail?: string) => string;
};

export const OFFICIAL_CONTACT_CHANNELS = {
  whatsappNumber: '9647824076461',
  whatsappDisplay: '+964 782 407 6461',
  telegramUsername: 'esmahil219',
  telegramDisplay: '@esmahil219',
};

export function createWhatsAppVipMessage(planName: string, priceIQD: number, userEmail?: string): string {
  const accountInfo = userEmail ? `\n• My Account: ${userEmail}` : '';
  const message = `👋 Hello AniFlix Support!\nI would like to subscribe to AniFlix VIP Sovereign:\n• Plan: ${planName}\n• Price: ${priceIQD.toLocaleString()} IQD${accountInfo}\n\nPlease guide me on how to complete my payment. Thank you!`;
  return `https://wa.me/${OFFICIAL_CONTACT_CHANNELS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function createTelegramVipMessage(planName: string, priceIQD: number, userEmail?: string): string {
  const accountInfo = userEmail ? ` (Account: ${userEmail})` : '';
  const message = `Hi AniFlix! I want to subscribe to VIP ${planName} - ${priceIQD.toLocaleString()} IQD${accountInfo}`;
  return `https://t.me/${OFFICIAL_CONTACT_CHANNELS.telegramUsername}?text=${encodeURIComponent(message)}`;
}
