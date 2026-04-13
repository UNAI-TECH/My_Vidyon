import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export interface AttendanceRecord {
    id: string;
    created_at: string;
    name: string;
    subtitle: string;
    type: 'Student' | 'Faculty';
}

export interface EnrollmentTrend {
    name: string;
    value: number;
}

export interface ClassDistribution {
    name: string;
    value: number;
}

export interface TrendData {
    name: string;
    value: number;
}

export function useInstitutionData(institutionId: string | null, academicYear: string) {
    const queryClient = useQueryClient();
    const today = format(new Date(), 'yyyy-MM-dd');

    // 1. Core Stats
    const { data: stats = { students: 0, teachers: 0, classes: 0, presentToday: 0, totalPeople: 0 }, isLoading: isStatsLoading } = useQuery({
        queryKey: ['inst-stats', institutionId, academicYear],
        queryFn: async () => {
            if (!institutionId) return { students: 0, teachers: 0, classes: 0, presentToday: 0, totalPeople: 0 };

            // 1. Get groups first to support indirect class counting
            const { data: groups } = await supabase.from('groups').select('id').eq('institution_id', institutionId);
            const groupIds = (groups || []).map(g => (g as any).id);

            // 2. Perform counts
            const [students, staff, classes, studentAtt, staffAtt] = await Promise.all([
                supabase.from('students').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('academic_year', academicYear),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('role', 'faculty'),
                groupIds.length > 0 
                    ? supabase.from('classes').select('id', { count: 'exact', head: true }).in('group_id', groupIds).eq('academic_year', academicYear)
                    : supabase.from('classes').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('academic_year', academicYear),
                supabase.from('student_attendance').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('attendance_date', today).eq('academic_year', academicYear).in('status', ['present', 'late']),
                supabase.from('staff_attendance').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('attendance_date', today).in('status', ['present', 'late']),
            ]);

            const totalStudents = students.count || 0;
            const totalStaff = staff.count || 0;

            return {
                students: totalStudents,
                teachers: totalStaff,
                classes: classes.count || 0,
                presentToday: studentAtt.count || 0,
                staffPresent: staffAtt.count || 0,
                totalPeople: totalStudents + totalStaff
            };
        },
        enabled: !!institutionId,
    });

    // 2. Charts Data (Enrollment, Distribution, Trends)
    const { data: charts = { enrollmentTrend: [], classDistribution: [], dailyAttendanceTrend: [], facultyAttendanceTrend: [], facultyLeaveTrend: [] }, isLoading: isChartsLoading } = useQuery({
        queryKey: ['inst-charts-v3', institutionId, academicYear],
        queryFn: async () => {
            if (!institutionId) return { enrollmentTrend: [], classDistribution: [], dailyAttendanceTrend: [], facultyAttendanceTrend: [], facultyLeaveTrend: [] };

            const { data: studentData } = await supabase
                .from('students')
                .select('created_at, class_name')
                .eq('institution_id', institutionId)
                .eq('academic_year', academicYear) as { data: { created_at: string; class_name: string }[] | null };

            // Process Enrollment Trend
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyCounts: Record<string, number> = {};
            months.forEach(m => monthlyCounts[m] = 0);

            if (studentData) {
                studentData.forEach(s => {
                    const m = months[new Date(s.created_at).getMonth()];
                    monthlyCounts[m]++;
                });
            }

            let cumulative = 0;
            const enrollmentTrend = months.map(name => {
                cumulative += monthlyCounts[name];
                return { name, value: cumulative };
            });

            // Process Class Distribution
            const classCounts: Record<string, number> = {};
            if (studentData) {
                studentData.forEach(s => {
                    const cls = s.class_name || 'Unassigned';
                    classCounts[cls] = (classCounts[cls] || 0) + 1;
                });
            }

            const classDistribution = Object.keys(classCounts).map(name => ({
                name,
                value: classCounts[name]
            })).sort((a, b) => b.value - a.value).slice(0, 5);

            // 3. Process Daily Attendance Trend (Last 7 Days)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return format(d, 'yyyy-MM-dd');
            });

            const [studentDaily, staffDaily, leaveDaily] = await Promise.all([
                supabase.from('student_attendance').select('attendance_date, status').eq('institution_id', institutionId).in('attendance_date', last7Days),
                supabase.from('staff_attendance').select('attendance_date, status').eq('institution_id', institutionId).in('attendance_date', last7Days),
                supabase.from('staff_leaves').select('created_at, status').eq('institution_id', institutionId).gte('created_at', last7Days[0])
            ]);

            const sRecords = (studentDaily.data || []) as { attendance_date: string, status: string }[];
            const stRecords = (staffDaily.data || []) as { attendance_date: string, status: string }[];
            const lRecords = (leaveDaily.data || []) as { created_at: string, status: string }[];

            const dailyAttendanceTrend = last7Days.map(date => {
                const sCount = sRecords.filter(a => a.attendance_date === date && (a.status === 'present' || a.status === 'late')).length;
                const stTotal = stRecords.filter(a => a.attendance_date === date && (a.status === 'present' || a.status === 'late')).length;
                
                const total = stats.totalPeople || 100;
                const percent = Math.round(((sCount + stTotal) / total) * 100);
                return { name: format(new Date(date), 'EEE'), value: percent > 100 ? 100 : percent };
            });

            // 4. Process Faculty Attendance Trend (Last 7 Days - Percentage)
            const facultyAttendanceTrend = last7Days.map(date => {
                const stTotal = stRecords.filter(a => a.attendance_date === date && (a.status === 'present' || a.status === 'late')).length;
                const totalTeachers = stats.teachers || 10;
                const percent = Math.round((stTotal / totalTeachers) * 100);
                return { name: format(new Date(date), 'EEE'), value: percent > 100 ? 100 : percent };
            });

            // 5. Process Faculty Leave Trend (Last 7 Days)
            const facultyLeaveTrend = last7Days.map(date => {
                const lCount = lRecords.filter(l => format(new Date(l.created_at), 'yyyy-MM-dd') === date).length;
                return { name: format(new Date(date), 'EEE'), value: lCount };
            });

            return { enrollmentTrend, classDistribution, dailyAttendanceTrend, facultyAttendanceTrend, facultyLeaveTrend };
        },
        enabled: !!institutionId && !isStatsLoading,
    });

    // 3. Live Attendance Feed
    const { data: attendanceFeed = [], isLoading: isFeedLoading, refetch: refetchFeed } = useQuery({
        queryKey: ['inst-attendance-feed', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];

            const [studentAtt, staffAtt] = await Promise.all([
                supabase
                    .from('student_attendance')
                    .select('id, created_at, status, students(name, class_name)')
                    .eq('institution_id', institutionId)
                    .eq('attendance_date', today)
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('staff_attendance')
                    .select('id, created_at, status, profiles(full_name)')
                    .eq('institution_id', institutionId)
                    .eq('attendance_date', today)
                    .order('created_at', { ascending: false })
                    .limit(5)
            ]);

            const feed: AttendanceRecord[] = [
                ...(studentAtt.data?.map((a: any) => ({
                    id: a.id,
                    created_at: a.created_at,
                    name: a.students?.name || 'Student',
                    subtitle: a.students?.class_name || 'Unknown Class',
                    type: 'Student' as const
                })) || []),
                ...(staffAtt.data?.map((a: any) => ({
                    id: a.id,
                    created_at: a.created_at,
                    name: a.profiles?.full_name || 'Staff',
                    subtitle: 'Faculty Member',
                    type: 'Faculty' as const
                })) || [])
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

            return feed;
        },
        enabled: !!institutionId,
    });

    // 4. Pending Leaves (Notifications)
    const { data: pendingLeaves = [], isLoading: isLeavesLoading } = useQuery({
        queryKey: ['inst-pending-leaves', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data } = await supabase
                .from('staff_leaves')
                .select('id, created_at, leave_type, profiles(full_name)')
                .eq('institution_id', institutionId)
                .eq('status', 'Pending')
                .order('created_at', { ascending: false })
                .limit(5);

            return (data || []).map((l: any) => ({
                id: l.id,
                message: `${l.profiles?.full_name || 'Staff'} requested ${l.leave_type}`,
                created_at: l.created_at
            }));
        },
        enabled: !!institutionId,
    });

    // 5. Fetch authenticated user's profile
    const { data: profile = null } = useQuery({
        queryKey: ['institution-profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            return data as any;
        },
    });

    // 6. Fetch institution details
    const { data: institution = null } = useQuery({
        queryKey: ['institution-details', institutionId],
        queryFn: async () => {
            if (!institutionId) return null;
            const { data } = await supabase
                .from('institutions')
                .select('*')
                .or(`id.eq.${institutionId},institution_id.eq.${institutionId}`)
                .maybeSingle();
            return data as any;
        },
        enabled: !!institutionId,
    });

    // Real-time Subscriptions
    useEffect(() => {
        if (!institutionId) return;

        const channel = supabase.channel(`inst-db-${institutionId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['inst-stats'] });
                refetchFeed();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_attendance', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['inst-stats'] });
                refetchFeed();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['inst-stats'] });
                queryClient.invalidateQueries({ queryKey: ['inst-charts-v3'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_leaves', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['inst-pending-leaves'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: `institution_id=eq.${institutionId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['inst-stats'] });
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [institutionId]);

    return {
        stats,
        charts,
        attendanceFeed,
        pendingLeaves,
        profile,
        institution,
        isLoading: isStatsLoading || isChartsLoading || isFeedLoading || isLeavesLoading
    };
}
