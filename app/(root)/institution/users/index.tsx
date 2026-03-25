import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionUsers } from '../../../../src/hooks/useInstitutionUsers';
import { 
  Users, Search, Plus, UserMinus, UserCheck, ChevronRight, Filter, Download, X, Edit2, Save, ChevronDown, Copy, Check, CheckCircle, Camera
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Badge } from '../../../../src/components/common/Badge';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'react-native';

type UserCategory = 'students' | 'staff' | 'parents' | 'accountants' | 'canteen' | 'drivers';

export default function UserManagementScreen() {
  const { institutionId } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<UserCategory>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const { students, staff, parents, isLoading, toggleUserStatus, updateUser } = useInstitutionUsers(institutionId);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [copied, setCopied] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

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
    enabled: !!institutionId && parentSearchQuery.length >= 2
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

  const tabs: { id: UserCategory, label: string }[] = [
    { id: 'students', label: 'Students' },
    { id: 'staff', label: 'Faculty' },
    { id: 'parents', label: 'Parents' },
    { id: 'accountants', label: 'Finance' },
    { id: 'canteen', label: 'Canteen' },
    { id: 'drivers', label: 'Transport' },
  ];

  const filteredData = useMemo(() => {
    let baseData: any[] = [];
    if (activeTab === 'students') baseData = students;
    else if (activeTab === 'parents') baseData = parents;
    else if (activeTab === 'staff') baseData = staff.filter((s: any) => s.role === 'teacher' || s.role === 'faculty');
    else if (activeTab === 'accountants') baseData = staff.filter((s: any) => s.role === 'accountant');
    else if (activeTab === 'canteen') baseData = staff.filter((s: any) => s.role === 'canteen_manager');
    else if (activeTab === 'drivers') baseData = staff.filter((s: any) => s.role === 'driver');

    if (!searchQuery) return baseData;

    return baseData.filter(item => {
      const name = item.name || item.full_name || '';
      const email = item.email || '';
      const id = item.register_number || item.employee_id || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             email.toLowerCase().includes(searchQuery.toLowerCase()) ||
             id.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [activeTab, students, staff, parents, searchQuery]);

  const handleToggleStatus = async (item: any) => {
    const type = activeTab === 'students' ? 'student' : (activeTab === 'parents' ? 'parent' : 'staff');
    const isActive = item.is_active !== false;
    
    showAlert(
      isActive ? "Disable User" : "Enable User",
      `Are you sure you want to ${isActive ? "disable" : "enable"} ${item.name || item.full_name}?`,
      'warning',
      [
        { text: "Cancel", style: "secondary", onPress: () => {} },
        { 
          text: isActive ? "Disable" : "Enable", 
          style: isActive ? "destructive" : "primary",
          onPress: async () => {
            const res = await toggleUserStatus(item.id, type, isActive);
            if (!res.success) {
              showAlert("Error", "Failed to update user status", "error");
            }
          }
        }
      ]
    );
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
      department: user.department,
      image_url: user.image_url || user.profile_image_url || user.avatar_url,
      // Parent info (pre-fill if already linked)
      parent_id: user.parent_id || undefined,
      parent_name: user.parents?.full_name || '',
      parent_email: user.parents?.email || '',
      parent_phone: user.parents?.phone || '',
    });
    // Pre-fill parent search if already linked
    setParentSearchQuery(user.parents?.email || '');
    setSelectedParent(user.parent_id ? { 
      id: user.parent_id, 
      full_name: user.parents?.full_name, 
      email: user.parents?.email 
    } : null);
    setCopied(false);
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

      // Show preview modal instead of directly uploading
      setPendingPhoto(result.assets[0].uri);
      setShowPhotoPreview(true);
    } catch (error: any) {
      console.error('Photo pick error:', error);
      showAlert("Error", "Failed to pick photo: " + error.message, "error");
    }
  };

  const confirmPhotoUpload = async () => {
    if (!pendingPhoto) return;
    setShowPhotoPreview(false);

    try {
      setIsPhotoUploading(true);
      const uri = pendingPhoto;
      const fileExt = uri.split('.').pop();
      const fileName = `${selectedUser.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${activeTab}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);

      // 1. Upload new image
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Delete old image if it exists in our storage
      const oldUrl = editForm.image_url;
      if (oldUrl && oldUrl.includes('supabase.co')) {
        try {
          const urlParts = oldUrl.split('avatars/');
          if (urlParts.length > 1) {
            const oldPath = urlParts[1].split('?')[0];
            await supabase.storage.from('avatars').remove([oldPath]);
            console.log('Cleaned up old avatar:', oldPath);
          }
        } catch (cleanupErr) {
          console.error('Failed to cleanup old avatar:', cleanupErr);
        }
      }

      setEditForm({ ...editForm, image_url: publicUrl });
      showAlert("Success", "Photo uploaded! Don't forget to save changes.", "success");
    } catch (error: any) {
      console.error('Photo update error:', error);
      showAlert("Error", "Failed to upload photo: " + error.message, "error");
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
      updates.class_name = editForm.class_name;
      updates.section = editForm.section;
      updates.register_number = editForm.register_number;
      // Parent linking
      if (editForm.parent_id) updates.parent_id = editForm.parent_id;
      if (editForm.parent_name) updates.parent_name = editForm.parent_name;
      if (editForm.parent_email) updates.parent_email = editForm.parent_email;
      if (editForm.parent_phone) updates.parent_phone = editForm.parent_phone;
    } else if (activeTab === 'parents') {
      updates.name = editForm.name;
      updates.phone = editForm.phone;
      updates.dob = editForm.dob;
    } else {
      updates.full_name = editForm.name;
      updates.phone = editForm.phone;
      updates.dob = editForm.dob;
      updates.staff_id = editForm.staff_id;
      updates.department = editForm.department;
    }

    // Common updates
    if (editForm.image_url !== selectedUser.image_url && editForm.image_url !== selectedUser.profile_image_url && editForm.image_url !== selectedUser.avatar_url) {
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

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => handleOpenDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userMain}>
        <View style={styles.avatar}>
          {item.image_url || item.profile_image_url || item.avatar_url ? (
            <Image 
              source={{ uri: item.image_url || item.profile_image_url || item.avatar_url }} 
              style={styles.avatarImage} 
            />
          ) : (
            <Text style={styles.avatarText}>{(item.name || item.full_name || 'U')[0]}</Text>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name || item.full_name}</Text>
          <Text style={styles.userSub}>{item.email || 'No email'}</Text>
          <View style={styles.userMeta}>
            {item.register_number && <Badge variant="info">{item.register_number}</Badge>}
            {item.class_name && <Text style={styles.metaText}>{item.class_name}{item.section ? ` - ${item.section}` : ''}</Text>}
            <Badge 
              variant={item.is_active !== false ? "success" : "destructive"} 
            >
              {item.is_active !== false ? 'Active' : 'Disabled'}
            </Badge>
          </View>
        </View>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, item.is_active !== false ? styles.disableBtn : styles.enableBtn]} 
          onPress={(e) => {
            e.stopPropagation();
            handleToggleStatus(item);
          }}
        >
          {item.is_active !== false ? (
            <UserMinus size={18} color="#EF4444" {...({} as any)} />
          ) : (
            <UserCheck size={18} color="#10B981" {...({} as any)} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailsBtn}>
          <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <PageHeader 
        title="User Management" 
        subtitle={`${filteredData.length} total users found`}
        actions={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: '#6366F1' }]} 
              onPress={async () => {
                try {
                  const ws = XLSX.utils.json_to_sheet(filteredData.map((u: any) => ({
                    name: u.name || u.full_name,
                    email: u.email,
                    role: activeTab,
                    register_number: u.register_number || '',
                    class_name: u.class_name || '',
                    section: u.section || '',
                    phone: u.phone || '',
                    status: u.is_active !== false ? 'Active' : 'Disabled'
                  })));
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Users');
                  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
                  const fileUri = `${(FileSystem as any).cacheDirectory}users_${activeTab}_${Date.now()}.xlsx`;
                  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: (FileSystem as any).EncodingType.Base64 });
                  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
                } catch (e: any) { Alert.alert('Error', e.message); }
              }}
            >
              <Download size={16} color="white" {...({} as any)} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addBtn} 
              onPress={() => {
                const roleMap: Record<string, string> = { students: 'student', staff: 'faculty', parents: 'parent', accountants: 'accountant', canteen: 'canteen_manager', drivers: 'driver' };
                router.push({ pathname: '/(root)/institution/students/add', params: { role: roleMap[activeTab] || 'student' } }  as any);
              }}
            >
              <Plus size={20} color="white" {...({} as any)} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.colors.textMuted} {...({} as any)} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search by name, email or ID..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Filter size={18} color={theme.colors.text} {...({} as any)} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tab, activeTab === item.id && styles.activeTab]}
              onPress={() => setActiveTab(item.id)}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color="#E2E8F0" {...({} as any)} />
              <Text style={styles.emptyText}>No users found in this category</Text>
            </View>
          }
        />
      )}

      {/* User Details Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalAvatarContainer}>
                <TouchableOpacity 
                  style={styles.largeAvatar} 
                  onPress={handlePhotoUpdate}
                  disabled={isPhotoUploading}
                >
                  {isPhotoUploading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : editForm.image_url ? (
                    <Image source={{ uri: editForm.image_url }} style={styles.largeAvatarImage} />
                  ) : (
                    <Text style={styles.largeAvatarText}>{(editForm.name || 'U')[0]}</Text>
                  )}
                  <View style={styles.avatarOverlay}>
                    <Camera size={20} color="white" {...({} as any)} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.modalName}>{editForm.name}</Text>
                <View style={styles.emailContainer}>
                  <Text style={styles.modalSub}>{editForm.email}</Text>
                  <TouchableOpacity 
                    style={styles.copyBtn}
                    onPress={async () => {
                      if (editForm.email) {
                        await Clipboard.setStringAsync(editForm.email);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                  >
                    {copied ? (
                      <Check size={14} color="#10B981" {...({} as any)} />
                    ) : (
                      <Copy size={14} color={theme.colors.textMuted} {...({} as any)} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Basic Information</Text>
                
                <View style={styles.inputWrap}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput 
                    style={styles.modalInput}
                    value={editForm.name}
                    onChangeText={(v) => setEditForm({...editForm, name: v})}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput 
                    style={styles.modalInput}
                    value={editForm.phone}
                    onChangeText={(v) => setEditForm({...editForm, phone: v})}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.fieldLabel}>Date of Birth (YYYY-MM-DD)</Text>
                  <TouchableOpacity 
                    style={[styles.modalInput, { justifyContent: 'center' }]} 
                    onPress={() => setShowDOBPicker(true)}
                  >
                    <Text style={{ color: editForm.dob ? theme.colors.text : '#94A3B8' }}>
                      {editForm.dob || 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {activeTab === 'students' && (
                  <>
                    <View style={styles.inputWrap}>
                      <Text style={styles.fieldLabel}>Class</Text>
                      <TouchableOpacity 
                        style={styles.modalInput}
                        onPress={() => {
                          if (availableClasses.length === 0) return Alert.alert("Error", "No classes found");
                          Alert.alert("Select Class", "", availableClasses.map(c => ({
                            text: c.name,
                            onPress: () => setEditForm({...editForm, class_name: c.name, section: ''})
                          })).concat([{ text: "Cancel", style: "cancel" } as any]));
                        }}
                      >
                        <Text style={{ color: editForm.class_name ? theme.colors.text : '#94A3B8' }}>
                          {editForm.class_name || 'Select Class'}
                        </Text>
                        <ChevronDown size={16} color={theme.colors.textMuted} style={{ position: 'absolute', right: 16, top: 12 }} {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrap}>
                      <Text style={styles.fieldLabel}>Section</Text>
                      <TouchableOpacity 
                        style={styles.modalInput}
                        onPress={() => {
                          const cls = availableClasses.find(c => c.name === editForm.class_name);
                          if (!cls) return Alert.alert("Error", "Select a class first");
                          const sections = Array.isArray(cls.sections) ? cls.sections : [cls.sections];
                          Alert.alert("Select Section", "", sections.map((s: string) => ({
                            text: s,
                            onPress: () => setEditForm({...editForm, section: s})
                          })).concat([{ text: "Cancel", style: "cancel" } as any]));
                        }}
                      >
                        <Text style={{ color: editForm.section ? theme.colors.text : '#94A3B8' }}>
                          {editForm.section || 'Select Section'}
                        </Text>
                        <ChevronDown size={16} color={theme.colors.textMuted} style={{ position: 'absolute', right: 16, top: 12 }} {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrap}>
                      <Text style={styles.fieldLabel}>Register Number</Text>
                      <TextInput 
                        style={styles.modalInput}
                        value={editForm.register_number}
                        onChangeText={(v) => setEditForm({...editForm, register_number: v})}
                      />
                    </View>



                    {/* Parent Linking integrated here */}
                    <View style={styles.divider} />
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Parent Linking</Text>

                    <View style={styles.inputWrap}>
                      <Text style={styles.fieldLabel}>Search Parent by Email</Text>
                      <View style={styles.parentSearchRow}>
                        <Search size={16} color={theme.colors.textMuted} {...({} as any)} />
                        <TextInput
                          style={styles.parentSearchInput}
                          value={parentSearchQuery}
                          onChangeText={(v) => {
                            setParentSearchQuery(v);
                            setShowParentDropdown(true);
                            if (!v) handleClearParent();
                          }}
                          onFocus={() => setShowParentDropdown(true)}
                          placeholder="Search existing parent..."
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        {selectedParent && (
                          <TouchableOpacity onPress={handleClearParent}>
                            <X size={16} color={theme.colors.textMuted} {...({} as any)} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {showParentDropdown && parentResults.length > 0 && (
                        <View style={styles.parentDropdown}>
                          {(parentResults as any[]).map((p: any) => (
                            <TouchableOpacity
                              key={p.id}
                              style={styles.parentDropdownItem}
                              onPress={() => handleSelectParent(p)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.parentDropdownName}>{p.full_name || 'Parent'}</Text>
                                <Text style={styles.parentDropdownEmail}>{p.email}</Text>
                              </View>
                              {selectedParent?.id === p.id && (
                                <CheckCircle size={16} color="#10B981" {...({} as any)} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {selectedParent && (
                        <View style={styles.parentLinkedCard}>
                          <View style={styles.parentLinkedDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.parentLinkedName}>{selectedParent.full_name}</Text>
                            <Text style={styles.parentLinkedEmail}>{selectedParent.email}</Text>
                          </View>
                          <CheckCircle size={18} color="#10B981" {...({} as any)} />
                        </View>
                      )}
                    </View>

                    <View style={styles.inputWrap}>
                      <Text style={styles.fieldLabel}>Parent Name {selectedParent && '(Linked)'}</Text>
                      <TextInput
                        style={[styles.modalInput, selectedParent && styles.readOnlyInput]}
                        value={editForm.parent_name || ''}
                        onChangeText={(v) => setEditForm({...editForm, parent_name: v})}
                        editable={!selectedParent}
                        placeholder="Parent Name"
                      />
                    </View>

                    <View style={styles.inputWrap}>
                      <Text style={styles.fieldLabel}>Parent Phone</Text>
                      <TextInput
                        style={[styles.modalInput, selectedParent && styles.readOnlyInput]}
                        value={editForm.parent_phone || ''}
                        onChangeText={(v) => setEditForm({...editForm, parent_phone: v})}
                        editable={!selectedParent}
                        placeholder="Phone Number"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </>
                )}
              </View>

              {activeTab !== 'students' && activeTab !== 'parents' && (
                <View style={styles.formSection}>
                  <View style={styles.inputWrap}>
                    <Text style={styles.fieldLabel}>Department</Text>
                    <TouchableOpacity 
                      style={styles.modalInput}
                      onPress={() => {
                        if (availableDepartments.length === 0) {
                          Alert.alert("Departments", "No existing departments found. Please type it in.");
                          return;
                        }
                        Alert.alert("Select Department", "", availableDepartments.map(d => ({
                          text: d,
                          onPress: () => setEditForm({...editForm, department: d})
                        })).concat([
                          { text: "Cancel", style: "cancel" }
                        ] as any));
                      }}
                    >
                       <TextInput 
                         style={{ color: theme.colors.text, padding: 0 }}
                         value={editForm.department}
                         onChangeText={(v) => setEditForm({...editForm, department: v})}
                         placeholder="Type or select..."
                       />
                       <ChevronDown size={16} color={theme.colors.textMuted} style={{ position: 'absolute', right: 16, top: 12 }} {...({} as any)} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveChangesBtn, isUpdating && { opacity: 0.7 }]}
                onPress={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Save size={18} color="white" {...({} as any)} />
                    <Text style={styles.saveChangesBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal visible={showPhotoPreview} transparent animationType="fade" onRequestClose={cancelPhotoUpload}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, width: '100%', maxWidth: 360, overflow: 'hidden' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center', paddingTop: 24, paddingBottom: 12 }}>Preview Photo</Text>
            <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24 }}>
              {pendingPhoto && (
                <Image source={{ uri: pendingPhoto }} style={{ width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: theme.colors.primary + '30' }} />
              )}
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' }} onPress={cancelPhotoUpload}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#EF4444' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }} onPress={confirmPhotoUpload}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.primary }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      <CalendarModal
        visible={showDOBPicker}
        title="Select Date of Birth"
        initialDate={editForm.dob}
        onSelect={(date: string) => setEditForm((prev: any) => ({ ...prev, dob: date }))}
        onClose={() => setShowDOBPicker(false)}
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
  tabsContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { paddingHorizontal: 20, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: '#F1F5F9' },
  activeTab: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabText: { color: 'white' },
  listContent: { padding: 16, paddingBottom: 40 },
  userCard: { backgroundColor: 'white', borderRadius: 16, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F5F9' },
  userMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  userDetails: { flex: 1 },
  userName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  userSub: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 4 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: theme.colors.textMuted },
  userActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  disableBtn: { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  enableBtn: { borderColor: '#DCFCE7', backgroundColor: '#F0FDF4' },
  detailsBtn: { padding: 4 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  modalBody: { flex: 1 },
  modalScrollContent: { padding: 24, paddingBottom: 40 },
  modalAvatarContainer: { alignItems: 'center', marginBottom: 32 },
  largeAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 4, borderColor: 'white', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden', position: 'relative' },
  avatarOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  largeAvatarImage: { width: '100%', height: '100%' },
  largeAvatarText: { fontSize: 32, fontWeight: 'bold', color: theme.colors.primary },
  modalName: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
  emailContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalSub: { fontSize: 14, color: theme.colors.textMuted },
  copyBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 6 },
  formSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  inputWrap: { marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: theme.colors.text },
  readOnlyInput: { backgroundColor: '#F1F5F9', color: theme.colors.textMuted },
  modalFooter: { flexDirection: 'row', padding: 24, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textMuted },
  saveChangesBtn: { flex: 2, flexDirection: 'row', backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveChangesBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  // Parent search styles
  parentSearchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  parentSearchInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0 },
  parentDropdown: { marginTop: 4, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  parentDropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  parentDropdownName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  parentDropdownEmail: { fontSize: 12, color: theme.colors.textMuted },
  parentLinkedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#D1FAE5' },
  parentLinkedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  parentLinkedName: { fontSize: 13, fontWeight: 'bold', color: '#065F46' },
  parentLinkedEmail: { fontSize: 12, color: '#10B981' },
});
