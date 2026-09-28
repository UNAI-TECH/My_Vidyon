import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView, Image, RefreshControl } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionUsers } from '../../../../src/hooks/useInstitutionUsers';
import { 
  GraduationCap, Users, UserMinus, UserCheck, Save, Search, X, Camera, Copy, CheckCircle, Building2, ChevronDown, RefreshCw,
  Mail, Hash, ChevronRight, Download, Plus, Filter, Edit2, Check
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Badge } from '../../../../src/components/common/Badge';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { SelectionModal } from '../../../../src/components/common/SelectionModal';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { uploadToSupabaseStorage } from '../../../../src/utils/fileUpload';

type UserCategory = 'students' | 'staff' | 'parents' | 'accountants' | 'canteen' | 'drivers';

export default function UserManagementScreen() {
  const queryClient = useQueryClient();
  const { institutionId } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<UserCategory>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const { students, staff, parents, isLoading, toggleUserStatus, deleteUser, updateUser } = useInstitutionUsers(institutionId);

  useEffect(() => {
    console.log('[User Data Stats]', {
      tab: activeTab,
      students: students.length,
      staff: staff.length,
      parents: parents.length
    });
  }, [activeTab, students, staff, parents]);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Helper to determine status consistently
  const checkIsActive = (user: any) => {
    if (!user) return true;
    // Explicitly check for false. null/undefined/true are considered active by default
    return user.is_active !== false;
  };

  // Sync selectedUser if the background data changes (after a refetch)
  useEffect(() => {
    if (selectedUser && isModalVisible) {
      const allUsers = [...(students || []), ...(staff || []), ...(parents || [])];
      const updated = allUsers.find((u: any) => u.id === selectedUser.id);
      if (updated && (updated as any).is_active !== (selectedUser as any).is_active) {
        console.log('[Sync] Updating selectedUser from background data:', (updated as any).is_active);
        setSelectedUser(updated);
      }
    }
  }, [students, staff, parents, isModalVisible, selectedUser]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  // Filter state
  const [filterClass, setFilterClass] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState<string | null>(null);

  // Parent search state (for student edit)
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[];
  }>({ visible: false, title: '', message: '' });

  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  // Search existing parents by email
  const { data: parentResults = [] } = useQuery({
    queryKey: ['edit-parent-search', institutionId, parentSearchQuery],
    queryFn: async (): Promise<any[]> => {
      if (!institutionId || parentSearchQuery.length < 2) return [];
      const { data } = await (supabase
        .from('profiles') as any)
        .select('id, full_name, email, phone')
        .eq('institution_id', institutionId)
        .eq('role', 'parent')
        .ilike('email', `%${parentSearchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: !!institutionId && parentSearchQuery.length >= 2,
    staleTime: 5000
  });

  const handleSelectParent = useCallback((parent: any) => {
    setSelectedParent(parent);
    setEditForm((prev: any) => ({
      ...prev,
      parent_name: parent.full_name || '',
      parent_email: parent.email || '',
      parent_phone: parent.phone || '',
      parent_id: parent.id,
    }));
    setParentSearchQuery(parent.email || '');
    setShowParentDropdown(false);
  }, []);

  const handleClearParent = useCallback(() => {
    setSelectedParent(null);
    setParentSearchQuery('');
    setEditForm((prev: any) => ({
      ...prev, parent_name: '', parent_email: '', parent_phone: '', parent_id: undefined
    }));
  }, []);

  // Fetch real data for dropdowns
  React.useEffect(() => {
    if (!institutionId) return;

    const fetchData = async () => {
      // Fetch Classes & Sections
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, classes(id, name, sections)')
        .eq('institution_id', institutionId);
      
      if (groupsData) {
        const classes = groupsData.flatMap((g: any) => g.classes || []);
        setAvailableClasses(classes);
      }

      // Fetch Unique Departments
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('department')
        .eq('institution_id', institutionId)
        .not('department', 'is', null);

      if (profilesData) {
        const depts = Array.from(new Set(profilesData.map((p: any) => p.department))).filter(Boolean);
        setAvailableDepartments(depts as string[]);
      }
    };

    fetchData();
  }, [institutionId]);

  // Fetch allowed roles
  const { data: allowedRoles } = useQuery({
    queryKey: ['institution-allowed-roles', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const { data } = await supabase
        .from('institutions')
        .select('allowed_roles')
        .eq('institution_id', institutionId)
        .maybeSingle() as any;
      return data?.allowed_roles || {};
    },
    enabled: !!institutionId,
  });

  const tabs: { id: UserCategory, label: string }[] = useMemo(() => {
    const roles = allowedRoles || {};
    const allTabs: { id: UserCategory, label: string }[] = [
      { id: 'students', label: 'Students' },
      { id: 'staff', label: 'Faculty' },
      { id: 'parents', label: 'Parents' },
    ];
    
    if (roles.finance !== false) allTabs.push({ id: 'accountants', label: 'Finance' });
    if (roles.canteen !== false) allTabs.push({ id: 'canteen', label: 'Canteen' });
    if (roles.transport !== false) allTabs.push({ id: 'drivers', label: 'Transport' });
    
    return allTabs;
  }, [allowedRoles]);

  const filteredData = useMemo(() => {
    let baseData: any[] = [];
    if (activeTab === 'students') {
      baseData = [...students].sort((a: any, b: any) => {
        const classA = parseInt(a.class_name) || 0;
        const classB = parseInt(b.class_name) || 0;
        if (classA !== classB) return classA - classB;
        const secA = a.section || '';
        const secB = b.section || '';
        if (secA !== secB) return secA.localeCompare(secB);
        return (a.name || '').localeCompare(b.name || '');
      });
      if (filterClass) baseData = baseData.filter(u => u.class_name === filterClass);
      if (filterSection) baseData = baseData.filter(u => u.section === filterSection);
    } else if (activeTab === 'parents') {
      baseData = parents;
    } else if (activeTab === 'staff') {
      baseData = staff
        .filter((s: any) => s.role === 'teacher' || s.role === 'faculty')
        .sort((a: any, b: any) => {
          const deptA = a.department || 'Z_None'; 
          const deptB = b.department || 'Z_None';
          if (deptA !== deptB) return deptA.localeCompare(deptB);
          return (a.full_name || '').localeCompare(b.full_name || '');
        });
      if (filterDept) baseData = baseData.filter(u => u.department === filterDept);
    } else if (activeTab === 'accountants') {
      baseData = staff.filter((s: any) => s.role === 'accountant');
    } else if (activeTab === 'canteen') {
      baseData = staff.filter((s: any) => s.role === 'canteen_manager');
    } else if (activeTab === 'drivers') {
      baseData = staff.filter((s: any) => s.role === 'driver');
    }

    if (!searchQuery) return baseData;

    return baseData.filter(item => {
      const name = item.name || item.full_name || '';
      const email = item.email || '';
      const id = item.register_number || item.employee_id || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             email.toLowerCase().includes(searchQuery.toLowerCase()) ||
             id.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [activeTab, students, staff, parents, searchQuery, filterClass, filterSection, filterDept]);

  const handleUserAction = async (item: any) => {
    if (!item) return;
    const type = activeTab === 'students' ? 'student' : (activeTab === 'parents' ? 'parent' : 'staff');
    const isActive = checkIsActive(item);
    
    showAlert(
      "Manage User",
      `Choose an action for ${item.name || item.full_name}`,
      'info',
      [
        { text: "Cancel", style: "secondary", onPress: () => {} },
        { 
          text: isActive ? "Disable & Hide" : "Restore Access", 
          style: isActive ? "secondary" : "primary",
          onPress: async () => {
            const actionText = isActive ? 'disabling' : 'restoring';
            showAlert("Processing", `Please wait, ${actionText} user...`, "info");
            
            const res = await toggleUserStatus(item.id, type, isActive);
            if (res.success) {
              if (selectedUser?.id === item.id) {
                setSelectedUser((prev: any) => ({ ...prev, is_active: !isActive }));
                setIsModalVisible(false); // Close modal since they are hidden now
              }
              showAlert("Success", `User ${isActive ? 'disabled and hidden' : 'restored'} successfully`, "success");
            } else {
              showAlert("Error", "Failed to update user status", "error");
            }
          }
        }
      ]
    );
  };

  const handleCopyEmail = async (email: string) => {
    if (!email) return;
    await Clipboard.setStringAsync(email);
    showAlert("Copied", "Email copied to clipboard", "success");
  };

  const handleOpenDetails = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || user.full_name,
      email: user.email,
      phone: user.phone,
      dob: user.dob || user.date_of_birth || '',
      class_name: user.class_name,
      section: user.section,
      register_number: user.register_number,
      staff_id: user.staff_id,
      employee_id: user.employee_id,
      department: user.department,
      image_url: user.image_url || user.profile_image_url || user.avatar_url,
      parent_id: user.parent_id || undefined,
      parent_name: user.parents?.full_name || '',
      parent_email: user.parents?.email || '',
      parent_phone: user.parents?.phone || '',
    });
    setParentSearchQuery(user.parents?.email || '');
    setSelectedParent(user.parent_id ? { 
      id: user.parent_id, 
      full_name: user.parents?.full_name, 
      email: user.parents?.email 
    } : null);
    setIsModalVisible(true);
  };

  const handlePhotoUpdate = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
      setPendingPhoto(result.assets[0].uri);
      setShowPhotoPreview(true);
    } catch (error: any) {
      console.error('Photo pick error:', error);
      showAlert("Error", "Failed to pick photo", "error");
    }
  };

  const confirmPhotoUpload = async () => {
    if (!pendingPhoto || !selectedUser) return;
    setShowPhotoPreview(false);
    try {
      setIsPhotoUploading(true);
      const uri = pendingPhoto;
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${selectedUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${activeTab}/${fileName}`;
      const { publicUrl } = await uploadToSupabaseStorage({
        bucket: 'avatars',
        path: filePath,
        uri,
        mimeType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: true,
      });

      // 1. Update edit form state
      setEditForm((prev: any) => ({ ...prev, image_url: publicUrl }));

      // 2. Immediately persist avatar to database so it is saved directly
      const type = activeTab === 'students' ? 'student' : (activeTab === 'parents' ? 'parent' : 'staff');
      const res = await updateUser(selectedUser.id, type, {
        image_url: publicUrl,
        profile_id: selectedUser.profile_id || (selectedUser.profiles ? selectedUser.profiles.id : undefined),
      });

      if (res.success) {
        setSelectedUser((prev: any) => ({
          ...prev,
          image_url: publicUrl,
          profile_image_url: publicUrl,
          avatar_url: publicUrl,
        }));
        showAlert("Success", "Photo changed and saved successfully!", "success");
      } else {
        showAlert("Notice", "Photo uploaded. Click 'Save Changes' below to finalize.", "info");
      }
    } catch (error: any) {
      console.error('[User Photo Upload Error]:', error);
      showAlert("Error", "Failed to upload photo. Please try again.", "error");
    } finally {
      setIsPhotoUploading(false);
      setPendingPhoto(null);
    }
  };

  const cancelPhotoUpload = () => {
    setPendingPhoto(null);
    setShowPhotoPreview(false);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    const type = activeTab === 'students' ? 'student' : (activeTab === 'parents' ? 'parent' : 'staff');
    const updates: any = {};
    if (activeTab === 'students') {
      updates.name = editForm.name;
      updates.phone = editForm.phone;
      updates.dob = editForm.dob;
      updates.parent_id = editForm.parent_id;
    } else if (activeTab === 'parents') {
      updates.name = editForm.name;
      updates.full_name = editForm.name;
      updates.phone = editForm.phone;
      if (selectedUser.profile_id) {
        updates.profile_id = selectedUser.profile_id;
      }
    } else {
      updates.full_name = editForm.name;
      updates.phone = editForm.phone;
      updates.department = editForm.department;
    }
    if (editForm.image_url) {
      updates.image_url = editForm.image_url;
    }
    const res = await updateUser(selectedUser.id, type, updates);
    setIsUpdating(false);
    if (res.success) {
      setIsModalVisible(false);
      showAlert("Success", "User updated successfully", "success");
    } else {
      showAlert("Error", "Failed to update user", "error");
    }
  };

  const renderUserItem = ({ item }: { item: any }) => {
    const isActive = checkIsActive(item);
    const statusColor = isActive ? "#10B981" : "#EF4444";
    return (
      <TouchableOpacity style={styles.userCard} onPress={() => handleOpenDetails(item)} activeOpacity={0.7}>
        <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
        <View style={styles.cardMain}>
          <View style={styles.avatar}>
            {item.image_url || item.profile_image_url || item.avatar_url ? (
              <Image source={{ uri: item.image_url || item.profile_image_url || item.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{(item.name || item.full_name || 'U')[0]}</Text>
            )}
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{item.name || item.full_name}</Text>
              <Badge variant={isActive ? "success" : "destructive"} style={{ height: 20, paddingHorizontal: 6 }}>
                {isActive ? 'Active' : 'Disabled'}
              </Badge>
            </View>
            <View style={styles.emailRow}>
              <Mail size={12} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.userSub} numberOfLines={1}>{item.email || 'No email'}</Text>
            </View>
            <View style={styles.userMeta}>
              {(item.register_number || item.employee_id || item.staff_id) && (
                <View style={styles.metaItem}>
                  <Hash size={12} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.metaText}>{item.register_number || item.employee_id || item.staff_id}</Text>
                </View>
              )}
              {item.class_name && (
                <View style={styles.metaItem}>
                  <GraduationCap size={12} color={theme.colors.secondary} {...({} as any)} />
                  <Text style={styles.metaText}>{item.class_name}{item.section ? ` - ${item.section}` : ''}</Text>
                </View>
              )}
              {item.department && (
                <View style={styles.metaItem}>
                  <Building2 size={12} color={theme.colors.secondary} {...({} as any)} />
                  <Text style={styles.metaText}>{item.department}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.manageBtn]} 
            onPress={(e) => { e.stopPropagation(); handleUserAction(item); }}
          >
            <UserMinus size={18} color={theme.colors.primary} {...({} as any)} />
          </TouchableOpacity>
          <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="User Management" 
        subtitle={`${filteredData.length} total users found`}
        actions={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.filterBtn}><Download size={16} color={theme.colors.text} {...({} as any)} /></TouchableOpacity>
            <TouchableOpacity 
              style={styles.addBtn} 
              onPress={() => {
                const roleMap: any = { students: 'student', staff: 'faculty', parents: 'parent', accountants: 'accountant', canteen: 'canteen_manager', drivers: 'driver' };
                router.push({ pathname: '/(root)/institution/students/add', params: { role: roleMap[activeTab] || 'student' } } as any);
              }}
            >
              <Plus size={20} color="white" {...({} as any)} /><Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.colors.textMuted} {...({} as any)} />
          <TextInput style={styles.searchInput} placeholder="Search by name, email or ID..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <TouchableOpacity 
          style={[styles.filterBtn, showFilterBar && styles.activeFilterBtn]}
          onPress={() => setShowFilterBar(!showFilterBar)}
        >
          {showFilterBar ? <X size={18} color="white" {...({} as any)} /> : <Filter size={18} color={theme.colors.text} {...({} as any)} />}
        </TouchableOpacity>
      </View>

      {showFilterBar && (activeTab === 'students' || activeTab === 'staff') && (
        <View style={styles.filterBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
            {activeTab === 'students' && (
              <>
                <TouchableOpacity 
                  style={[styles.filterChip, filterClass && styles.activeFilterChip]} 
                  onPress={() => setShowClassModal(true)}
                >
                  <Text style={[styles.filterChipText, filterClass && styles.activeFilterChipText]}>{filterClass || 'Class'}</Text>
                  <ChevronDown size={14} color={filterClass ? 'white' : theme.colors.textMuted} {...({} as any)} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterChip, filterSection && styles.activeFilterChip]} 
                  onPress={() => {
                    if (!filterClass) {
                      showAlert("Selection Required", "Please select a class first", "info");
                      return;
                    }
                    setShowSectionModal(true);
                  }}
                >
                  <Text style={[styles.filterChipText, filterSection && styles.activeFilterChipText]}>{filterSection || 'Section'}</Text>
                  <ChevronDown size={14} color={filterSection ? 'white' : theme.colors.textMuted} {...({} as any)} />
                </TouchableOpacity>
              </>
            )}

            {activeTab === 'staff' && (
              <TouchableOpacity 
                style={[styles.filterChip, filterDept && styles.activeFilterChip]} 
                onPress={() => setShowDeptModal(true)}
              >
                <Text style={[styles.filterChipText, filterDept && styles.activeFilterChipText]}>{filterDept || 'Department'}</Text>
                <ChevronDown size={14} color={filterDept ? 'white' : theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            )}

            {(filterClass || filterSection || filterDept) && (
              <TouchableOpacity 
                onPress={() => { setFilterClass(null); setFilterSection(null); setFilterDept(null); }} 
                style={styles.clearFiltersBtn}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.tabsContainer}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={tabs} keyExtractor={(item) => item.id} renderItem={({ item }) => (
          <TouchableOpacity style={[styles.tab, activeTab === item.id && styles.activeTab]} onPress={() => setActiveTab(item.id)}>
            <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>{item.label}</Text>
          </TouchableOpacity>
        )} />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : (
        <FlatList 
          data={filteredData} 
          keyExtractor={(item) => item.id} 
          renderItem={renderUserItem} 
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isLoading} 
              onRefresh={() => queryClient.invalidateQueries({ queryKey: [activeTab === 'students' ? 'institution-students' : (activeTab === 'parents' ? 'institution-parents' : 'institution-staff')] })} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}><Users size={48} color="#E2E8F0" {...({} as any)} /><Text style={styles.emptyText}>No users found in this category</Text></View>
          } 
        />
      )}

      {/* Pop-up Card (User Details Modal) */}
      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}><X size={24} color={theme.colors.text} {...({} as any)} /></TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderCard}>
                <TouchableOpacity style={styles.largeAvatar} onPress={handlePhotoUpdate} disabled={isPhotoUploading}>
                  {isPhotoUploading ? <ActivityIndicator color={theme.colors.primary} /> : (editForm.image_url ? <Image source={{ uri: editForm.image_url }} style={styles.largeAvatarImage} /> : <Text style={styles.largeAvatarText}>{(editForm.name || 'U')[0]}</Text>)}
                  <View style={styles.avatarOverlay}><Camera size={16} color="white" {...({} as any)} /></View>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                  <Text style={styles.modalName}>{editForm.name}</Text>
                  <View style={styles.statusBadgeRow}>
                    <Badge variant={checkIsActive(selectedUser) ? "success" : "destructive"} style={{ height: 24, paddingHorizontal: 10 }}>
                      {checkIsActive(selectedUser) ? "ACTIVE ACCOUNT" : "DISABLED ACCOUNT"}
                    </Badge>
                  </View>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}><Users size={18} color={theme.colors.primary} {...({} as any)} /><Text style={styles.sectionTitle}>Personal Info</Text></View>
                  <View style={styles.inputWrap}><Text style={styles.fieldLabel}>Display Name</Text><TextInput style={styles.modalInput} value={editForm.name} onChangeText={(val) => setEditForm((p: any) => ({ ...p, name: val }))} /></View>
                  <View style={styles.inputWrap}>
                    <Text style={styles.fieldLabel}>Email (Static)</Text>
                    <TouchableOpacity 
                      style={styles.readOnlyBox} 
                      onPress={() => handleCopyEmail(editForm.email)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.readOnlyText} numberOfLines={1}>{editForm.email}</Text>
                      <Copy size={14} color={theme.colors.primary} {...({} as any)} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrap}><Text style={styles.fieldLabel}>Phone</Text><TextInput style={styles.modalInput} value={editForm.phone} onChangeText={(val) => setEditForm((p: any) => ({ ...p, phone: val }))} keyboardType="phone-pad" /></View>
                </View>

                {(activeTab === 'students' || activeTab === 'staff') && (
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}><GraduationCap size={18} color={theme.colors.secondary} {...({} as any)} /><Text style={styles.sectionTitle}>{activeTab === 'students' ? 'Campus Details' : 'Professional'}</Text></View>
                    <View style={styles.inputWrap}><Text style={styles.fieldLabel}>Identity ID</Text><View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{editForm.register_number || editForm.employee_id || editForm.staff_id}</Text></View></View>
                    {activeTab === 'students' ? (
                      <View style={styles.inputWrap}><Text style={styles.fieldLabel}>Class & Section</Text><View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{editForm.class_name || 'N/A'} - {editForm.section || 'N/A'}</Text></View></View>
                    ) : (
                      <View style={styles.inputWrap}><Text style={styles.fieldLabel}>Department</Text><TextInput style={styles.modalInput} value={editForm.department} onChangeText={(val) => setEditForm((p: any) => ({ ...p, department: val }))} /></View>
                    )}
                  </View>
                )}

                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}><CheckCircle size={18} color="#10B981" {...({} as any)} /><Text style={styles.sectionTitle}>Security & Access</Text></View>
                  <TouchableOpacity style={[styles.statusToggle, checkIsActive(selectedUser) ? styles.statusToggleActive : styles.statusToggleDisabled]} onPress={() => handleUserAction(selectedUser)}>
                    <View style={styles.statusToggleInfo}>
                      <Text style={styles.statusToggleTitle}>{checkIsActive(selectedUser) ? 'Block Access' : 'Restore Access'}</Text>
                      <Text style={styles.statusToggleSub}>{checkIsActive(selectedUser) ? 'Immediately terminate user sessions.' : 'Enable user login to the app.'}</Text>
                    </View>
                    {checkIsActive(selectedUser) ? <UserMinus size={20} color="#EF4444" {...({} as any)} /> : <UserCheck size={20} color="#10B981" {...({} as any)} />}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveChangesBtn, isUpdating && { opacity: 0.7 }]} onPress={handleUpdate} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="white" /> : <><Save size={18} color="white" {...({} as any)} /><Text style={styles.saveChangesBtnText}>Save Changes</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal visible={showPhotoPreview} transparent animationType="fade" onRequestClose={cancelPhotoUpload}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, width: '100%', maxWidth: 360, overflow: 'hidden' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center', paddingTop: 24, paddingBottom: 12 }}>Preview Avatar</Text>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>{pendingPhoto && <Image source={{ uri: pendingPhoto }} style={{ width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: theme.colors.primary + '30' }} />}</View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' }} onPress={cancelPhotoUpload}><Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Discard</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }} onPress={confirmPhotoUpload}><Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertModal visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
      <CalendarModal visible={showDOBPicker} title="Select DOB" initialDate={editForm.dob} onSelect={(d: string) => setEditForm((p: any) => ({ ...p, dob: d }))} onClose={() => setShowDOBPicker(false)} />
      
      {/* Premium Filter Selectors */}
      <SelectionModal
        visible={showClassModal}
        title="Select Class"
        options={availableClasses.map(c => ({ id: c.id, label: c.name, icon: <GraduationCap size={18} color={theme.colors.primary} {...({} as any)} /> }))}
        selectedValue={filterClass}
        showClear
        onSelect={(opt) => {
          setFilterClass(opt.label);
          setFilterSection(null);
        }}
        onClear={() => {
          setFilterClass(null);
          setFilterSection(null);
        }}
        onClose={() => setShowClassModal(false)}
      />

      <SelectionModal
        visible={showSectionModal}
        title={`Select Section for ${filterClass}`}
        options={(availableClasses.find(c => c.name === filterClass)?.sections || []).map((s: string) => ({ id: s, label: s, icon: <Users size={18} color={theme.colors.secondary} {...({} as any)} /> }))}
        selectedValue={filterSection}
        showClear
        onSelect={(opt) => setFilterSection(opt.label)}
        onClear={() => setFilterSection(null)}
        onClose={() => setShowSectionModal(false)}
      />

      <SelectionModal
        visible={showDeptModal}
        title="Select Department"
        options={availableDepartments.map(d => ({ id: d, label: d, icon: <Building2 size={18} color={theme.colors.primary} {...({} as any)} /> }))}
        selectedValue={filterDept}
        showClear
        onSelect={(opt) => setFilterDept(opt.label)}
        onClear={() => setFilterDept(null)}
        onClose={() => setShowDeptModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  addBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  searchContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.text },
  filterBtn: { width: 44, height: 44, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  activeFilterBtn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterBarContainer: { marginBottom: 12 },
  filterBar: { maxHeight: 50 },
  filterBarContent: { paddingHorizontal: 16, gap: 10, alignItems: 'center', paddingBottom: 4 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  activeFilterChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  activeFilterChipText: { color: 'white' },
  clearFiltersBtn: { marginLeft: 8 },
  clearFiltersText: { fontSize: 13, color: '#EF4444', fontWeight: 'bold' },
  tabsContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { paddingHorizontal: 20, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: '#F1F5F9' },
  activeTab: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabText: { color: 'white' },
  listContent: { padding: 16, paddingBottom: 40 },
  userCard: { backgroundColor: 'white', borderRadius: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  statusStrip: { width: 6, height: '100%', position: 'absolute', left: 0 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, padding: 16, paddingLeft: 22 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 26 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'white' },
  userDetails: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  userName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userSub: { fontSize: 12, color: theme.colors.textMuted },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  metaText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  userActions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 16 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, backgroundColor: 'white' },
  manageBtn: { borderColor: theme.colors.primary + '20', backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  modalBody: { flex: 1, backgroundColor: '#F8FAFC' },
  modalScrollContent: { padding: 20, paddingBottom: 40 },
  modalHeaderCard: { backgroundColor: 'white', padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  largeAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 4, borderColor: 'white', overflow: 'visible', position: 'relative' },
  avatarOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.colors.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  largeAvatarImage: { width: '100%', height: '100%', borderRadius: 45 },
  largeAvatarText: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary },
  headerInfo: { alignItems: 'center' },
  modalName: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  infoGrid: { gap: 16 },
  sectionCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  inputWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: theme.colors.text },
  readOnlyBox: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readOnlyText: { fontSize: 15, color: theme.colors.textMuted, flex: 1, marginRight: 8 },
  statusToggle: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  statusToggleActive: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
  statusToggleDisabled: { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
  statusToggleInfo: { flex: 1 },
  statusToggleTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  statusToggleSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: 'white' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  cancelBtnText: { fontSize: 15, fontWeight: 'bold', color: theme.colors.textMuted },
  saveChangesBtn: { flex: 2, flexDirection: 'row', backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveChangesBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});
