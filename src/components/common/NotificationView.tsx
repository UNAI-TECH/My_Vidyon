import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { theme } from '../../theme';
import { useNotifications, NotificationItem } from '../../hooks/useNotifications';
import { NotificationCard } from './NotificationCard';
import { CheckCheck, BellOff, Filter } from 'lucide-react-native';
import { PageHeader } from './PageHeader';
import { useRouter } from 'expo-router';

interface NotificationViewProps {
  role: string;
}

export const NotificationView = ({ role }: NotificationViewProps) => {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setRefreshing(true);
    // React Query handle refresh logic here if needed, 
    // but invalidateQueries in the hook/realtime handles it.
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    if (item.actionUrl) {
      router.push(item.actionUrl as any);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <BellOff size={40} color={theme.colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptySubtitle}>
        You don't have any notifications at the moment.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Notifications" 
        subtitle={unreadCount > 0 ? `You have ${unreadCount} unread messages` : 'Stay updated with your activities'}
        actions={
          unreadCount > 0 ? (
            <TouchableOpacity style={styles.markReadButton} onPress={markAllAsRead}>
              <CheckCheck size={18} color={theme.colors.primary} />
              <Text style={styles.markReadText}>Mark all as read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard item={item} onPress={handleNotificationPress} />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && { flex: 1, justifyContent: 'center' }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  markReadText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
