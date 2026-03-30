import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { theme } from '../../../../../src/theme';
import { PageHeader } from '../../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../../src/hooks/useAuth';
import { useInstitutionUsers } from '../../../../../src/hooks/useInstitutionUsers';
import { supabase } from '../../../../../src/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react-native';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  image_url?: string;
}

interface AttendanceRecord {
  id: string;
  profile_id: string;
  status: AttendanceStatus;
  attendance_date: string;
}

export default function FacultyAttendanceScreen() {
  const { institutionId } = useAuth();
  const queryClient = useQueryClient();
  const { staff, isLoading: isStaffLoading } = useInstitutionUsers(institutionId);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch attendance for the selected date
  const { data: attendanceMap = {}, isLoading: isAttendanceLoading } = useQuery<Record<string, AttendanceRecord>>({
    queryKey: ['faculty-attendance', institutionId, dateStr],
    queryFn: async () => {
      if (!institutionId) return {};
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('attendance_date', dateStr);
      
      if (error) throw error;
      
      const map: Record<string, AttendanceRecord> = {};
      data?.forEach((record: any) => {
        map[record.profile_id] = record;
      });
      return map;
    },
    enabled: !!institutionId,
  });

  const filteredStaff = useMemo(() => {
    return (staff as StaffMember[]).filter(member => {
      const matchesSearch = member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             member.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const status = attendanceMap[member.id]?.status || 'unmarked';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [staff, searchQuery, statusFilter, attendanceMap]);

  const handleMarkAttendance = async (profileId: string, status: AttendanceStatus) => {
    try {
      setMarkingId(profileId);
      const existingRecord = attendanceMap[profileId];
      
      const record = {
        institution_id: institutionId,
        profile_id: profileId,
        attendance_date: dateStr,
        status: status,
        academic_year: '2025-26', // Should ideally come from context
        marked_by: (await supabase.auth.getUser()).data.user?.id
      };

      let error;
      if (existingRecord) {
        ({ error } = await (supabase
          .from('staff_attendance') as any)
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', existingRecord.id));
      } else {
        ({ error } = await (supabase
          .from('staff_attendance') as any)
          .insert([record]));
      }

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['faculty-attendance', institutionId, dateStr] });
      queryClient.invalidateQueries({ queryKey: ['inst-stats'] });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setMarkingId(null);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10B981';
      case 'absent': return '#EF4444';
      case 'late': return '#F59E0B';
      case 'half_day': return '#6366F1';
      case 'leave': return '#8B5CF6';
      default: return '#94A3B8';
    }
  };

  const statusOptions: { label: string, value: AttendanceStatus }[] = [
    { label: 'Present', value: 'present' },
    { label: 'Absent', value: 'absent' },
    { label: 'Late', value: 'late' },
    { label: 'Half Day', value: 'half_day' },
  ];

  if (isStaffLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Faculty Attendance" 
        subtitle="Manage daily attendance for institution staff" 
      />

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(-1)}>
          <ChevronLeft size={20} color={theme.colors.text} {...({} as any)} />
        </TouchableOpacity>
        
        <View style={styles.dateInfo}>
          <CalendarIcon size={18} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.dateText}>
            {format(selectedDate, 'eeee, MMM do')}
          </Text>
        </View>

        <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(1)}>
          <ChevronRight size={20} color={theme.colors.text} {...({} as any)} />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.colors.textMuted} {...({} as any)} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search faculty..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Filter size={18} color={theme.colors.primary} {...({} as any)} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredStaff.length > 0 ? filteredStaff.map((member) => {
          const record = attendanceMap[member.id];
          const currentStatus = record?.status;
          const isMarking = markingId === member.id;

          return (
            <View key={member.id} style={styles.facultyCard}>
              <View style={styles.cardInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.full_name?.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.details}>
                  <Text style={styles.name}>{member.full_name}</Text>
                  <Text style={styles.role}>{member.role?.toUpperCase()}</Text>
                </View>
                {currentStatus && (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(currentStatus) }]}>
                      {currentStatus.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionRow}>
                {statusOptions.map((opt) => (
                  <TouchableOpacity 
                    key={opt.value}
                    style={[
                      styles.actionBtn,
                      currentStatus === opt.value && { backgroundColor: getStatusColor(opt.value), borderColor: getStatusColor(opt.value) }
                    ]}
                    onPress={() => handleMarkAttendance(member.id, opt.value)}
                    disabled={isMarking}
                  >
                    <Text style={[
                      styles.actionBtnText,
                      currentStatus === opt.value && { color: 'white' }
                    ]}>
                      {opt.label.charAt(0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {isMarking && (
                <View style={styles.markingOverlay}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              )}
            </View>
          );
        }) : (
          <View style={styles.emptyState}>
            <UserCheck size={48} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyText}>No faculty found matching the criteria</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dateBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 10 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  searchSection: { flexDirection: 'row', padding: 16, gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, height: 48 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  filterBtn: { width: 48, height: 48, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  facultyCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(52, 102, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: theme.colors.primary, fontSize: 14 },
  details: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  role: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted },
  markingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
});
