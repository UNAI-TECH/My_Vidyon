import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { theme } from '../../theme';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react-native';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (config: AlertConfig) => void;
}

const AlertContext = createContext<AlertContextType>({ showAlert: () => {} });

export const useThemedAlert = () => useContext(AlertContext);

const getAlertIcon = (type: AlertType) => {
  switch (type) {
    case 'success':
      return <CheckCircle size={32} color="#10B981" {...({} as any)} />;
    case 'error':
      return <XCircle size={32} color="#EF4444" {...({} as any)} />;
    case 'warning':
      return <AlertTriangle size={32} color="#F59E0B" {...({} as any)} />;
    case 'info':
    default:
      return <Info size={32} color={theme.colors.primary} {...({} as any)} />;
  }
};

const getIconBg = (type: AlertType) => {
  switch (type) {
    case 'success': return '#ECFDF5';
    case 'error': return '#FEF2F2';
    case 'warning': return '#FFFBEB';
    case 'info':
    default: return theme.colors.primary + '15';
  }
};

const getAccentColor = (type: AlertType) => {
  switch (type) {
    case 'success': return '#10B981';
    case 'error': return '#EF4444';
    case 'warning': return '#F59E0B';
    case 'info':
    default: return theme.colors.primary;
  }
};

export const ThemedAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const showAlert = useCallback((alertConfig: AlertConfig) => {
    setConfig(alertConfig);
    setVisible(true);
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 200 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
      callback?.();
    });
  }, []);

  const alertType = config?.type || 'info';
  const buttons = config?.buttons || [{ text: 'OK', style: 'default' as const }];

  React.useEffect(() => {
    if (visible && alertType === 'error') {
      console.error(`\n🚨 [TERMINAL ERROR REPORT] 🚨\nTitle: ${config?.title}\nMessage: ${config?.message}\n`);
    }
  }, [visible, alertType, config]);

  const displayMessage = React.useMemo(() => {
    if (alertType !== 'error') return config?.message || '';
    const raw = config?.message || '';
    const lower = raw.toLowerCase();
    const isTechnical = 
      lower.includes('mime type') ||
      lower.includes('not supported') ||
      lower.includes('network request failed') ||
      lower.includes('referenceerror') ||
      lower.includes('syntaxerror') ||
      lower.includes('typeerror') ||
      lower.includes('postgrest') ||
      lower.includes('violates') ||
      lower.includes('foreign key') ||
      lower.includes('jwt') ||
      lower.includes('null value') ||
      lower.includes('column') ||
      lower.includes('relation') ||
      lower.includes('status code');

    if (isTechnical) {
      if ((config?.title || '').toLowerCase().includes('upload') || lower.includes('mime')) {
        return 'Unable to complete upload. Please check the file and try again.';
      }
      return 'An unexpected error occurred. Please try again.';
    }
    return raw;
  }, [alertType, config]);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
            {/* Top accent bar */}
            <View style={[styles.accentBar, { backgroundColor: getAccentColor(alertType) }]} />

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: getIconBg(alertType) }]}>
              {getAlertIcon(alertType)}
            </View>

            {/* Title */}
            <Text style={styles.title}>{config?.title}</Text>

            {/* Message */}
            <Text style={styles.message}>{displayMessage}</Text>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                const isPrimary = !isCancel && !isDestructive;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.button,
                      { flex: 1 },
                      isCancel && styles.cancelButton,
                      isDestructive && styles.destructiveButton,
                      isPrimary && { backgroundColor: getAccentColor(alertType) },
                    ]}
                    onPress={() => dismiss(btn.onPress)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.buttonText,
                      isCancel && styles.cancelButtonText,
                      (isPrimary || isDestructive) && { color: 'white' },
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  accentBar: {
    width: '100%',
    height: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  button: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: theme.colors.textMuted,
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
});
