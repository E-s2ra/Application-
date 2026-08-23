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
    nameAr: 'المصرف العراقي الأول (FIB)',
    accountNumber: '0770 000 0000',
    accountName: 'AniFlix Media',
    instructions: 'Send the exact plan amount via FIB App and enter your Transaction Number below.',
    instructionsAr: 'أرسل المبلغ المطلوب عبر تطبيق FIB واكتب رقم الحوالة أدناه.',
    badgeColor: '#38BDF8',
    iconName: 'CreditCard',
  },
  {
    id: 'zaincash',
    name: 'ZainCash (زين كاش)',
    nameAr: 'محفظة زين كاش',
    accountNumber: '0780 000 0000',
    accountName: 'AniFlix Official',
    instructions: 'Transfer the amount to the ZainCash wallet number above and enter your sender phone number.',
    instructionsAr: 'حوّل المبلغ إلى رقم محفظة زين كاش أعلاه واكتب رقم هاتفك المحول منه.',
    badgeColor: '#EC4899',
    iconName: 'Smartphone',
  },
  {
    id: 'fastpay',
    name: 'FastPay (فاست باي)',
    nameAr: 'محفظة فاست باي',
    accountNumber: '0750 000 0000',
    accountName: 'AniFlix Entertainment',
    instructions: 'Send the amount to the FastPay number above and enter your FastPay transaction ID.',
    instructionsAr: 'أرسل المبلغ إلى رقم فاست باي أعلاه واكتب رقم الحوالة.',
    badgeColor: '#F59E0B',
    iconName: 'Zap',
  },
  {
    id: 'asiacell',
    name: 'AsiaCell / Korek Cards (كارتات رصيد)',
    nameAr: 'كارتات رصيد آسيا أو كورك',
    accountNumber: 'Send Card PIN Code',
    accountName: 'Prepaid Voucher',
    instructions: 'Buy a recharge card matching the amount (e.g. 5,000 IQD) and enter the 14-digit PIN code below.',
    instructionsAr: 'اشترِ كارت رصيد بالقيمة المطلوبة واكتب كود الكارت المكون من 14 رقماً أدناه.',
    badgeColor: '#10B981',
    iconName: 'Ticket',
  },
];
