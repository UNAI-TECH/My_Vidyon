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
  const { data: readState = { lastReadAt: null, readIds: new Set<string>() } } = useQuery({
    queryKey: ['notifications-local-read-state', user?.id],
    queryFn: () => ({ lastReadAt: null as string | null, readIds: new Set<string>() }),
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
      if (!user?.id) return [];

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

      // 2. Fetch Academic Events (Broadcast) - Filtered by Institution (excluding sponsored ads)
      let validEvents: any[] = [];
      if (institutionUuid) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: events, error: eventError } = await (supabase
          .from('academic_events') as any)
          .select('*')
          .eq('institution_id', institutionUuid)
          .neq('event_type', 'sponsored')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (!eventError && events) {
          validEvents = (events as any[]).filter(
            (e: any) => e.event_type !== 'sponsored' && !e.is_admin_added
          );
        }
      }

      // Transform Personal Notifications
      const formattedUserNotifs: NotificationItem[] = (userNotifs as any[] || []).map(n => transformNotification(n));

      // Transform Academic Events
      const formattedEvents: NotificationItem[] = validEvents.map((e: any) => ({
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

      // 3. Fetch Out-of-Credits Ads (Notify Ad Managers & Admins)
      let adExhaustedNotifs: NotificationItem[] = [];
      try {
        const userRoleLower = (role || '').toLowerCase();
        if (userRoleLower.includes('ad') || userRoleLower.includes('admin') || userRoleLower.includes('stakeholder') || userRoleLower === 'superadmin' || userRoleLower === 'super_admin') {
          let adQuery = (supabase.from('academic_events') as any)
            .select('id, title, paid_amount, remaining_balance, amount_debited, updated_at, created_at')
            .eq('is_admin_added', true);

          if (institutionUuid) {
            adQuery = adQuery.or(`institution_id.eq.${institutionUuid},institution_id.is.null`);
          }

          const { data: allAds } = await adQuery;
          const depletedAds = (allAds as any[] || []).filter(a => 
            Number(a.paid_amount) > 0 && 
            (Number(a.remaining_balance) <= 0 || Number(a.amount_debited) >= Number(a.paid_amount))
          );

          adExhaustedNotifs = depletedAds.map(a => {
            const notifKey = `ad-exhausted-${a.id}`;
            const eventTime = a.updated_at || a.created_at || new Date().toISOString();
            return {
              id: notifKey,
              title: `⚠️ Ad Ran Out of Credits: ${a.title}`,
              message: `This ad ran out of credits. Its budget of ₹${Number(a.paid_amount).toLocaleString('en-IN')} is exhausted and impressions are paused. Top up budget in Ad Management to resume.`,
              type: 'warning' as const,
              date: formatDistanceToNow(new Date(eventTime), { addSuffix: true }),
              rawDate: eventTime,
              read: readEventIds.has(notifKey) || (effectiveReadAt ? new Date(eventTime).getTime() <= new Date(effectiveReadAt).getTime() : false),
              priority: 'high' as const,
              source: 'system' as const,
              actionUrl: '/(root)/admin/ads'
            };
          });
        }
      } catch (err) {
        console.warn('Error fetching out-of-credit ad notifications:', err);
      }

      // Merge and Sort
      return [...formattedUserNotifs, ...formattedEvents, ...adExhaustedNotifs].sort((a, b) =>
        new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );
    },
    enabled: !!user?.id
  });

  const markAsRead = async (notificationId: string) => {
    if (notificationId.startsWith('event-') || notificationId.startsWith('ad-exhausted-')) {
      const eventId = notificationId;
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
