import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { theme } from '../../theme';
import { useNotifications } from '../../hooks/useNotifications';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

export const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const { role } = useAuth();

  const handlePress = () => {
    if (!role) return;
    
    // Map roles to folder names if they differ
    let routeRole = role;
    if (role === 'superadmin') routeRole = 'admin';
    
    router.push({
        pathname: `/(root)/${routeRole}/notifications` as any
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Bell size={24} color={theme.colors.text} {...({} as any)} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
