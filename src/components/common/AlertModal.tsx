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
    switch (type) {
      case 'success': return <CheckCircle size={40} color="#10B981" {...({} as any)} />;
      case 'error': return <XCircle size={40} color="#EF4444" {...({} as any)} />;
      case 'warning': return <AlertCircle size={40} color="#F59E0B" {...({} as any)} />;
      default: return <Info size={40} color={theme.colors.primary} {...({} as any)} />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>{getIcon()}</View>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  iconContainer: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  actions: { width: '100%', flexDirection: 'row', gap: 12 },
  btn: { 
    height: 50, 
    borderRadius: 8, // Smaller radius for "beveled" feel
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtn: { 
    backgroundColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: '#D97706', // subtle bevel border
    flex: 1 
  },
  secondaryBtn: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1 
  },
  destructiveBtn: { 
    backgroundColor: '#EF4444', 
    flex: 1 
  },
  btnText: { 
    fontSize: 16, 
    fontWeight: '700',
    textAlign: 'center'
  },
});
