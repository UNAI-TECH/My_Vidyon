import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Layers, 
  Users,
  ChevronRight
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';

export default function InstitutionOrg() {
  const { institutionId, institutionUuid } = useAuth();
  const [selectedDept, setSelectedDept] = React.useState<string | null>(null);

  // The database schema (profiles, classes) uses the institution slug (code like SS1212)
  const targetId = institutionId || institutionUuid;

  // 1. Fetch All Profiles for this institution (to derive departments and staff lists)
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['inst-profiles', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', targetId);
      return (data || []) as any[];
    },
    enabled: !!targetId
  });

  const departments = React.useMemo(() => {
    const deptMap: Record<string, { faculty: number, students: number }> = {};
    profiles.forEach(p => {
      const name = (p.department || '').trim();
      if (!name) return;
      if (!deptMap[name]) deptMap[name] = { faculty: 0, students: 0 };
      if (p.role?.toLowerCase() === 'faculty') deptMap[name].faculty++;
      if (p.role?.toLowerCase() === 'student') deptMap[name].students++;
    });
    return Object.keys(deptMap).map(name => ({
      name,
      ...deptMap[name]
    }));
  }, [profiles]);

  const selectedDeptStaff = React.useMemo(() => {
    if (!selectedDept || !profiles) return [];
    return profiles.filter(p => (p.department || '').trim() === selectedDept && p.role?.toLowerCase() === 'faculty');
  }, [selectedDept, profiles]);

  // 2. Fetch Classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['inst-classes-org', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      
      // Fetch classes with direct filter (required for RLS to work correctly)
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, sections, institution_id')
        .eq('institution_id', targetId);
      
      if (!classData || classData.length === 0) return [];

      // Fetch student counts for these classes
      const classIds = classData.map(c => c.id);
      const { data: studentData } = await supabase
        .from('students')
        .select('class_id')
        .in('class_id', classIds) as { data: { class_id: string }[] | null };

      return classData.map(c => ({
        ...c,
        studentCount: studentData?.filter(s => s.class_id === c.id).length || 0
      }));
    },
    enabled: !!targetId
  });

  if (selectedDept) {
    return (
      <View style={styles.container}>
        <PageHeader title={`${selectedDept} Department`} subtitle="Faculty Overview" />
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedDept(null)}>
            <ChevronRight size={18} color={theme.colors.primary} style={{ transform: [{ rotate: '180deg' }] }} {...({} as any)} />
            <Text style={styles.backBtnText}>Institution Overview</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            {selectedDeptStaff.length === 0 ? (
              <Text style={styles.emptyText}>No faculty members found in this department.</Text>
            ) : (
              selectedDeptStaff.map((staff: any, i: number) => (
                <View key={i} style={styles.itemCard}>
                   <View style={styles.itemIcon}>
                     <Users size={18} color={theme.colors.primary} {...({} as any)} />
                   </View>
                   <View style={styles.itemContent}>
                     <Text style={styles.itemName}>{staff.full_name}</Text>
                     <Text style={styles.itemMeta}>{staff.designation || 'Faculty Member'}</Text>
                   </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Institution Structure" subtitle="Departments, Classes & Sections Overview" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Departments</Text>
          </View>
          {isLoadingProfiles ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : departments.length === 0 ? (
            <Text style={styles.emptyText}>No departments defined yet.</Text>
          ) : (
            departments.map((dept, i) => (
              <TouchableOpacity key={i} style={styles.itemCard} onPress={() => setSelectedDept(dept.name)}>
                <View style={styles.itemIcon}>
                  <Layers size={18} color={theme.colors.primary} {...({} as any)} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{dept.name}</Text>
                  <Text style={styles.itemMeta}>{dept.faculty} Faculty • {dept.students} Students</Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Classes & Sections</Text>
          </View>
          {isLoadingClasses ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : classes.length === 0 ? (
            <Text style={styles.emptyText}>No classes scheduled yet.</Text>
          ) : (
            <View style={styles.grid}>
              {classes.map((cls, i) => (
                <View key={i} style={styles.gridItem}>
                  <Text style={styles.gridText}>{cls.name}</Text>
                  {cls.sections && (
                    <Text style={{ fontSize: 9, color: theme.colors.textMuted, marginTop: 4 }}>
                      Sections: {Array.isArray(cls.sections) ? cls.sections.join(', ') : cls.sections}
                    </Text>
                  )}
                  <View style={styles.miniBadge}>
                    <Users size={8} color="white" {...({} as any)} />
                    <Text style={styles.miniBadgeText}>{cls.studentCount}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  itemCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  itemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemContent: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  itemMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '30%', backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', position: 'relative' },
  gridText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  miniBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  miniBadgeText: { fontSize: 8, color: 'white', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 14, padding: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 }
});
