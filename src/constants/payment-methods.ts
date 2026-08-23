export type ManualPaymentMethod = 'fib' | 'zaincash' | 'fastpay' | 'asiacell';

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
    name: 'First Iraqi Bank (FIB) · Available Now',
    nameKu: 'بانکی یەکەمی عێراقی (FIB) · بەردەستە',
    accountNumber: '07824076461',
    accountName: 'AniFlix Official (FIB)',
    instructions: 'Send the exact plan amount via FIB App to the number above and enter your Transaction Number below.',
    instructionsKu: 'بڕی پارەی دیاریکراو لە ڕێگەی ئەپی FIB بنێرە بۆ ئەم ژمارەیەی سەرەوە و ژمارەی حەواڵەکەت لە خوارەوە بنووسە.',
    badgeColor: '#38BDF8',
    iconName: 'CreditCard',
  },
  {
    id: 'asiacell',
    name: 'AsiaCell / Korek Cards · Available Now',
    nameKu: 'کارتەکانی ئاسیاسێڵ / کۆڕەک · بەردەستە',
    accountNumber: 'Send 14-Digit PIN',
    accountName: 'Prepaid Voucher',
    instructions: 'Buy a recharge card matching the amount (e.g. 5,000 IQD) and enter the 14-digit PIN code below.',
    instructionsKu: 'کارتێکی باڵانس بە نرخی دیاریکراو (بۆ نموونە ٥,٠٠٠ دینار) بکڕە و کۆدی ١٤ ژمارەیی کارتەکە لە خوارەوە بنووسە.',
    badgeColor: '#10B981',
    iconName: 'Ticket',
  },
  {
    id: 'zaincash',
    name: 'ZainCash (Coming Soon)',
    nameKu: 'زەین کاش (بەمدووانە)',
    accountNumber: 'Coming Soon',
    accountName: 'Use FIB or AsiaCell for now',
    instructions: 'ZainCash will be available soon. Please use FIB or AsiaCell cards above.',
    instructionsKu: 'زەین کاش بەم زووانە بەردەست دەبێت. تکایە ئێستا FIB یان کارتی باڵانس بەکاربهێنە.',
    badgeColor: '#EC4899',
    iconName: 'Smartphone',
  },
  {
    id: 'fastpay',
    name: 'FastPay (Coming Soon)',
    nameKu: 'فاست پەی (بەمدووانە)',
    accountNumber: 'Coming Soon',
    accountName: 'Use FIB or AsiaCell for now',
    instructions: 'FastPay will be available soon. Please use FIB or AsiaCell cards above.',
    instructionsKu: 'فاست پەی بەم زووانە بەردەست دەبێت. تکایە ئێستا FIB یان کارتی باڵانس بەکاربهێنە.',
    badgeColor: '#F59E0B',
    iconName: 'Zap',
  },
];
