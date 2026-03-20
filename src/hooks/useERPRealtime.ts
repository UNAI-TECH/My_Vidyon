import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * useERPRealtime
 * 
 * Centralized real-time listener for the My-Vidyon ecosystem.
 * Automatically invalidates relevant React Query caches when 
 * database changes occur (Attendance, Fees, Assignments, etc.)
 */
export function useERPRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Attendance Real-time
    const attendanceSub = supabase
      .channel('erp-attendance')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_attendance' },
        (payload) => {
          console.log('Attendance Change Detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['canteen_status'] });
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
        { event: '*', schema: 'public', table: 'assignments' },
        (payload) => {
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
        { event: '*', schema: 'public', table: 'leave_requests' },
        (payload) => {
          console.log('Leave change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['leaves'] });
          queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['institution-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['parent-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['student-leaves'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_leave_requests' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['parent-leaves'] });
          queryClient.invalidateQueries({ queryKey: ['student-leaves'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_leaves' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leaves'] });
          queryClient.invalidateQueries({ queryKey: ['staff-leaves'] });
        }
      )
      .subscribe();

    // 5. Announcements Real-time
    const announcementsSub = supabase
      .channel('erp-announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
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
        }
      )
      .subscribe();

    // 8. Notifications Real-time
    const notificationsSub = supabase
      .channel('erp-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('Notification Change Detected:', payload);
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
  }, [queryClient]);
}
