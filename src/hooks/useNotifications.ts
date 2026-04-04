import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LargeSecureStore } from '../lib/storage';
import { useState, useEffect } from 'react';

export type NotificationType =
  | 'assignment'
  | 'attendance'
  | 'leave'
  | 'announcement'
  | 'exam'
  | 'fees'
  | 'event'
  | 'timetable'
  | 'info'
  | 'warning'
  | 'success'
  | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  date: string; // Display string (e.g., "2 hours ago")
  rawDate: string; // ISO string for sorting
  read: boolean;
  priority?: 'high' | 'normal' | 'low';
  actionUrl?: string;
  source: 'notification' | 'calendar' | 'system';
}

export function useNotifications() {
  const { user, role, institutionUuid, lastReadEventsAt } = useAuth();
  const queryClient = useQueryClient();
  // Globalize local read state via React Query so all instances of useNotifications sync perfectly
  const { data: readState } = useQuery({
    queryKey: ['notifications-local-read-state', user?.id],
    initialData: { lastReadAt: null as string | null, readIds: new Set<string>() },
    staleTime: Infinity,
  });

  const localLastReadAt = readState.lastReadAt;
  const readEventIds = readState.readIds;

  // Effective timestamp: use local (optimistic) or database value
  const effectiveReadAt = localLastReadAt || lastReadEventsAt;

  // Load individual read IDs from storage (keep these local for now)
  useEffect(() => {
    const loadState = async () => {
      const ids = await LargeSecureStore.getItem(`read_event_ids_${user?.id}`);
      if (ids) {
        const parsedIds = new Set<string>(JSON.parse(ids));
        queryClient.setQueryData(['notifications-local-read-state', user?.id], (old: any) => ({
          ...old,
          readIds: parsedIds
        }));
      }
    };
    if (user?.id) loadState();
  }, [user?.id, queryClient]);

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ['aggregated-notifications', user?.id, effectiveReadAt, Array.from(readEventIds).length],
    queryFn: async () => {
      if (!institutionUuid || !user?.id) return [];

      // 1. Fetch Personal Notifications
      const { data: userNotifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifError) {
        console.error('Error fetching notifications:', notifError);
        // Don't throw if just the table is missing / RLS issues, return empty
        if (notifError.code === 'PGRST116' || notifError.code === '42P01') return [];
        throw notifError;
      }

      // 2. Fetch Academic Events (Broadcast) - Filtered by Institution
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: events, error: eventError } = await supabase
        .from('academic_events')
        .select('*')
        .eq('institution_id', institutionUuid)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (eventError) {
        console.error('Error fetching academic events:', eventError);
        // If events table missing, skip
        if (eventError.code === '42P01') return (userNotifs || []).map(n => transformNotification(n));
      }

      // Transform Personal Notifications
      const formattedUserNotifs: NotificationItem[] = (userNotifs as any[] || []).map(n => transformNotification(n));

      // Transform Academic Events
      const formattedEvents: NotificationItem[] = (events as any[] || []).map(e => ({
        id: `event-${e.id}`, 
        title: `Event: ${e.title}`,
        message: e.description || e.title,
        type: 'event',
        date: formatDistanceToNow(new Date(e.created_at || e.event_date || e.start_date), { addSuffix: true }),
        rawDate: e.created_at || e.event_date || e.start_date,
        read: readEventIds.has(e.id) || (effectiveReadAt ? new Date(e.created_at || e.event_date || e.start_date).getTime() <= new Date(effectiveReadAt).getTime() : false),
        priority: 'normal',
        source: 'calendar',
        actionUrl: `/events`
      }));

      // Merge and Sort
      return [...formattedUserNotifs, ...formattedEvents].sort((a, b) =>
        new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );
    },
    enabled: !!institutionUuid && !!user?.id
  });

  const markAsRead = async (notificationId: string) => {
    if (notificationId.startsWith('event-')) {
      const eventId = notificationId.replace('event-', '');
      const newReadIds = new Set(readEventIds).add(eventId);
      queryClient.setQueryData(['notifications-local-read-state', user?.id], (old: any) => ({
        ...(old || {}),
        readIds: newReadIds
      }));
      await LargeSecureStore.setItem(`read_event_ids_${user?.id}`, JSON.stringify(Array.from(newReadIds)));
      return;
    }

    try {
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // Force refresh data
      queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      
      // Update database for broadcast events persistence
      const now = new Date().toISOString();
      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .update({ last_read_events_at: now })
        .eq('id', user.id);

      if (profileError) console.error('Error updating profile read status:', profileError);

      // Update local timestamp for instant UI feedback
      queryClient.setQueryData(['notifications-local-read-state', user?.id], (old: any) => ({
        ...(old || {}),
        lastReadAt: now
      }));

      queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const transformNotification = (n: any): NotificationItem => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: (n.type as NotificationType) || 'info',
    date: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
    rawDate: n.created_at,
    read: n.read,
    priority: n.metadata?.priority || 'normal',
    source: 'notification',
    actionUrl: n.action_url || n.link
  });

  return { 
    notifications, 
    unreadCount: notifications.filter(n => !n.read).length,
    loading,
    markAsRead,
    markAllAsRead
  };
}
