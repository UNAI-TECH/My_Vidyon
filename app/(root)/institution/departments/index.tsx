import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  ChevronDown,
  ChevronUp,
  UserCheck,
  Plus,
  RefreshCw
} from 'lucide-react-native';
import { Badge } from '../../../../src/components/common/Badge';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

export default function DepartmentsScreen() {
  const { institutionId, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'subjects' | 'classes' | 'depts'>('subjects');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { 
    subjects, 
    assignments, 
    classes, 
    staff, 
    isLoading: isDataLoading 
  } = useInstitutionFaculty(institutionId);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['institution-assignments-assign'] });
    await queryClient.invalidateQueries({ queryKey: ['institution-classes-assign'] });
    await queryClient.invalidateQueries({ queryKey: ['institution-subjects-assign'] });
    await queryClient.invalidateQueries({ queryKey: ['institution-staff-assign'] });
    setIsRefreshing(false);
  };

  // Unique subject names
  const uniqueSubjects = useMemo(() => {
    const names = Array.from(new Set(subjects.map((s: any) => s.name))).sort();
    return names;
  }, [subjects]);

  // Get staff for a subject (Memory Join)
  const getStaffForSubject = (subjectName: string) => {
    const subjectIds = subjects.filter((s: any) => s.name === subjectName).map((s: any) => s.id);
    const staffMap: Record<string, { name: string; classes: string[] }> = {};

    assignments
      .filter((a: any) => subjectIds.includes(a.subject_id) && a.assignment_type === 'subject_staff')
      .forEach((a: any) => {
        const staffInfo = staff.find((s: any) => s.id === a.faculty_profile_id);
        const classInfo = classes.find((c: any) => c.id === a.class_id && c.section === a.section);
        
        const staffName = (staffInfo as any)?.full_name || 'Unknown Faculty';
        const className = (classInfo as any)?.name || 'Class';
        
        if (!staffMap[a.faculty_profile_id]) {
          staffMap[a.faculty_profile_id] = { name: staffName, classes: [] };
        }
        const label = `${className} - ${a.section}`;
        if (!staffMap[a.faculty_profile_id].classes.includes(label)) {
          staffMap[a.faculty_profile_id].classes.push(label);
        }
      });

    return Object.values(staffMap);
  };

  const getDepartmentData = () => {
    const depts: Record<string, any[]> = {};
    staff.forEach((s: any) => {
      const d = s.department || 'General';
      if (!depts[d]) depts[d] = [];
      
      const staffAssignments = assignments.filter((a: any) => a.faculty_profile_id === s.id);
      depts[d].push({ ...s, assignments: staffAssignments });
    });
    return Object.entries(depts).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const classTeachers = useMemo(() => {
    return (assignments as any[])
      .filter(a => a.assignment_type === 'class_teacher')
      .map(a => {
        const staffInfo = (staff as any[]).find(s => s.id === a.faculty_profile_id);
        const classInfo = (classes as any[]).find(c => c.id === a.class_id && c.section === a.section);
        return {
          ...a,
          profiles: staffInfo ? { full_name: staffInfo.full_name } : null,
          classes: classInfo ? { name: classInfo.name } : null
        };
      });
  }, [assignments, staff, classes]);

  if (authLoading || (isDataLoading && subjects.length === 0)) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Synchronizing Faculty Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Faculty Assignments" 
        subtitle="View assigned staff by subject or class" 
        actions={
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.refreshBtn}
              onPress={handleRefresh}
            >
              <RefreshCw size={16} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.assignBtn}
              onPress={() => router.push('/(root)/institution/faculty/assign')}
            >
              <UserCheck size={16} color="white" {...({} as any)} />
              <Text style={styles.assignBtnText}>Assign Staff</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Tab Toggle */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'subjects' && styles.activeTab]}
          onPress={() => setViewMode('subjects')}
        >
          <BookOpen size={16} color={viewMode === 'subjects' ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
          <Text style={[styles.tabText, viewMode === 'subjects' && styles.activeTabText]}>By Subject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'classes' && styles.activeTab]}
          onPress={() => setViewMode('classes')}
        >
          <GraduationCap size={16} color={viewMode === 'classes' ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
          <Text style={[styles.tabText, viewMode === 'classes' && styles.activeTabText]}>Class Teachers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'depts' && styles.activeTab]}
          onPress={() => setViewMode('depts')}
        >
          <Users size={16} color={viewMode === 'depts' ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
          <Text style={[styles.tabText, viewMode === 'depts' && styles.activeTabText]}>Depts</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {!institutionId && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Unable to load institution profile. Please login again.</Text>
          </View>
        )}

        {institutionId && viewMode === 'subjects' && (
          <>
            {uniqueSubjects.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No subjects found for this institution.</Text>
                <TouchableOpacity 
                  style={styles.miniAssignBtn}
                  onPress={() => router.push('/(root)/institution/faculty/assign')}
                >
                  <Plus size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.miniAssignText}>Configure via Assignments</Text>
                </TouchableOpacity>
              </View>
            ) : (
              uniqueSubjects.map((subjectName) => {
                const subjectStaff = getStaffForSubject(subjectName as string);
                const isExpanded = expandedSubject === subjectName;

                return (
                  <TouchableOpacity
                    key={subjectName as string}
                    style={styles.subjectCard}
                    onPress={() => setExpandedSubject(isExpanded ? null : subjectName as string)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.subjectHeader}>
                      <View style={styles.subjectLeft}>
                        <View style={styles.subjectIcon}>
                          <BookOpen size={18} color={theme.colors.primary} {...({} as any)} />
                        </View>
                        <View>
                          <Text style={styles.subjectName}>{subjectName as string}</Text>
                          <Text style={styles.staffCount}>{subjectStaff.length} teacher{subjectStaff.length !== 1 ? 's' : ''}</Text>
                        </View>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={18} color={theme.colors.textMuted} {...({} as any)} />
                      ) : (
                        <ChevronDown size={18} color={theme.colors.textMuted} {...({} as any)} />
                      )}
                    </View>

                    {isExpanded && (
                      <View style={styles.staffList}>
                        {subjectStaff.length === 0 ? (
                          <View style={styles.emptySubjects}>
                            <Text style={styles.noStaff}>No teachers assigned</Text>
                            <TouchableOpacity 
                              style={styles.miniAssignBtn}
                              onPress={() => router.push('/(root)/institution/faculty/assign')}
                            >
                              <Plus size={12} color={theme.colors.primary} {...({} as any)} />
                              <Text style={styles.miniAssignText}>Assign Now</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          subjectStaff.map((s, idx) => (
                            <View key={idx} style={styles.staffRow}>
                              <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{s.name[0]}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.staffName}>{s.name}</Text>
                                <View style={styles.classChips}>
                                  {s.classes.map((c, i) => (
                                    <View key={i} style={styles.chip}>
                                      <Text style={styles.chipText}>{c}</Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {institutionId && viewMode === 'classes' && (
          <>
            {classTeachers.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No class teachers assigned yet.</Text>
                <TouchableOpacity 
                  style={styles.miniAssignBtn}
                  onPress={() => router.push('/(root)/institution/faculty/assign')}
                >
                  <Plus size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.miniAssignText}>Assign Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              classTeachers.map((ct: any, idx: number) => (
                <View key={idx} style={styles.ctCard}>
                  <View style={styles.ctLeft}>
                    <View style={styles.ctIcon}>
                      <GraduationCap size={20} color={theme.colors.primary} {...({} as any)} />
                    </View>
                    <View>
                      <Text style={styles.ctClass}>{ct.classes?.name || 'Unknown'} - {ct.section}</Text>
                      <Text style={styles.ctLabel}>Class Teacher</Text>
                    </View>
                  </View>
                  <View style={styles.ctTeacher}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{ct.profiles?.full_name?.[0] || '?'}</Text>
                    </View>
                    <Text style={styles.ctName}>{ct.profiles?.full_name || 'Not Assigned'}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {institutionId && viewMode === 'depts' && (
          <>
            {getDepartmentData().map(([deptName, members]) => (
              <View key={deptName} style={styles.deptSection}>
                <View style={styles.deptHeader}>
                  <Text style={styles.deptTitle}>{deptName}</Text>
                  <Badge variant="info">{String(members.length) + ' Members'}</Badge>
                </View>
                <View style={styles.deptGrid}>
                  {members.map((member: any) => (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={styles.memberInfo}>
                        <View style={styles.avatarMini}>
                          <Text style={styles.avatarTextMini}>{(member as any).full_name[0]}</Text>
                        </View>
                        <Text style={styles.memberName}>{(member as any).full_name}</Text>
                      </View>
                      <View style={styles.assignmentBadges}>
                        {member.assignments.length === 0 ? (
                          <Text style={styles.noAssignments}>No active assignments</Text>
                        ) : (
                          member.assignments.map((a: any, idx: number) => {
                            const classInfo = classes.find((c: any) => c.id === a.class_id && c.section === a.section);
                            return (
                              <View key={idx} style={styles.miniBadge}>
                                <Text style={styles.miniBadgeText}>
                                  {a.assignment_type === 'class_teacher' ? 'CT: ' : ''}
                                  {(classInfo as any)?.name || 'Cls'} - {a.section}
                                </Text>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: theme.colors.textMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, elevation: 2, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  assignBtnText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC' },
  activeTab: { backgroundColor: '#3B82F615' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  empty: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
  subjectCard: { backgroundColor: 'white', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  subjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F610', justifyContent: 'center', alignItems: 'center' },
  subjectName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  staffCount: { fontSize: 12, color: theme.colors.textMuted },
  staffList: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, gap: 10 },
  noStaff: { fontSize: 13, color: theme.colors.textMuted, fontStyle: 'italic' },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F615', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  staffName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  classChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: { backgroundColor: '#3B82F610', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  chipText: { fontSize: 10, color: theme.colors.primary, fontWeight: '600' },
  emptySubjects: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  miniAssignBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F610', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  miniAssignText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary },
  ctCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  ctLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  ctIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3B82F610', justifyContent: 'center', alignItems: 'center' },
  ctClass: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  ctLabel: { fontSize: 12, color: theme.colors.textMuted },
  ctTeacher: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  ctName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  deptSection: { marginBottom: 24 },
  deptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  deptTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  deptGrid: { gap: 12 },
  memberCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatarMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F610', justifyContent: 'center', alignItems: 'center' },
  avatarTextMini: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  memberName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  assignmentBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  miniBadgeText: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted },
  noAssignments: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
});
