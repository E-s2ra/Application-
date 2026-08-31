import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastConfig = {
  message: string;
  type?: ToastType;
  duration?: number;
};

type ToastContextType = {
  showToast: (config: ToastConfig | string) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    const isNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 220,
        useNativeDriver: isNativeDriver,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: isNativeDriver,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (input: ToastConfig | string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const config: ToastConfig = typeof input === 'string' ? { message: input } : input;
      const type: ToastType = config.type || 'success';
      const duration = config.duration || 2600;

      setToast({ message: config.message, type });

      const isNativeDriver = Platform.OS !== 'web';
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: isNativeDriver,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: isNativeDriver,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [translateY, opacity, hideToast]
  );

  const showSuccess = useCallback((message: string, duration?: number) => showToast({ message, type: 'success', duration }), [showToast]);
  const showError = useCallback((message: string, duration?: number) => showToast({ message, type: 'error', duration }), [showToast]);
  const showInfo = useCallback((message: string, duration?: number) => showToast({ message, type: 'info', duration }), [showToast]);
  const showWarning = useCallback((message: string, duration?: number) => showToast({ message, type: 'warning', duration }), [showToast]);

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { bg: '#091E15', border: '#10B981', text: '#F0FDF4', icon: CheckCircle2 };
      case 'error':
        return { bg: '#2A0E0E', border: '#EF4444', text: '#FEF2F2', icon: AlertCircle };
      case 'warning':
        return { bg: '#291805', border: '#F59E0B', text: '#FFFBEB', icon: AlertTriangle };
      case 'info':
      default:
        return { bg: '#0F172A', border: '#0356C5', text: '#F8FAFC', icon: Info };
    }
  };

  const toastStyle = toast ? getToastColors(toast.type) : null;
  const IconComponent = toastStyle?.icon;

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      {toast && toastStyle && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top + 10, 16),
              backgroundColor: toastStyle.bg,
              borderColor: toastStyle.border,
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.toastContent}>
            {IconComponent && <IconComponent size={16} color={toastStyle.border} />}
            <Text style={[styles.toastText, { color: toastStyle.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (cfg: any) => console.log('[Toast]', cfg),
      showSuccess: (msg: string) => console.log('[Toast Success]', msg),
      showError: (msg: string) => console.log('[Toast Error]', msg),
      showInfo: (msg: string) => console.log('[Toast Info]', msg),
      showWarning: (msg: string) => console.log('[Toast Warning]', msg),
    };
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
    maxWidth: '88%',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
