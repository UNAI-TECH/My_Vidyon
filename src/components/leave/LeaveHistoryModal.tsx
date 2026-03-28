import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { theme } from '../../theme';
import { X, Calendar, MessageSquare, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface LeaveHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string;
  userImage?: string | null;
  userType: 'student' | 'staff';
}

export const LeaveHistoryModal: React.FC<LeaveHistoryModalProps> = ({
  visible,
  onClose,
  userId,
  userName,
  userImage,
  userType,
}) => {
  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ['user-leave-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const query = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (userType === 'student') {
        query.eq('student_id', userId);
      } else {
        query.eq('staff_id', userId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      return data || [];
    },
    enabled: visible && !!userId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                {userImage ? (
                  <Image source={{ uri: userImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>
                      {userName?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userRole}>{userType.charAt(0).toUpperCase() + userType.slice(1)} Leave History</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.text} {...({} as any)} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
          ) : error ? (
            <View style={styles.emptyState}>
              <AlertCircle size={40} color="#F87171" {...({} as any)} />
              <Text style={styles.emptyText}>Failed to load history</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={40} color="#E2E8F0" {...({} as any)} />
              <Text style={styles.emptyText}>No leave history found</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {history.map((item: any) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.dateInfo}>
                      <Calendar size={14} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.dateText}>
                        {format(new Date(item.from_date), 'MMM d, yyyy')} - {format(new Date(item.to_date), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '10' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reasonBox}>
                    <MessageSquare size={14} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.reasonText}>{item.reason}</Text>
                  </View>

                  {item.comment ? (
                    <View style={styles.adminComment}>
                      <Text style={styles.commentLabel}>Approver Comment:</Text>
                      <Text style={styles.commentText}>{item.comment}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.timestamp}>Applied on {format(new Date(item.created_at), 'MMM d, h:mm a')}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  userRole: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reasonBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  adminComment: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  commentLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'right',
  },
  loader: {
    marginTop: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
});
