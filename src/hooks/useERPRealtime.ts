import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';

/**
 * Helper to fire a local in-app notification.
 * On web/Electron desktop, uses the native Electron IPC bridge or HTML5 Notification API.
 * On mobile, uses expo-notifications.
 */
async function showLocalAlert(title: string, body: string, data?: Record<string, any>) {
  if (Platform.OS === 'web') {
    // 1. Electron Native Toast Notification (highest priority for Windows desktop toast + sound)
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.showToast) {
        (window as any).electronAPI.showToast(title, body);
        return;
      }
    } catch (e) {
      console.warn('[Realtime] electronAPI toast error:', e);
    }

    // 2. Browser HTML5 Notification (fallback for web browsers)
    if (typeof Notification !== 'undefined') {
      try {
        if (Notification.permission === 'granted') {
          const n = new Notification(title, { body, icon: '/favicon.ico' });
          n.onclick = () => { window.focus(); };
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            const n = new Notification(title, { body, icon: '/favicon.ico' });
            n.onclick = () => { window.focus(); };
          }
        }
      } catch (e) {
        console.warn('[Realtime] Could not show desktop notification:', e);
      }
    }
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {} },
      trigger: null, // immediate
    });
  } catch (e) {
    // Silently fail on simulators
  }
}

/**
 * useERPRealtime
 * 
 * Centralized real-time listener for the My-Vidyon ecosystem.
 * Automatically invalidates relevant React Query caches when 
 * database changes occur (Attendance, Fees, Assignments, etc.)
 */
export function useERPRealtime() {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  useEffect(() => {
    // 1. Attendance Real-time
    const attendanceSub = supabase
      .channel('erp-attendance')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'student_attendance' },
        (payload) => {
          console.log('Attendance Change Detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['canteen_status'] });
          queryClient.invalidateQueries({ queryKey: ['canteen-school-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['parent-children'] });
          queryClient.invalidateQueries({ queryKey: ['parent-student-detail'] });
          queryClient.invalidateQueries({ queryKey: ['parent-student-stats'] });
          const att = payload.new as any;
          // Local alert removed: redundant with notifications trigger
          // showLocalAlert(
          //   '✅ Attendance Recorded',
          //   att.status === 'present' ? 'Marked present for today' : `Attendance status: ${att.status || 'recorded'}`,
          //   { action_url }
          // );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'student_attendance' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['canteen-school-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['parent-children'] });
          queryClient.invalidateQueries({ queryKey: ['parent-student-detail'] });
          queryClient.invalidateQueries({ queryKey: ['parent-student-stats'] });
        }
      )
      .subscribe();

    // 2. Fees Real-time
    const feesSub = supabase
      .channel('erp-fees')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_fees' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['fees'] });
          queryClient.invalidateQueries({ queryKey: ['financial_stats'] });
          queryClient.invalidateQueries({ queryKey: ['parent-pending-fees'] });
        }
      )
      .subscribe();

    // 3. Assignments & Submissions Real-time
    const assignmentsSub = supabase
      .channel('erp-assignments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'assignments' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          const a = payload.new as any;
          const userRole = (role || '').toLowerCase();
          if (userRole === 'student' || userRole === 'parent') {
            showLocalAlert(
              '📝 New Assignment Posted',
              a.title ? `${a.title} has been assigned.` : 'A new assignment has been posted.',
              { action_url: '/assignments' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assignments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          queryClient.invalidateQueries({ queryKey: ['submissions'] });
        }
      )
      .subscribe();

    // 4. Leaves Real-time
    const leavesSub = supabase
      .channel('erp-leaves')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leave_requests' },
        (payload) => {
          console.log('[Realtime] New leave_request inserted:', payload);
          queryClient.invalidateQueries({ queryKey: ['leaves'] });
          queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['institution-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['my-leaves'] });

          const lv = payload.new as any;
          const userRole = (role || '').toLowerCase();
          if (userRole.includes('institution') || userRole.includes('admin') || userRole === 'faculty') {
            const reasonSnippet = lv?.reason ? `: "${lv.reason}"` : '';
            showLocalAlert(
              '📋 New Leave Request Submitted',
              `A new leave request requires review${reasonSnippet}`,
              { action_url: '/institution/leaves' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leave_requests' },
        (payload) => {
          console.log('Leave change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['leaves'] });
          queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['institution-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['parent-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['student-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['my-leaves'] });

          const lv = payload.new as any;
          if (lv?.status && (!payload.old || !(payload.old as any).status || lv.status !== (payload.old as any).status)) {
            const emoji = lv.status === 'approved' ? '✅' : lv.status === 'rejected' ? '❌' : '🔄';
            const statusUpper = lv.status.charAt(0).toUpperCase() + lv.status.slice(1);
            showLocalAlert(
              `${emoji} Leave Request ${statusUpper}`,
              `Leave request has been marked as ${lv.status}.`,
              { action_url: '/institution/leaves' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_leave_requests' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['parent-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['student-leaves'] });
          const lv = payload.new as any;
          const userRole = (role || '').toLowerCase();
          if (payload.eventType === 'INSERT' && (userRole.includes('institution') || userRole.includes('admin') || userRole === 'faculty')) {
            showLocalAlert(
              '📋 Student Leave Request',
              `A student submitted a new leave request.`,
              { action_url: '/institution/leaves' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_leaves' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leaves'] });
          queryClient.invalidateQueries({ queryKey: ['staff-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['institution-leaves'] });

          const userRole = (role || '').toLowerCase();
          if (payload.eventType === 'INSERT' && (userRole.includes('institution') || userRole.includes('admin'))) {
            const lv = payload.new as any;
            const reason = lv?.reason ? `: "${lv.reason}"` : '';
            showLocalAlert(
              '📋 Staff Leave Request',
              `A staff member submitted a leave request${reason}`,
              { action_url: '/institution/leaves' }
            );
          }
        }
      )
      .subscribe();

    // 5. Announcements Real-time
    const announcementsSub = supabase
      .channel('erp-announcements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
          const ann = payload.new as any;
          if (ann?.title) {
            showLocalAlert(
              `📢 ${ann.title}`,
              ann.content || ann.message || 'A new announcement has been posted.',
              { action_url: '/events' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'announcements' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }
      )
      .subscribe();

    // 6. Canteen Real-time
    const canteenSub = supabase
      .channel('erp-canteen')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'canteen_attendance' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['canteen_status'] });
          queryClient.invalidateQueries({ queryKey: ['canteen-attendance-records'] });
        }
      )
      .subscribe();

    // 7. Academic Events Real-time
    const eventsSub = supabase
      .channel('erp-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'academic_events' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
          queryClient.invalidateQueries({ queryKey: ['academic_events'] });
          queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
          if (payload.eventType === 'INSERT') {
            const ev = payload.new as any;
            if (ev?.title) {
              showLocalAlert(
                `📅 New Event: ${ev.title}`,
                ev.description || 'A new event has been added to the calendar.',
                { action_url: '/events' }
              );
            }
          }
        }
      )
      .subscribe();

    // 8. Notifications Real-time
    const notificationsSub = supabase
      .channel('erp-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('New Notification Detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
          
          // Show local in-app notification
          const n = payload.new as any;
          if (n?.title) {
            showLocalAlert(n.title, n.message || '', { action_url: n.action_url });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['aggregated-notifications'] });
        }
      )
      .subscribe();

    // 9. Super Admin / Admin Dashboard Real-time
    const adminSub = supabase
      .channel('erp-admin-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'institutions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['superadmin-institutions'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fee_payments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['superadmin-revenue'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
          queryClient.invalidateQueries({ queryKey: ['superadmin-activity'] });
          queryClient.invalidateQueries({ queryKey: ['user-profile'] });
          queryClient.invalidateQueries({ queryKey: ['parent-children'] });
          queryClient.invalidateQueries({ queryKey: ['parent-pending-fees'] });
        }
      )
      .subscribe();

    // 10. Grades Real-time
    const gradesSub = supabase
      .channel('erp-grades')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grades' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['parent-children'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceSub);
      supabase.removeChannel(feesSub);
      supabase.removeChannel(assignmentsSub);
      supabase.removeChannel(leavesSub);
      supabase.removeChannel(announcementsSub);
      supabase.removeChannel(canteenSub);
      supabase.removeChannel(eventsSub);
      supabase.removeChannel(notificationsSub);
      supabase.removeChannel(adminSub);
      supabase.removeChannel(gradesSub);
    };
  }, [queryClient, role]);

  // Check pending leaves on app boot for institution administrators
  useEffect(() => {
    if (!role) return;
    const userRole = (role || '').toLowerCase();
    if (userRole.includes('institution') || userRole.includes('admin')) {
      const checkPendingLeaves = async () => {
        try {
          const { count, error } = await supabase
            .from('leave_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

          if (!error && count && count > 0) {
            showLocalAlert(
              '📋 Pending Leave Requests',
              `You have ${count} pending leave request(s) awaiting approval.`
            );
          }
        } catch (e) {
          console.warn('[Realtime] Failed to check pending leaves:', e);
        }
      };

      const timer = setTimeout(checkPendingLeaves, 2500);
      return () => clearTimeout(timer);
    }
  }, [role]);
}
