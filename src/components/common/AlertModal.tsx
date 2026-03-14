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
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
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
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  actions: { width: '100%', flexDirection: 'row', gap: 12 },
  btn: { height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  primaryBtn: { backgroundColor: theme.colors.primary, flex: 1 },
  secondaryBtn: { backgroundColor: '#F1F5F9', flex: 1 },
  destructiveBtn: { backgroundColor: '#EF4444', flex: 1 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
