import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Layers, 
  Users,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Trash2,
  X,
  School,
  GraduationCap
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { FormField } from '../../../../src/components/common/FormField';
import { Button } from '../../../../src/components/common/Button';
import { useRBAC } from '../../../../src/hooks/useRBAC';

export default function InstitutionOrg() {
  const { institutionId, institutionUuid, role } = useAuth();
  const { can } = useRBAC();
  const queryClient = useQueryClient();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);

  const canEdit = can('classes', 'edit') || can('faculty', 'edit');

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

  // 2. Fetch Departments from departments table
  const { data: dbDepartments = [], isLoading: isLoadingDepts } = useQuery({
    queryKey: ['inst-db-departments', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data } = await (supabase.from('departments') as any)
        .select('*')
        .eq('institution_id', targetId);
      return (data || []) as any[];
    },
    enabled: !!targetId
  });

  const departments = useMemo(() => {
    const deptMap: Record<string, { id?: string; faculty: number; students: number; code?: string }> = {};

    // First populate from database table
    dbDepartments.forEach((d: any) => {
      const name = (d.name || '').trim();
      if (!name) return;
      deptMap[name] = { id: d.id, faculty: 0, students: 0, code: d.code };
    });

    // Augment with profile counts
    profiles.forEach(p => {
      const name = (p.department || '').trim();
      if (!name) return;
      if (!deptMap[name]) deptMap[name] = { faculty: 0, students: 0 };
      if (p.role?.toLowerCase() === 'faculty') deptMap[name].faculty++;
      if (p.role?.toLowerCase() === 'student') deptMap[name].students++;
    });

    return Object.keys(deptMap)
      .map(name => ({
        name,
        ...deptMap[name]
      }))
      .filter(d => {
        if (!searchQuery) return true;
        return d.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [profiles, dbDepartments, searchQuery]);

  const selectedDeptStaff = useMemo(() => {
    if (!selectedDept || !profiles) return [];
    return profiles.filter(p => (p.department || '').trim() === selectedDept && p.role?.toLowerCase() === 'faculty');
  }, [selectedDept, profiles]);

  // 3. Fetch Classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['inst-classes-org', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, sections, institution_id, stage, class_order')
        .eq('institution_id', targetId);
      
      if (!classData || classData.length === 0) return [];

      const rawClasses = classData as any[];
      const classIds = rawClasses.map(c => c.id).filter(Boolean);

      let studentData: { class_id: string }[] = [];
      if (classIds.length > 0) {
        const { data: sData } = await supabase
          .from('students')
          .select('class_id')
          .in('class_id', classIds) as { data: { class_id: string }[] | null };
        studentData = sData || [];
      }

      return rawClasses.map(c => ({
        ...c,
        studentCount: studentData.filter(s => s.class_id === c.id).length || 0
      }));
    },
    enabled: !!targetId
  });

  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchesSearch = !searchQuery || cls.name.toLowerCase().includes(searchQuery.toLowerCase());
      const stage = (cls.stage || '').toLowerCase();
      const name = (cls.name || '').toLowerCase();

      const matchesStage = 
        selectedStage === 'all' ? true :
        selectedStage === 'pre_primary' ? (stage === 'pre_primary' || name.includes('kg') || name.includes('nursery')) :
        selectedStage === 'primary' ? (stage === 'primary' || ['1st', '2nd', '3rd', '4th', '5th', 'class 1', 'class 2', 'class 3', 'class 4', 'class 5'].some(s => name.includes(s))) :
        selectedStage === 'middle' ? (stage === 'middle' || ['6th', '7th', '8th', 'class 6', 'class 7', 'class 8'].some(s => name.includes(s))) :
        selectedStage === 'secondary' ? (stage === 'secondary' || ['9th', '10th', 'class 9', 'class 10'].some(s => name.includes(s))) : true;

      return matchesSearch && matchesStage;
    });
  }, [classes, searchQuery, selectedStage]);

  // Handle Add Department
  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      Alert.alert('Required', 'Department name is required.');
      return;
    }
    if (!targetId) return;

    try {
      setIsSavingDept(true);
      const { error } = await (supabase.from('departments') as any).upsert([
        {
          institution_id: targetId,
          name: newDeptName.trim(),
          code: newDeptCode.trim() || newDeptName.trim().slice(0, 4).toUpperCase(),
        }
      ], { onConflict: 'institution_id,name' });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['inst-db-departments', targetId] });
      setIsAddDeptModalOpen(false);
      setNewDeptName('');
      setNewDeptCode('');
      Alert.alert('Success', `Department "${newDeptName.trim()}" created successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create department.');
    } finally {
      setIsSavingDept(false);
    }
  };

  // Handle Delete Department with Deletion Guard
  const handleDeleteDepartment = async (deptName: string, deptId?: string) => {
    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${deptName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (deptId) {
                const { error } = await (supabase.from('departments') as any).delete().eq('id', deptId);
                if (error) throw error;
              } else {
                const { error } = await (supabase.from('departments') as any)
                  .delete()
                  .eq('institution_id', targetId)
                  .eq('name', deptName);
                if (error) throw error;
              }
              queryClient.invalidateQueries({ queryKey: ['inst-db-departments', targetId] });
              queryClient.invalidateQueries({ queryKey: ['inst-profiles', targetId] });
              Alert.alert('Deleted', `Department "${deptName}" has been removed.`);
            } catch (err: any) {
              Alert.alert('Deletion Guard', err.message || 'Cannot delete department with assigned faculty members.');
            }
          }
        }
      ]
    );
  };

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
      <PageHeader title="Institution Structure" subtitle="Departments, Standards & Sections Overview" />
      
      {/* Search and Filter Controls */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.colors.textMuted} {...({} as any)} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter classes, sections, or departments..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stage Filter Chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}>
          {[
            { id: 'all', label: 'All Standards' },
            { id: 'pre_primary', label: 'KG / Pre-Primary' },
            { id: 'primary', label: 'Primary (1st-5th)' },
            { id: 'middle', label: 'Middle (6th-8th)' },
            { id: 'secondary', label: 'High School (9th-10th)' },
          ].map(stage => (
            <TouchableOpacity
              key={stage.id}
              style={[
                styles.filterChip,
                selectedStage === stage.id && styles.activeFilterChip
              ]}
              onPress={() => setSelectedStage(stage.id)}
            >
              <Text style={[
                styles.filterChipText,
                selectedStage === stage.id && styles.activeFilterChipText
              ]}>
                {stage.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Departments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Layers size={20} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.sectionTitle}>Academic Departments ({departments.length})</Text>
            </View>
            {canEdit && (
              <TouchableOpacity 
                style={styles.addSmallBtn}
                onPress={() => setIsAddDeptModalOpen(true)}
              >
                <Plus size={14} color="white" {...({} as any)} />
                <Text style={styles.addSmallBtnText}>Add Dept</Text>
              </TouchableOpacity>
            )}
          </View>
          {isLoadingProfiles || isLoadingDepts ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : departments.length === 0 ? (
            <Text style={styles.emptyText}>No matching departments found.</Text>
          ) : (
            departments.map((dept, i) => (
              <View key={i} style={styles.itemCard}>
                <TouchableOpacity 
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setSelectedDept(dept.name)}
                >
                  <View style={styles.itemIcon}>
                    <Layers size={18} color={theme.colors.primary} {...({} as any)} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemName}>{dept.name}</Text>
                    <Text style={styles.itemMeta}>
                      {dept.code ? `[${dept.code}] ` : ''}{dept.faculty} Faculty • {dept.students} Students
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
                </TouchableOpacity>
                {canEdit && (
                  <TouchableOpacity 
                    style={{ padding: 8, marginLeft: 8 }}
                    onPress={() => handleDeleteDepartment(dept.name, dept.id)}
                  >
                    <Trash2 size={16} color="#EF4444" {...({} as any)} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Classes & Sections Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <School size={20} color="#0284C7" {...({} as any)} />
              <Text style={styles.sectionTitle}>Standards & Sections ({filteredClasses.length})</Text>
            </View>
          </View>
          {isLoadingClasses ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : filteredClasses.length === 0 ? (
            <Text style={styles.emptyText}>No classes match the selected filter.</Text>
          ) : (
            <View style={styles.grid}>
              {filteredClasses.map((cls, i) => (
                <View key={i} style={styles.gridItem}>
                  <Text style={styles.gridText}>{cls.name}</Text>
                  {cls.stage && (
                    <Text style={styles.stageTag}>{cls.stage.replace('_', ' ').toUpperCase()}</Text>
                  )}
                  {cls.sections && (
                    <View style={styles.sectionsContainer}>
                      <Text style={styles.sectionsLabel}>Sections:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {(Array.isArray(cls.sections) ? cls.sections : [cls.sections]).map((sec: string, sIdx: number) => (
                          <View key={sIdx} style={styles.sectionPill}>
                            <Text style={styles.sectionPillText}>{sec}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
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

      {/* Add Department Modal */}
      <Modal
        visible={isAddDeptModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddDeptModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Department</Text>
              <TouchableOpacity onPress={() => setIsAddDeptModalOpen(false)}>
                <X size={20} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <FormField
              label="Department Name"
              required
              placeholder="e.g. Science & Technology"
              value={newDeptName}
              onChangeText={setNewDeptName}
            />

            <FormField
              label="Department Code (Optional)"
              placeholder="e.g. SCI"
              value={newDeptCode}
              onChangeText={setNewDeptCode}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Button
                title="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setIsAddDeptModalOpen(false)}
              />
              <Button
                title="Create Department"
                variant="primary"
                style={{ flex: 1 }}
                loading={isSavingDept}
                onPress={handleCreateDepartment}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingTop: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  activeFilterChipText: {
    color: 'white',
  },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  itemCard: { backgroundColor: 'white', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  itemContent: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  itemMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '31%', backgroundColor: 'white', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' },
  gridText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  stageTag: { fontSize: 8, fontWeight: '700', color: '#0284C7', backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  sectionsContainer: { marginTop: 6, alignItems: 'center' },
  sectionsLabel: { fontSize: 9, color: theme.colors.textMuted, fontWeight: '600' },
  sectionPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sectionPillText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  miniBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  miniBadgeText: { fontSize: 8, color: 'white', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 13, padding: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 450,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
