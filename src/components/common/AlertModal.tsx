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

  React.useEffect(() => {
    if (visible && type === 'error') {
      console.error(`\n🚨 [TERMINAL ERROR REPORT] 🚨\nTitle: ${title}\nMessage: ${message}\n`);
    }
  }, [visible, type, title, message]);

  const displayMessage = React.useMemo(() => {
    if (type !== 'error') return message;
    const lower = (message || '').toLowerCase();
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
      if (title.toLowerCase().includes('upload') || lower.includes('mime')) {
        return 'Unable to upload file. Please check the file and try again.';
      }
      return 'An unexpected error occurred. Please try again.';
    }
    return message;
  }, [message, type, title]);

  const renderMessageContent = () => {
    const lines = (displayMessage || '').split('\n');
    const introLines: string[] = [];
    const bulletItems: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        bulletItems.push(trimmed.replace(/^[•\-]\s*/, ''));
      } else {
        introLines.push(trimmed);
      }
    });

    if (bulletItems.length === 0) {
      return <Text style={styles.message}>{displayMessage}</Text>;
    }

    return (
      <View style={styles.messageWrapper}>
        {introLines.length > 0 && (
          <Text style={styles.introText}>{introLines.join(' ')}</Text>
        )}
        <View style={styles.bulletListContainer}>
          {bulletItems.map((item, idx) => (
            <View key={idx} style={styles.bulletItemRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletItemText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
            {getIcon()}
          </View>
          <Text style={styles.title}>{title}</Text>
          {renderMessageContent()}
          
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 22, 
    width: '100%', 
    maxWidth: 390, 
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10 
  },
  title: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#0F172A', 
    marginBottom: 6, 
    textAlign: 'center',
    letterSpacing: -0.3
  },
  message: { 
    fontSize: 13.5, 
    color: '#475569', 
    textAlign: 'center', 
    marginBottom: 20, 
    lineHeight: 20 
  },
  messageWrapper: {
    width: '100%',
    marginBottom: 18,
  },
  introText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  bulletListContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  bulletItemText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  actions: { 
    width: '100%', 
    flexDirection: 'row',
    flexWrap: 'wrap-reverse', 
    justifyContent: 'center',
    gap: 10 
  },
  btn: { 
    height: 42, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 18,
    minWidth: '45%'
  },
  primaryBtn: { 
    backgroundColor: theme.colors.primary,
    flex: 1,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnText: { 
    fontSize: 14, 
    fontWeight: '600',
    textAlign: 'center'
  },
});
