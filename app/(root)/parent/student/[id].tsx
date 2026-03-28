import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import React, { useState } from 'react';
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
  AlertCircle,
  TrendingUp
} from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { StatCard } from '../../../../src/components/common/StatCard';
import { Badge } from '../../../../src/components/common/Badge';
import { InvoiceModal } from '../../../../src/components/fees/InvoiceModal';

export default function StudentDetail() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();

  // Fetch specific student details
  const { data: student, isLoading: isStudentLoading } = useQuery({
    queryKey: ['parent-student-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles!students_profile_id_fkey (full_name, image_url)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...(data as any),
        name: (data as any).profiles?.full_name || (data as any).name,
        image_url: (data as any).image_url || (data as any).profiles?.image_url
      };
    },
    enabled: !!id,
  });

  // Fetch institution details
  const { data: institution } = useQuery({
    queryKey: ['institution-detail', (student as any)?.institution_id],
    queryFn: async () => {
      if (!(student as any)?.institution_id) return null;
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('institution_id', (student as any).institution_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!(student as any)?.institution_id,
  });

  const [invoice, setInvoice] = useState<{ visible: boolean; data: any | null }>({
    visible: false, data: null
  });

  // Fetch student stats & logs
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['parent-student-stats', id],
    queryFn: async () => {
      // Get attendance logs
      const { data: att } = await supabase
        .from('student_attendance')
        .select('status, attendance_date')
        .eq('student_id', id)
        .order('attendance_date', { ascending: false });
      
      const attData = (att || []) as { status: string; attendance_date: string }[];
      const presentCount = attData.filter(a => a.status === 'present').length;
      const absentCount = attData.filter(a => a.status === 'absent').length;
      const lateCount = attData.filter(a => a.status === 'late').length;
      const attRate = attData.length > 0 ? Math.round((presentCount / attData.length) * 100) : 0;

      // Get latest grades from exam_results
      const { data: grades } = await supabase
        .from('exam_results')
        .select('*, subjects(name)')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get current student fees (to check if current one is paid)
      const { data: currentFee } = await supabase
        .from('student_fees')
        .select('*, fee_structures(*)')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const latestFee = currentFee as any;
      const totalPending = latestFee?.status !== 'paid' ? Number(latestFee?.amount_due || 0) : 0;
      
      // Get payment history
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('*, fee_structures(name)')
        .eq('student_id', id)
        .order('payment_date', { ascending: false });
      
      // Combine current paid fee + history
      const combinedPayments: any[] = [...(payments || [])];
      if (latestFee?.status === 'paid' && !combinedPayments.find(p => p.fee_structure_id === latestFee.fee_structure_id)) {
        combinedPayments.unshift({
          ...latestFee,
          amount_paid: latestFee.amount_paid || latestFee.amount_due,
          payment_date: latestFee.last_payment_date || latestFee.created_at,
          transaction_id: 'CURRENT_PAID'
        });
      }

      return { 
        attendanceRate: attRate, 
        presentCount, 
        absentCount, 
        lateCount,
        totalDays: attData.length,
        attendanceLogs: attData.slice(0, 5), // Latest 5 logs
        recentGrades: grades || [], 
        pendingFees: totalPending,
        paymentHistory: combinedPayments
      };
    },
    enabled: !!id,
  });

  if (isStudentLoading || isStatsLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.textMuted }}>Loading Student Profile...</Text>
      </View>
    );
  }

  const displayName = (student as any)?.name || (name as string) || "Student Profile";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={displayName} 
        subtitle={`Academic Overview for ${(student as any)?.register_number || ''}`}
        leftAction={(
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        )}
      />

      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          {(student as any)?.image_url ? (
            <Image source={{ uri: (student as any).image_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{displayName.substring(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.studentName}>{displayName}</Text>
          <Text style={styles.studentMeta}>
            Class {(student as any)?.class_name || 'N/A'} • Section {(student as any)?.section || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={[
        styles.statsGrid,
        theme.metrics.width < 380 && { flexDirection: 'column' }
      ]}>
        <View style={[styles.premiumCard, { flex: 1 }]}>
          <LinearGradient
            colors={['white', '#F8FAFC']}
            style={styles.cardGradient}
          >
            <View style={styles.premiumHeader}>
              <View style={styles.premiumTitleGroup}>
                <Text style={styles.premiumLabel}>ACADEMIC STANDING</Text>
                <Text style={styles.premiumTitle}>Attendance Overview</Text>
              </View>
              <TrendingUp size={20} color={theme.colors.primary} {...({} as any)} />
            </View>

            <View style={[
              styles.attendanceVisualInner,
              theme.metrics.width < 400 && { flexDirection: 'column', alignItems: 'center', gap: 20 }
            ]}>
              {/* Left: Circular Gauge */}
              <View style={styles.gaugeContainer}>
                <Svg width={100} height={100} viewBox="0 0 100 100">
                  <Defs>
                    <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={theme.colors.primary} />
                      <Stop offset="100%" stopColor="#F59E0B" />
                    </SvgGradient>
                  </Defs>
                  {/* Background Ring */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#F1F5F9"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Progress Ring */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="url(#grad)"
                    strokeWidth="10"
                    strokeDasharray={`${(stats?.attendanceRate || 0) * 2.827}, 282.7`}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 50 50)"
                  />
                </Svg>
                <View style={styles.gaugeContent}>
                  <Text style={styles.gaugeValue}>{stats?.attendanceRate}%</Text>
                  <Text style={styles.gaugeSub}>Rate</Text>
                </View>
              </View>

              {/* Right: Detailed Breakdown */}
              <View style={[styles.attendanceStatsGrid, theme.metrics.width < 400 && { width: '100%' }]}>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                  <View>
                    <Text style={styles.statCount}>{stats?.presentCount}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                  <View>
                    <Text style={styles.statCount}>{stats?.absentCount}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
                  <View>
                    <Text style={styles.statCount}>{stats?.lateCount || 0}</Text>
                    <Text style={styles.statLabel}>Late</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={theme.metrics.width < 380 ? { width: '100%', marginBottom: 12 } : { flex: 0.4 }}>
          <StatCard 
            title="Pending Fees" 
            value={`₹${stats?.pendingFees}`} 
            icon={CreditCard} 
            iconColor="#EF4444"
          />
        </View>
      </View>

      {/* Attendance Logs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Attendance Logs</Text>
        {stats?.attendanceLogs.length ? (
          stats.attendanceLogs.map((log: any, i: number) => (
            <View key={i} style={styles.logRow}>
              <View style={styles.logLeft}>
                <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.logDate}>{new Date(log.attendance_date).toLocaleDateString('en-GB')}</Text>
              </View>
              <Badge variant={log.status === 'present' ? 'success' : (log.status === 'absent' ? 'destructive' : 'warning')}>
                {log.status.toUpperCase()}
              </Badge>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No attendance logs found</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Grades</Text>
        {stats?.recentGrades.length ? (
          stats.recentGrades.map((g: any, i: number) => (
            <View key={i} style={styles.gradeRow}>
              <View style={styles.gradeInfo}>
                <GraduationCap size={16} color={theme.colors.textMuted} {...({} as any)} />
                <View>
                  <Text style={styles.gradeSubject}>{(g.subjects as any)?.name || 'General'}</Text>
                  <Text style={styles.gradeType}>{g.remarks || 'Test'}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.gradeValue}>{g.total_marks !== null && g.total_marks !== undefined ? `${g.total_marks} Marks` : (g.grade || 'N/A')}</Text>
                {g.max_marks !== null && <Text style={styles.marksSub}>Out of {g.max_marks}</Text>}
              </View>
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
        <Text style={styles.sectionTitle}>Payment History</Text>
        {stats?.paymentHistory.length ? (
          stats.paymentHistory.map((p: any, i: number) => (
            <View key={i} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View>
                  <Text style={styles.paymentName}>{displayName}</Text>
                  <Text style={styles.paymentSub}>{(p.fee_structures as any)?.name || 'Tuition Fee'}</Text>
                </View>
                <Badge variant="success">PAID</Badge>
              </View>
              
              <View style={styles.paymentGrid}>
                <View>
                  <Text style={styles.paymentLabel}>AMOUNT</Text>
                  <Text style={styles.paymentValue}>₹ {Number(p.amount_paid).toLocaleString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paymentLabel}>PAID DATE</Text>
                  <Text style={styles.paymentValue}>{new Date(p.payment_date).toLocaleDateString()}</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.paymentReceiptBtn}
                onPress={() => {
                  let components = [{ title: 'Fees', amount: p.amount_paid }];
                  try {
                    if (p.fee_structures?.description) {
                      const parsed = JSON.parse(p.fee_structures.description);
                      if (Array.isArray(parsed)) components = parsed;
                    }
                  } catch (e) {}

                  setInvoice({
                    visible: true,
                    data: {
                      amount: p.amount_paid,
                      date: p.payment_date,
                      transaction_id: p.transaction_id || 'TXN-HISTORY',
                      components,
                      student: {
                        name: displayName,
                        register_number: (student as any)?.register_number || '',
                        class_name: (student as any)?.class_name || '',
                        section: (student as any)?.section || '',
                        roll_no: (student as any)?.register_number || ''
                      },
                      institution: {
                        name: (institution as any)?.name || 'Institution',
                        logo_url: (institution as any)?.logo_url || null,
                        address: (institution as any)?.address || ''
                      }
                    }
                  });
                }}
              >
                <FileText size={18} color="#924E00" style={{ marginRight: 8 }} {...({} as any)} />
                <Text style={styles.paymentReceiptText}>Receipt</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No payment history found</Text>
          </View>
        )}
      </View>

      {invoice.data && (
        <InvoiceModal 
          visible={invoice.visible}
          onClose={() => setInvoice({ ...invoice, visible: false })}
          institution={invoice.data.institution}
          student={invoice.data.student}
          payment={invoice.data}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/(root)/parent/exams/[studentId]',
              params: { studentId: id, name: displayName }
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
      <View style={{ alignItems: 'center', marginVertical: 40, opacity: 0.4 }}>
        <Image source={require('../../../../assets/logo.png')} style={{ width: 100, height: 30, resizeMode: 'contain' }} />
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
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 16, marginTop: 24, letterSpacing: 0.5 },
  
  // Premium Card Styles
  premiumCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    marginVertical: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardGradient: { padding: 24 },
  premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  premiumTitleGroup: { gap: 4 },
  premiumLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5 },
  premiumTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  
  attendanceVisualInner: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  gaugeContainer: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  gaugeContent: { position: 'absolute', alignItems: 'center' },
  gaugeValue: { fontSize: 24, fontWeight: '900', color: theme.colors.text },
  gaugeSub: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' },
  
  attendanceStatsGrid: { flex: 1, gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statCount: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  statLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

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
  actionText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  avatarImage: { width: '100%', height: '100%' },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#F8FAFC' },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logDate: { fontSize: 14, color: theme.colors.text },
  gradeType: { fontSize: 12, color: theme.colors.textMuted },
  marksSub: { fontSize: 10, color: theme.colors.textMuted },
  paymentCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  paymentName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  paymentSub: { fontSize: 13, color: theme.colors.textMuted },
  paymentGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  paymentLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase' },
  paymentValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 },
  paymentReceiptBtn: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  paymentReceiptText: { color: '#924E00', fontWeight: 'bold', fontSize: 15 },
});
