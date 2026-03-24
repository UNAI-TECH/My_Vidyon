import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { 
  Calendar, 
  ChevronLeft, 
  GraduationCap, 
  Clock, 
  CreditCard,
  FileText,
  AlertCircle
} from 'lucide-react-native';
import { StatCard } from '../../../../src/components/common/StatCard';

export default function StudentDetail() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();

  // Fetch specific student details
  const { data: student, isLoading: isStudentLoading } = useQuery({
    queryKey: ['parent-student-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          profiles:id (full_name, email, avatar_url)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch student stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['parent-student-stats', id],
    queryFn: async () => {
      // Get attendance
      const { data: att } = await supabase
        .from('student_attendance')
        .select('status')
        .eq('student_id', id);
      
      const attData = (att || []) as { status: string }[];
      const presentCount = attData.filter(a => a.status === 'present').length;
      const attRate = attData.length > 0 ? Math.round((presentCount / attData.length) * 100) : 0;

      // Get latest grades
      const { data: grades } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get pending fees
      const { data: fees } = await supabase
        .from('student_fees')
        .select('amount, paid_amount')
        .eq('student_id', id)
        .eq('status', 'pending');
      
      const feeData = (fees || []) as { amount: number; paid_amount: number }[];
      const totalPending = feeData.reduce((acc, curr) => acc + (Number(curr.amount) - Number(curr.paid_amount)), 0);

      return { attendanceRate: attRate, recentGrades: grades || [], pendingFees: totalPending };
    },
    enabled: !!id,
  });

  if (isStudentLoading || isStatsLoading) {
    return <View style={styles.loading}><Text>Loading Student Profile...</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={(name as string) || (student as any)?.profiles?.full_name || "Student Profile"} 
        subtitle={`Academic Overview for ${(student as any)?.register_number || ''}`}
        leftAction={(
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        )}
      />

      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(name as string)?.substring(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.studentName}>{name || (student as any)?.profiles?.full_name}</Text>
          <Text style={styles.studentMeta}>Class {(student as any)?.class_name || 'N/A'} • Section {(student as any)?.section || 'A'}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Attendance" 
          value={`${stats?.attendanceRate}%`} 
          icon={Calendar} 
          iconColor="#10B981"
        />
        <StatCard 
          title="Pending Fees" 
          value={`₹${stats?.pendingFees}`} 
          icon={CreditCard} 
          iconColor="#EF4444"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Grades</Text>
        {stats?.recentGrades.length ? (
          stats.recentGrades.map((g: any, i: number) => (
            <View key={i} style={styles.gradeRow}>
              <View style={styles.gradeInfo}>
                <GraduationCap size={16} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.gradeSubject}>{g.subject || 'General'}</Text>
              </View>
              <Text style={styles.gradeValue}>{g.grade}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <AlertCircle size={20} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyText}>No recent grades recorded</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/(root)/parent/exams/[studentId]',
              params: { studentId: id, name: name }
            })}
          >
            <Calendar size={20} color={theme.colors.primary} {...({} as any)} />
            <Text style={styles.actionText}>Exam Timetable</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F0FDF4' }]}
            onPress={() => router.push({
              pathname: '/(root)/parent/leaves',
              params: { studentId: id }
            })}
          >
            <FileText size={20} color="#10B981" {...({} as any)} />
            <Text style={[styles.actionText, { color: '#10B981' }]}>Apply Leave</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginRight: 12 },
  headerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  avatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  headerInfo: { flex: 1 },
  studentName: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  studentMeta: { fontSize: 14, color: theme.colors.textMuted },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  gradeRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC'
  },
  gradeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradeSubject: { fontSize: 15, color: theme.colors.text },
  gradeValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  emptyState: { alignItems: 'center', gap: 8, padding: 32 },
  emptyText: { color: theme.colors.textMuted },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionButton: { 
    flex: 1, 
    backgroundColor: theme.colors.primary + '10', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    gap: 8 
  },
  actionText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary }
});
