import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react-native';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  buttons?: {
    text: string;
    style?: 'primary' | 'secondary' | 'destructive';
    onPress: () => void;
  }[];
}

export const AlertModal = ({ 
  visible, 
  title, 
  message, 
  type = 'info', 
  onClose,
  buttons
}: AlertModalProps) => {
  const getIcon = () => {
    const iconSize = 28;
    switch (type) {
      case 'success': return <CheckCircle size={iconSize} color="#10B981" {...({} as any)} />;
      case 'error': return <XCircle size={iconSize} color="#EF4444" {...({} as any)} />;
      case 'warning': return <AlertCircle size={iconSize} color="#F59E0B" {...({} as any)} />;
      default: return <Info size={iconSize} color={theme.colors.primary} {...({} as any)} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'success': return '#F0FDF4';
      case 'error': return '#FEF2F2';
      case 'warning': return '#FFFBEB';
      default: return theme.colors.primary + '15';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
            {getIcon()}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.actions}>
            {buttons ? (
              buttons.map((btn, idx) => (
                <TouchableOpacity 
                  key={idx}
                  style={[
                    styles.btn,
                    btn.style === 'primary' ? styles.primaryBtn : 
                    btn.style === 'destructive' ? styles.destructiveBtn : styles.secondaryBtn,
                    buttons.length > 1 && { flex: 1 }
                  ]}
                  onPress={() => {
                    btn.onPress();
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.btnText,
                    btn.style === 'primary' || btn.style === 'destructive' ? { color: 'white' } : { color: theme.colors.textMuted }
                  ]}>{btn.text}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={onClose}>
                <Text style={[styles.btnText, { color: 'white' }]}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.7)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 32, 
    padding: 32, 
    width: '100%', 
    maxWidth: 340, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: { 
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: theme.colors.text, 
    marginBottom: 12, 
    textAlign: 'center',
    letterSpacing: -0.5
  },
  message: { 
    fontSize: 16, 
    color: theme.colors.textMuted, 
    textAlign: 'center', 
    marginBottom: 32, 
    lineHeight: 24 
  },
  actions: { 
    width: '100%', 
    flexDirection: 'row', 
    gap: 12 
  },
  btn: { 
    height: 56, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 24,
  },
  primaryBtn: { 
    backgroundColor: theme.colors.primary,
    flex: 1,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryBtn: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1 
  },
  destructiveBtn: { 
    backgroundColor: '#EF4444', 
    flex: 1,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { 
    fontSize: 16, 
    fontWeight: '700',
    textAlign: 'center'
  },
});
