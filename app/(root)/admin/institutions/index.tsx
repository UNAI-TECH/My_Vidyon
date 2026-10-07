import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAdminInstitutions } from '../../../../src/hooks/useAdminInstitutions';
import { InstitutionCard } from '../../../../src/components/cards/InstitutionCard';
import { Search, Plus, Filter, X, GraduationCap, School, BookOpen, Users, MapPin, ChevronRight, Edit2, ShieldCheck, ArrowUpDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { Badge } from '../../../../src/components/common/Badge';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { StakeholderManagementModal } from '../../../../src/components/stakeholder/StakeholderManagementModal';
import { LocationMapPreview } from '../../../../src/components/common/LocationMapPreview';
import { Select } from '../../../../src/components/common/Select';

export default function InstitutionsList() {
  const router = useRouter();
  const { institutions, isLoading, toggleStatus, deleteInstitution } = useAdminInstitutions();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab ] = useState<'active' | 'inactive' | 'deleted'>('active');
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [stageFilter, setStageFilter] = useState<'all' | 'has_kg' | 'primary' | 'secondary'>('all');

  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isStakeholderModalVisible, setIsStakeholderModalVisible] = useState(false);
  const [detailData, setDetailData] = useState<{ classes: any[], departments: string[], subjects: any[] }>({
    classes: [],
    departments: [],
    subjects: []
  });
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[];
  }>({ visible: false, title: '', message: '' });

  const filteredInstitutions = institutions
    .filter(inst => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        inst.name.toLowerCase().includes(q) || 
        inst.institution_id.toLowerCase().includes(q) ||
        (inst.city && inst.city.toLowerCase().includes(q)) ||
        (inst.state && inst.state.toLowerCase().includes(q));
      const matchesStatus = inst.status === activeTab;
      const matchesStage = 
        stageFilter === 'all' ? true :
        stageFilter === 'has_kg' ? !!inst.has_kg :
        stageFilter === 'primary' ? ((inst.academic_stages as string[])?.includes('primary') ?? true) :
        stageFilter === 'secondary' ? ((inst.academic_stages as string[])?.includes('secondary') ?? true) : true;
      return matchesSearch && matchesStatus && matchesStage;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'students_desc') return (b.studentsCount || 0) - (a.studentsCount || 0);
      if (sortBy === 'staff_desc') return (b.staffCount || 0) - (a.staffCount || 0);
      if (sortBy === 'recent') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return 0;
    });

  const handleShowDetail = async (inst: any) => {
    setSelectedInst(inst);
    setIsDetailVisible(true);
    setLoadingDetail(true);
    
    try {
      // 1. Fetch Classes & Sections
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name, classes(id, name, sections)')
        .eq('institution_id', inst.institution_id);
      
      const allClasses = (groupsData as any[])?.flatMap(g => g.classes || []) || [];

      // 2. Fetch Departments (Unique from profiles)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('department')
        .eq('institution_id', inst.institution_id)
        .not('department', 'is', null);
      
      const uniqueDepts = Array.from(new Set((profilesData as any[])?.map(p => p.department))).filter(Boolean) as string[];

      // 3. Fetch Subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('institution_id', inst.institution_id);

      setDetailData({
        classes: allClasses,
        departments: uniqueDepts,
        subjects: subjectsData || []
      });
    } catch (e) {
      console.error("Error fetching detail:", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggle = (id: string, status: string, name: string) => {
    const action = status === 'active' ? 'deactivate' : 'activate';
    setAlertConfig({
      visible: true,
      title: status === 'active' ? 'Deactivate Institution' : 'Activate Institution',
      message: `Are you sure you want to ${action} ${name}?`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => {} },
        { text: action.charAt(0).toUpperCase() + action.slice(1), style: status === 'active' ? 'destructive' : 'primary', onPress: () => toggleStatus(id, status) }
      ]
    });
  };

  const handleDelete = (id: string, name: string) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Institution',
      message: `Are you sure you want to permanently delete ${name}? This action cannot be undone.`,
      type: 'error',
      buttons: [
        { text: 'Cancel', style: 'secondary', onPress: () => {} },
        { text: 'Delete', style: 'destructive', onPress: () => deleteInstitution(id) }
      ]
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PageHeader 
          title="Institutions" 
          subtitle="Manage and monitor all registered schools" 
        />

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={theme.colors.textMuted} {...({} as any)} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search by name or code..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/admin/onboarding')}
          >
            <Plus size={20} color="white" {...({} as any)} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
            <ArrowUpDown size={14} color={theme.colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textMuted }}>Sort:</Text>
          </View>
          {[
            { id: 'name_asc', label: 'Name (A-Z)' },
            { id: 'students_desc', label: 'Students' },
            { id: 'staff_desc', label: 'Staff' },
            { id: 'recent', label: 'Recent' },
          ].map(s => (
            <TouchableOpacity
              key={s.id}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: sortBy === s.id ? theme.colors.primary : '#F1F5F9',
              }}
              onPress={() => setSortBy(s.id)}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: sortBy === s.id ? 'white' : theme.colors.text }}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
            <Filter size={14} color={theme.colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textMuted }}>Stage:</Text>
          </View>
          {[
            { id: 'all', label: 'All Stages' },
            { id: 'has_kg', label: 'KG / Pre-Primary' },
            { id: 'primary', label: 'Primary (1-5)' },
            { id: 'secondary', label: 'High School (9-10)' },
          ].map(f => (
            <TouchableOpacity
              key={f.id}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: stageFilter === f.id ? '#0284C7' : '#F1F5F9',
              }}
              onPress={() => setStageFilter(f.id as any)}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: stageFilter === f.id ? 'white' : theme.colors.text }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabs}>
          {(['active', 'inactive', 'deleted'] as const).map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.toUpperCase()} ({institutions.filter(i => i.status === tab).length})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredInstitutions.length > 0 ? (
          filteredInstitutions.map((inst) => (
            <InstitutionCard
              key={inst.id}
              name={inst.name}
              code={inst.institution_id}
              location={`${inst.city || ''}, ${inst.state || ''}`}
              students={inst.studentsCount}
              faculty={inst.staffCount}
              status={inst.status as any}
              type={inst.type}
              logoUrl={inst.logo_url}
              onToggleStatus={() => handleToggle(inst.id, inst.status, inst.name)}
              onDelete={() => handleDelete(inst.id, inst.name)}
              onEdit={() => router.push(`/admin/onboarding?mode=edit&id=${inst.institution_id}`)}
              onSecurity={() => router.push(`/admin/onboarding?mode=security&id=${inst.institution_id}`)}
              onClick={() => handleShowDetail(inst)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No institutions found for this filter.</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={isDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedInst?.name}</Text>
                <Text style={styles.modalSubtitle}>ID: {selectedInst?.institution_id}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDetailVisible(false)}>
                <X size={24} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingDetail ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
              ) : (
                <>
                  <LocationMapPreview
                    addressLine1={selectedInst?.address_line_1 || selectedInst?.address}
                    addressLine2={selectedInst?.address_line_2}
                    city={selectedInst?.city}
                    state={selectedInst?.state}
                    pincode={selectedInst?.pincode}
                    latitude={selectedInst?.latitude}
                    longitude={selectedInst?.longitude}
                    mapLink={selectedInst?.map_link}
                    institutionName={selectedInst?.name}
                  />

                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <School size={20} color={theme.colors.primary} {...({} as any)} />
                      <Text style={styles.sectionTitle}>Academic Structure</Text>
                    </View>
                    <View style={styles.gridContainer}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Classes</Text>
                        <Text style={styles.gridValue}>{detailData.classes.length}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Subjects</Text>
                        <Text style={styles.gridValue}>{detailData.subjects.length}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.tagList}>
                      {detailData.classes.slice(0, 10).map((c, i) => (
                        <View key={i} style={styles.tag}>
                          <Text style={styles.tagText}>{c.name}</Text>
                        </View>
                      ))}
                      {detailData.classes.length > 10 && (
                        <Text style={styles.moreText}>+ {detailData.classes.length - 10} more</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Users size={20} color={theme.colors.secondary} {...({} as any)} />
                      <Text style={styles.sectionTitle}>Departments</Text>
                    </View>
                    <View style={styles.tagList}>
                      {detailData.departments.length > 0 ? (
                        detailData.departments.map((d, i) => (
                          <View key={i} style={[styles.tag, { backgroundColor: '#F0F9FF' }]}>
                            <Text style={[styles.tagText, { color: '#0369A1' }]}>{d}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No departments assigned yet.</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <BookOpen size={20} color={theme.colors.accent} {...({} as any)} />
                      <Text style={styles.sectionTitle}>Subjects Overview</Text>
                    </View>
                    {detailData.subjects.slice(0, 8).map((s, i) => (
                      <View key={i} style={styles.subjectItem}>
                        <Text style={styles.subjectName}>{s.name}</Text>
                        <Text style={styles.subjectClass}>{s.class_name}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.stakeholderBtn}
                onPress={() => setIsStakeholderModalVisible(true)}
              >
                <ShieldCheck size={18} color="#D97706" {...({} as any)} />
                <Text style={styles.stakeholderBtnText}>Manage Stakeholders</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editFullBtn}
                onPress={() => {
                  setIsDetailVisible(false);
                  router.push(`/admin/onboarding?mode=edit&id=${selectedInst.institution_id}`);
                }}
              >
                <Edit2 size={18} color="white" {...({} as any)} />
                <Text style={styles.editFullBtnText}>Edit Institution Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {selectedInst && (
        <StakeholderManagementModal
          visible={isStakeholderModalVisible}
          onClose={() => setIsStakeholderModalVisible(false)}
          institutionId={selectedInst.institution_id}
          institutionName={selectedInst.name}
        />
      )}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tabText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  modalSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  modalBody: { flex: 1, padding: 24 },
  detailSection: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  gridContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridItem: { flex: 1, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, alignItems: 'center' },
  gridLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 },
  gridValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#B45309' },
  moreText: { fontSize: 12, color: theme.colors.textMuted, marginLeft: 4, alignSelf: 'center' },
  subjectItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  subjectName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  subjectClass: { fontSize: 12, color: theme.colors.textMuted },
  modalFooter: { padding: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12 },
  stakeholderBtn: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stakeholderBtnText: { color: '#92400E', fontWeight: '700', fontSize: 15 },
  editFullBtn: { backgroundColor: theme.colors.primary, height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  editFullBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
