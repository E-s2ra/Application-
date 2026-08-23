export type ManualPaymentMethod = 'fib' | 'zaincash' | 'fastpay' | 'asiacell';

export type PaymentMethodConfig = {
  id: ManualPaymentMethod;
  name: string;
  nameAr: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  instructionsAr: string;
  badgeColor: string;
  iconName: string;
};

export const IRAQI_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'fib',
    name: 'First Iraqi Bank (FIB)',
    nameAr: 'المصرف العراقي الأول (FIB) · متاح الآن',
    accountNumber: '07824076461',
    accountName: 'AniFlix Official (FIB)',
    instructions: 'Send the exact plan amount via FIB App to the number above and enter your Transaction Number below.',
    instructionsAr: 'أرسل المبلغ المطلوب عبر تطبيق FIB إلى الرقم أعلاه واكتب رقم الحوالة أدناه.',
    badgeColor: '#38BDF8',
    iconName: 'CreditCard',
  },
  {
    id: 'asiacell',
    name: 'AsiaCell / Korek Cards (كارتات رصيد)',
    nameAr: 'كارتات رصيد آسيا أو كورك · متاح الآن',
    accountNumber: 'Send 14-Digit PIN',
    accountName: 'Prepaid Voucher',
    instructions: 'Buy a recharge card matching the amount (e.g. 5,000 IQD) and enter the 14-digit PIN code below.',
    instructionsAr: 'اشترِ كارت رصيد بالقيمة المطلوبة واكتب كود الكارت المكون من 14 رقماً أدناه.',
    badgeColor: '#10B981',
    iconName: 'Ticket',
  },
  {
    id: 'zaincash',
    name: 'ZainCash (زين كاش)',
    nameAr: 'محفظة زين كاش (قريباً)',
    accountNumber: 'Coming Soon / قريباً',
    accountName: 'Use FIB or AsiaCell for now',
    instructions: 'ZainCash will be available soon. Please use FIB or AsiaCell cards above.',
    instructionsAr: 'ستتوفر محفظة زين كاش قريباً. يرجى استخدام FIB أو كارتات الرصيد حالياً.',
    badgeColor: '#EC4899',
    iconName: 'Smartphone',
  },
  {
    id: 'fastpay',
    name: 'FastPay (فاست باي)',
    nameAr: 'محفظة فاست باي (قريباً)',
    accountNumber: 'Coming Soon / قريباً',
    accountName: 'Use FIB or AsiaCell for now',
    instructions: 'FastPay will be available soon. Please use FIB or AsiaCell cards above.',
    instructionsAr: 'ستتوفر محفظة فاست باي قريباً. يرجى استخدام FIB أو كارتات الرصيد حالياً.',
    badgeColor: '#F59E0B',
    iconName: 'Zap',
  },
];
