// ============================================================
// File: app/(root)/admin/institutions/index.tsx
// Purpose: SuperAdmin Institutions Management with Unified Dropdown Filters,
//          DataTable View with Row Action Dropdowns, and Card View Toggle.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAdminInstitutions } from '../../../../src/hooks/useAdminInstitutions';
import { InstitutionCard } from '../../../../src/components/cards/InstitutionCard';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { ActionDropdown, ActionDropdownItem } from '../../../../src/components/common/ActionDropdown';
import { Select } from '../../../../src/components/common/Select';
import { Badge } from '../../../../src/components/common/Badge';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { StakeholderManagementModal } from '../../../../src/components/stakeholder/StakeholderManagementModal';
import { LocationMapPreview } from '../../../../src/components/common/LocationMapPreview';
import {
  Search,
  Plus,
  Filter,
  GraduationCap,
  School,
  BookOpen,
  Users,
  MapPin,
  ChevronRight,
  Edit2,
  ShieldCheck,
  ArrowUpDown,
  Table as TableIcon,
  LayoutGrid,
  Clock,
  Trash2,
  Power,
  Layers,
  X,
  ExternalLink,
  Upload,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { BulkInstitutionUploadModal } from '../../../../src/components/institution/BulkInstitutionUploadModal';
import {
  getOnboardingDraft,
  clearOnboardingDraft,
  listOnboardingDrafts,
  clearActiveDraftSession,
  deleteOnboardingDraft,
  OnboardingDraft,
} from '../../../../src/services/onboardingDraftService';

export default function InstitutionsList() {
  const router = useRouter();
  const { institutions, isLoading, toggleStatus, deleteInstitution } = useAdminInstitutions();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('active');
  const [sortBy, setSortBy] = useState<string>('name_asc');

  // Modal States
  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isStakeholderModalVisible, setIsStakeholderModalVisible] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [detailData, setDetailData] = useState<{
    classes: any[];
    departments: string[];
    subjects: any[];
    timetable?: any;
  }>({
    classes: [],
    departments: [],
    subjects: [],
  });
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Draft Persistence State
  const [existingDraft, setExistingDraft] = useState<OnboardingDraft | null>(null);
  const [isDraftModalVisible, setIsDraftModalVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      listOnboardingDrafts().then(drafts => {
        setExistingDraft(drafts[0] || null);
      });
    }, [])
  );

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[];
  }>({ visible: false, title: '', message: '' });

  // Filter & Sort Logic
  const filteredInstitutions = institutions
    .filter((inst) => {
      const q = (searchTerm || '').toLowerCase();
      const name = (inst.name || '').toLowerCase();
      const instId = (inst.institution_id || '').toLowerCase();
      const city = (inst.city || '').toLowerCase();
      const state = (inst.state || '').toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        instId.includes(q) ||
        city.includes(q) ||
        state.includes(q);

      const matchesStatus =
        activeStatus === 'all' ? true : inst.status === activeStatus;

      const matchesCategory =
        categoryFilter === 'all'
          ? true
          : (inst.institution_category || inst.type || 'school') === categoryFilter;

      const matchesOwnership =
        ownershipFilter === 'all'
          ? true
          : (inst.ownership_type || 'private') === ownershipFilter;

      const stagesArr = (inst.academic_stages as string[]) || [];
      const matchesStage =
        stageFilter === 'all'
          ? true
          : stageFilter === 'has_kg'
          ? !!inst.has_kg || stagesArr.includes('pre_primary')
          : stageFilter === 'primary'
          ? stagesArr.includes('primary')
          : stageFilter === 'secondary'
          ? stagesArr.includes('secondary') || stagesArr.includes('middle')
          : stageFilter === 'college'
          ? (inst.institution_category === 'college' || inst.type === 'college')
          : true;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesOwnership &&
        matchesStage
      );
    })
    .sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      if (sortBy === 'name_asc') return aName.localeCompare(bName);
      if (sortBy === 'name_desc') return bName.localeCompare(aName);
      if (sortBy === 'students_desc') return (b.studentsCount || 0) - (a.studentsCount || 0);
      if (sortBy === 'staff_desc') return (b.staffCount || 0) - (a.staffCount || 0);
      if (sortBy === 'recent')
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return 0;
    });

  const handleShowDetail = async (inst: any) => {
    setSelectedInst(inst);
    setIsDetailVisible(true);
    setLoadingDetail(true);

    try {
      const [groupsRes, profilesRes, subjectsRes, ttRes] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, classes(id, name, sections)')
          .eq('institution_id', inst.institution_id),
        supabase
          .from('profiles')
          .select('department')
          .eq('institution_id', inst.institution_id)
          .not('department', 'is', null),
        supabase.from('subjects').select('*').eq('institution_id', inst.institution_id),
        (supabase.from('timetable_configs') as any)
          .select('*')
          .eq('institution_id', inst.institution_id)
          .maybeSingle(),
      ]);

      const allClasses =
        (groupsRes.data as any[])?.flatMap((g) => g.classes || []) || [];
      const uniqueDepts = Array.from(
        new Set((profilesRes.data as any[])?.map((p) => p.department))
      ).filter(Boolean) as string[];

      setDetailData({
        classes: allClasses,
        departments: uniqueDepts,
        subjects: subjectsRes.data || [],
        timetable: ttRes.data || null,
      });
    } catch (e) {
      console.error('Error fetching detail:', e);
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
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: status === 'active' ? 'destructive' : 'primary',
          onPress: () => toggleStatus(id, status),
        },
      ],
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
        { text: 'Delete', style: 'destructive', onPress: () => deleteInstitution(id) },
      ],
    });
  };

  // Header Dropdown Actions
  const headerActionItems: ActionDropdownItem[] = [
    {
      id: 'onboard_school',
      label: '+ Onboard New School (From Template)',
      subLabel: 'K-12, Primary, High & Higher Secondary with default CBSE/State curriculum',
      icon: <School size={16} color={theme.colors.primary} {...({} as any)} />,
      variant: 'primary',
      onPress: () => router.push('/admin/onboarding?category=school&reset=true'),
    },
    {
      id: 'onboard_college',
      label: '+ Onboard New College (From Template)',
      subLabel: 'Engineering, Arts & Science, Management, or Polytechnic Diploma degrees',
      icon: <GraduationCap size={16} color="#7C3AED" {...({} as any)} />,
      variant: 'primary',
      onPress: () => router.push('/admin/onboarding?category=college&reset=true'),
    },
    {
      id: 'bulk_upload_institutions',
      label: 'Upload School / College Data (CSV Template)',
      subLabel: 'Bulk import institutions into Master Catalog for real-time onboarding dropdowns',
      icon: <Upload size={16} color="#059669" {...({} as any)} />,
      variant: 'success',
      onPress: () => setIsBulkUploadOpen(true),
    },
  ];

  // DataTable Column Definitions
  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      title: 'Institution',
      sortable: true,
      width: '26%',
      render: (item) => (
        <View style={styles.cellInstitution}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={styles.tableLogo} />
          ) : (
            <View style={styles.tableLogoPlaceholder}>
              {(item.institution_category === 'college' || item.type === 'college') ? (
                <GraduationCap size={16} color={theme.colors.primary} {...({} as any)} />
              ) : (
                <School size={16} color={theme.colors.primary} {...({} as any)} />
              )}
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.cellInstitutionName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cellInstitutionCode}>{item.institution_id}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'type',
      title: 'Category & Type',
      width: '18%',
      render: (item) => {
        const isCollege = item.institution_category === 'college' || item.type === 'college';
        const isPublic = item.ownership_type === 'public';
        return (
          <View style={styles.cellBadgeCol}>
            <View
              style={[
                styles.categoryBadge,
                isCollege ? styles.categoryBadgeCollege : styles.categoryBadgeSchool,
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  isCollege ? styles.categoryBadgeTextCollege : styles.categoryBadgeTextSchool,
                ]}
              >
                {isPublic ? 'Public' : 'Private'} {isCollege ? 'College' : 'School'}
              </Text>
            </View>
            {item.board_or_university ? (
              <Text style={styles.boardText} numberOfLines={1}>
                {item.board_or_university}
              </Text>
            ) : null}
          </View>
        );
      },
    },
    {
      key: 'city',
      title: 'Location',
      sortable: true,
      width: '14%',
      render: (item) => (
        <View>
          <Text style={styles.cellLocationText}>{item.city || '—'}</Text>
          <Text style={styles.cellLocationSubText}>{item.state || ''}</Text>
        </View>
      ),
    },
    {
      key: 'academics',
      title: 'Academics',
      width: '14%',
      render: (item) => (
        <View>
          <Text style={styles.cellAcademicsText}>
            {item.classesCount || 0} Classes • {item.sectionsCount || 0} Sec
          </Text>
          <Text style={styles.cellLocationSubText}>
            {item.subjectsCount ? `${item.subjectsCount} Subjects` : 'Active Blueprint'}
          </Text>
        </View>
      ),
    },
    {
      key: 'studentsCount',
      title: 'Users',
      sortable: true,
      width: '12%',
      render: (item) => (
        <View>
          <Text style={styles.cellUsersText}>{item.studentsCount || 0} Students</Text>
          <Text style={styles.cellLocationSubText}>{item.staffCount || 0} Staff</Text>
        </View>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '8%',
      render: (item) => (
        <Badge
          variant={
            item.status === 'active'
              ? 'success'
              : item.status === 'inactive'
              ? 'warning'
              : 'destructive'
          }
        >
          {item.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      width: '8%',
      align: 'right',
      render: (item) => {
        const rowActions: ActionDropdownItem[] = [
          {
            id: 'view_blueprint',
            label: 'View Full Blueprint & Timetable',
            subLabel: 'Inspect classes, departments, subjects and schedule',
            icon: <School size={15} color={theme.colors.primary} {...({} as any)} />,
            onPress: () => handleShowDetail(item),
          },
          {
            id: 'edit_templates',
            label: 'Edit Institution & Templates',
            subLabel: 'Modify structure, subjects, or campus details',
            icon: <Edit2 size={15} color="#2563EB" {...({} as any)} />,
            variant: 'primary',
            onPress: () => router.push(`/admin/onboarding?mode=edit&id=${item.institution_id}`),
          },
          {
            id: 'edit_timetable',
            label: 'Modify Timetable Template',
            subLabel: 'Adjust bell schedule, periods per day, and slots',
            icon: <Clock size={15} color="#7C3AED" {...({} as any)} />,
            onPress: () =>
              router.push(`/admin/onboarding?mode=edit&step=5&id=${item.institution_id}`),
          },
          {
            id: 'manage_stakeholders',
            label: 'Assign / Manage Stakeholders',
            subLabel: 'View-only board members and trustee accounts',
            icon: <ShieldCheck size={15} color="#D97706" {...({} as any)} />,
            variant: 'warning',
            onPress: () => {
              setSelectedInst(item);
              setIsStakeholderModalVisible(true);
            },
          },
          {
            id: 'reset_security',
            label: 'Reset Admin Credentials',
            subLabel: 'Change administrative email and access password',
            icon: <ShieldCheck size={15} color="#475569" {...({} as any)} />,
            onPress: () =>
              router.push(`/admin/onboarding?mode=security&id=${item.institution_id}`),
          },
          {
            id: 'toggle_status',
            label: item.status === 'active' ? 'Deactivate Institution' : 'Activate Institution',
            subLabel: item.status === 'active' ? 'Temporarily lock campus access' : 'Enable campus portal',
            icon: <Power size={15} color={item.status === 'active' ? '#DC2626' : '#16A34A'} {...({} as any)} />,
            variant: item.status === 'active' ? 'warning' : 'success',
            onPress: () => handleToggle(item.id, item.status, item.name),
          },
          {
            id: 'delete_inst',
            label: 'Delete Institution',
            subLabel: 'Permanently remove institution record',
            icon: <Trash2 size={15} color="#DC2626" {...({} as any)} />,
            variant: 'destructive',
            onPress: () => handleDelete(item.id, item.name),
          },
        ];

        return <ActionDropdown items={rowActions} size="sm" />;
      },
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PageHeader
          title="Institutions"
          subtitle="Directory and blueprint controls for all registered schools & colleges"
          actions={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                style={styles.uploadCatalogHeaderBtn}
                onPress={() => setIsBulkUploadOpen(true)}
              >
                <Upload size={15} color="#047857" {...({} as any)} />
                <Text style={styles.uploadCatalogHeaderBtnText}>Upload CSV Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.onboardDirectBtn}
                onPress={() => {
                  if (existingDraft) {
                    setIsDraftModalVisible(true);
                  } else {
                    router.push('/admin/onboarding?reset=true');
                  }
                }}
              >
                <Text style={styles.onboardDirectBtnText}>Onboard Institution</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* In-Progress Onboarding Draft Banner */}
        {existingDraft && (
          <View style={styles.draftBannerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={styles.draftBannerIconBadge}>
                <Clock size={18} color="#D97706" {...({} as any)} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.draftBannerTitle}>Onboarding Draft in Progress</Text>
                  <View style={styles.draftBadge}>
                    <Text style={styles.draftBadgeText}>Step {existingDraft.step} of 6</Text>
                  </View>
                </View>
                <Text style={styles.draftBannerDesc}>
                  Resume configuring <Text style={{ fontWeight: '700', color: '#0F172A' }}>{existingDraft.institutionName}</Text>
                  {existingDraft.institutionCode ? ` (${existingDraft.institutionCode})` : ''} • Ready to continue
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.draftDiscardBtn}
                onPress={async () => {
                  if (existingDraft?.id) {
                    await deleteOnboardingDraft(existingDraft.id);
                  } else {
                    await clearOnboardingDraft();
                  }
                  const remaining = await listOnboardingDrafts();
                  setExistingDraft(remaining[0] || null);
                }}
              >
                <Text style={styles.draftDiscardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.draftResumeBtn}
                onPress={() => router.push('/admin/onboarding?resumeDraft=true')}
              >
                <Text style={styles.draftResumeBtnText}>Continue Draft →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* UNIFIED DROPDOWN FILTER BAR */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <Search size={16} color="#94A3B8" {...({} as any)} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, code, or city..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <X size={15} color="#94A3B8" {...({} as any)} />
                </TouchableOpacity>
              )}
            </View>

            {/* View Mode Toggle Button */}
            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'table' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode('table')}
              >
                <TableIcon
                  size={15}
                  color={viewMode === 'table' ? theme.colors.primary : '#64748B'}
                  {...({} as any)}
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    viewMode === 'table' && styles.viewToggleTextActive,
                  ]}
                >
                  Table
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'cards' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode('cards')}
              >
                <LayoutGrid
                  size={15}
                  color={viewMode === 'cards' ? theme.colors.primary : '#64748B'}
                  {...({} as any)}
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    viewMode === 'cards' && styles.viewToggleTextActive,
                  ]}
                >
                  Cards
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cascading Filter Dropdowns Row */}
          <View style={styles.dropdownsGrid}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Select
                placeholder="Category"
                value={categoryFilter}
                options={[
                  { label: 'All Categories', value: 'all' },
                  { label: 'Schools Only', value: 'school' },
                  { label: 'Colleges Only', value: 'college' },
                ]}
                onSelect={(val) => setCategoryFilter(val)}
                searchable={false}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <View style={{ flex: 1, minWidth: 140 }}>
              <Select
                placeholder="Ownership"
                value={ownershipFilter}
                options={[
                  { label: 'All Ownership', value: 'all' },
                  { label: 'Private Institutions', value: 'private' },
                  { label: 'Public / Government', value: 'public' },
                ]}
                onSelect={(val) => setOwnershipFilter(val)}
                searchable={false}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <View style={{ flex: 1, minWidth: 140 }}>
              <Select
                placeholder="Academic Stage"
                value={stageFilter}
                options={[
                  { label: 'All Stages & Streams', value: 'all' },
                  { label: 'KG / Pre-Primary', value: 'has_kg' },
                  { label: 'Primary (1st to 5th)', value: 'primary' },
                  { label: 'High & Higher Secondary', value: 'secondary' },
                  { label: 'UG / PG College Degrees', value: 'college' },
                ]}
                onSelect={(val) => setStageFilter(val)}
                searchable={false}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <View style={{ flex: 1, minWidth: 130 }}>
              <Select
                placeholder="Status"
                value={activeStatus}
                options={[
                  { label: 'Active Institutions', value: 'active' },
                  { label: 'Inactive / Suspended', value: 'inactive' },
                  { label: 'Deleted / Archived', value: 'deleted' },
                  { label: 'All Statuses', value: 'all' },
                ]}
                onSelect={(val) => setActiveStatus(val)}
                searchable={false}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <View style={{ flex: 1, minWidth: 130 }}>
              <Select
                placeholder="Sort By"
                value={sortBy}
                options={[
                  { label: 'Name (A-Z)', value: 'name_asc' },
                  { label: 'Name (Z-A)', value: 'name_desc' },
                  { label: 'Most Students', value: 'students_desc' },
                  { label: 'Most Staff', value: 'staff_desc' },
                  { label: 'Recently Added', value: 'recent' },
                ]}
                onSelect={(val) => setSortBy(val)}
                searchable={false}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </View>
        </View>

        {/* RESULTS: TABLE VIEW OR CARD VIEW */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading institutions...</Text>
          </View>
        ) : viewMode === 'table' ? (
          <DataTable
            columns={columns}
            data={filteredInstitutions}
            keyExtractor={(item) => item.id}
            searchable={false} // handled by our unified filter bar
            pageSize={10}
            emptyTitle="No institutions found"
            emptyDescription="Try adjusting category, ownership, or status filters."
          />
        ) : (
          <View style={styles.cardsGrid}>
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
                  type={inst.institution_category || inst.type}
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
                <Text style={styles.emptyText}>No institutions match the chosen filter.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* DETAILED BLUEPRINT MODAL */}
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
                <X size={22} color={theme.colors.text} {...({} as any)} />
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

                  {/* Academic Structure Metrics */}
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <School size={18} color={theme.colors.primary} {...({} as any)} />
                      <Text style={styles.sectionTitle}>Academic Structure & Standards</Text>
                    </View>
                    <View style={styles.gridContainer}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Classes / Years</Text>
                        <Text style={styles.gridValue}>{detailData.classes.length}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Subjects Mapped</Text>
                        <Text style={styles.gridValue}>{detailData.subjects.length}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Departments</Text>
                        <Text style={styles.gridValue}>{detailData.departments.length}</Text>
                      </View>
                    </View>

                    <View style={styles.tagList}>
                      {detailData.classes.slice(0, 10).map((c, i) => (
                        <View key={i} style={styles.tag}>
                          <Text style={styles.tagText}>{c.name}</Text>
                        </View>
                      ))}
                      {detailData.classes.length > 10 && (
                        <Text style={styles.moreText}>
                          +{detailData.classes.length - 10} more
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Timetable Configuration Overview */}
                  {detailData.timetable && (
                    <View style={styles.detailSection}>
                      <View style={styles.sectionHeader}>
                        <Clock size={18} color="#7C3AED" {...({} as any)} />
                        <Text style={styles.sectionTitle}>Timetable Bell Schedule</Text>
                      </View>
                      <Text style={styles.ttSummaryText}>
                        • {detailData.timetable.periods_per_day || 8} Periods / Day ({detailData.timetable.period_duration_minutes || 45} mins)
                      </Text>
                      <Text style={styles.ttSummaryText}>
                        • Starts at {String(detailData.timetable.start_time || '08:30:00').slice(0, 5)}
                      </Text>
                      <Text style={styles.ttSummaryText}>
                        • Working Days: {Array.isArray(detailData.timetable.days_of_week) ? detailData.timetable.days_of_week.join(', ') : 'Mon - Sat'}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.stakeholderBtn}
                onPress={() => setIsStakeholderModalVisible(true)}
              >
                <ShieldCheck size={16} color="#D97706" {...({} as any)} />
                <Text style={styles.stakeholderBtnText}>Stakeholders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editFullBtn}
                onPress={() => {
                  setIsDetailVisible(false);
                  router.push(`/admin/onboarding?mode=edit&id=${selectedInst.institution_id}`);
                }}
              >
                <Edit2 size={16} color="white" {...({} as any)} />
                <Text style={styles.editFullBtnText}>Edit Details & Templates</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stakeholders Modal */}
      {selectedInst && (
        <StakeholderManagementModal
          visible={isStakeholderModalVisible}
          onClose={() => setIsStakeholderModalVisible(false)}
          institutionId={selectedInst.institution_id}
          institutionName={selectedInst.name}
        />
      )}

      {/* Bulk Institution Upload Modal */}
      <BulkInstitutionUploadModal
        visible={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={(count) => {
          setAlertConfig({
            visible: true,
            title: 'Catalog Updated',
            message: `Successfully uploaded ${count} institutions to the Master Catalog. They are now live in the onboarding wizard dropdown.`,
            type: 'success',
            buttons: [
              {
                text: 'Onboard Now',
                style: 'primary',
                onPress: () => router.push('/admin/onboarding'),
              },
              {
                text: 'Close',
                style: 'secondary',
                onPress: () => setAlertConfig({ visible: false, title: '', message: '' }),
              },
            ],
          });
        }}
      />

      {/* Alert Confirmation Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ visible: false, title: '', message: '' })}
      />

      {/* Draft Resume Selection Modal */}
      <Modal
        visible={isDraftModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDraftModalVisible(false)}
      >
        <View style={styles.draftModalOverlay}>
          <View style={styles.draftModalCard}>
            <View style={styles.draftModalHeader}>
              <View style={styles.draftIconBadge}>
                <Clock size={20} color="#D97706" {...({} as any)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.draftModalTitle}>Institution Draft Available</Text>
                <Text style={styles.draftModalSubtitle}>
                  You have an unfinished onboarding session in progress.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDraftModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#64748B" {...({} as any)} />
              </TouchableOpacity>
            </View>

            {/* Highlight Box with Institution Name */}
            <View style={styles.draftHighlightBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={styles.draftTag}>
                  <Text style={styles.draftTagText}>IN-PROGRESS DRAFT</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                  Step {existingDraft?.step || 1} of 6
                </Text>
              </View>
              <Text style={styles.draftInstitutionName}>
                {existingDraft?.institutionName || 'Untitled Institution'}
              </Text>
              <Text style={styles.draftInstitutionMeta}>
                {existingDraft?.institutionCategory === 'college' ? 'College' : 'School'}
                {existingDraft?.institutionCode ? ` • Code: ${existingDraft.institutionCode}` : ''}
                {existingDraft?.basicInfo?.city ? ` • ${existingDraft.basicInfo.city}` : ''}
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 18 }}>
              Would you like to continue configuring this draft where you left off, or start a new institution from scratch?
            </Text>

            <View style={styles.draftModalButtonsRow}>
              <TouchableOpacity
                style={styles.draftStartNewBtn}
                onPress={async () => {
                  setIsDraftModalVisible(false);
                  await clearActiveDraftSession();
                  router.push('/admin/onboarding?reset=true');
                }}
              >
                <Plus size={16} color="#475569" {...({} as any)} />
                <Text style={styles.draftStartNewBtnText}>Start New Institution</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.draftContinueBtn}
                onPress={() => {
                  setIsDraftModalVisible(false);
                  router.push('/admin/onboarding?resumeDraft=true');
                }}
              >
                <Text style={styles.draftContinueBtnText}>Continue with Draft</Text>
                <ChevronRight size={16} color="white" {...({} as any)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  uploadCatalogHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadCatalogHeaderBtnText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 13,
  },
  onboardDirectBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardDirectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  headerActionBtn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  dropdownsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  cardsGrid: {
    gap: 12,
  },
  cellInstitution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInstitutionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cellInstitutionCode: {
    fontSize: 11,
    color: '#64748B',
  },
  cellBadgeCol: {
    alignItems: 'flex-start',
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  categoryBadgeSchool: {
    backgroundColor: '#FEF3C7',
  },
  categoryBadgeCollege: {
    backgroundColor: '#EDE9FE',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadgeTextSchool: {
    color: '#B45309',
  },
  categoryBadgeTextCollege: {
    color: '#6D28D9',
  },
  boardText: {
    fontSize: 10,
    color: '#64748B',
  },
  cellLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  cellLocationSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cellAcademicsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  cellUsersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 11,
    color: '#64748B',
    alignSelf: 'center',
  },
  ttSummaryText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  stakeholderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stakeholderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  editFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editFullBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  draftBannerContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  draftBannerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  draftBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  draftBannerDesc: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  draftDiscardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  draftDiscardBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  draftResumeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  draftResumeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  draftModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  draftModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxWidth: 520,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  draftModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  draftIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  draftModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  draftHighlightBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  draftTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  draftTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  draftInstitutionName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#92400E',
    marginTop: 6,
    marginBottom: 4,
  },
  draftInstitutionMeta: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },
  draftModalButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  draftStartNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  draftStartNewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  draftContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  draftContinueBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
