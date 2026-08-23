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
