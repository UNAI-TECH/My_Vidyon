import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { 
  Bell, 
  Calendar, 
  FileText, 
  UserCheck, 
  CreditCard, 
  AlertTriangle, 
  Info,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react-native';
import { NotificationItem, NotificationType } from '../../hooks/useNotifications';

interface NotificationCardProps {
  item: NotificationItem;
  onPress?: (item: NotificationItem) => void;
}

export const NotificationCard = ({ item, onPress }: NotificationCardProps) => {
  const getIcon = (type: NotificationType) => {
    const size = 20;
    const color = item.read ? theme.colors.textMuted : theme.colors.primary;
    
    switch (type) {
      case 'assignment': return <FileText size={size} color={color} />;
      case 'attendance': return <UserCheck size={size} color={color} />;
      case 'fees': return <CreditCard size={size} color={color} />;
      case 'event': return <Calendar size={size} color={color} />;
      case 'warning': return <AlertTriangle size={size} color="#F59E0B" />;
      case 'success': return <CheckCircle size={size} color="#10B981" />;
      case 'error': return <XCircle size={size} color="#EF4444" />;
      default: return <Info size={size} color={color} />;
    }
  };

  const getBackgroundColor = () => {
    if (item.read) return 'white';
    switch (item.type) {
      case 'warning': return '#FFFBEB';
      case 'error': return '#FEF2F2';
      case 'success': return '#F0FDF4';
      default: return '#F0F9FF';
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor: getBackgroundColor() },
        !item.read && styles.unreadBorder
      ]}
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, item.read && styles.readIconContainer]}>
        {getIcon(item.type)}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, item.read && styles.readText]}>{item.title}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={[styles.message, item.read && styles.readText]} numberOfLines={2}>
          {item.message}
        </Text>
        <View style={styles.footer}>
          <View style={styles.timeInfo}>
            <Clock size={12} color={theme.colors.textMuted} />
            <Text style={styles.timeText}>{item.date}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  unreadBorder: {
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  readIconContainer: {
    backgroundColor: '#F8FAFC',
    borderColor: 'transparent',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 10,
  },
  readText: {
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  }
});
