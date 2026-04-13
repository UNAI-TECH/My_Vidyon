import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Image, RefreshControl, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { useAuth } from '../../../src/hooks/useAuth';
import { useCanteenDashboard } from '../../../src/hooks/useCanteenDashboard';
import { supabase } from '../../../src/lib/supabase';
import { AdBanner } from '../../../src/components/common/Ads/AdBanner';
import { EventAdCarousel } from '../../../src/components/common/EventAdCarousel';
import { 
  Users, CheckCircle, XCircle, ShieldAlert, Lock, User, 
  HelpCircle, CheckSquare, XSquare, PartyPopper, 
  AlertTriangle, ShieldCheck, ShieldX, Shield, Clock
} from 'lucide-react-native';

type StudentItem = {
  id: string;
  recordId: string | null;
  name: string;
  roll: string;
  className: string;
  section: string;
  imageUrl: string | null;
  canteenStatus: string;
  schoolPresence: 'in_school' | 'absent_school' | 'no_record';
};

export default function CanteenDashboard() {
  const { institutionId, role, imageUrl } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const { 
    presentInSchool, absentFromSchool, noSchoolRecord, allStudents,
    classes, sections, institution, canteenProfile, isLoading, refresh 
  } = useCanteenDashboard(institutionId || undefined, selectedClass, selectedSection);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [statusModal, setStatusModal] = useState<{type: 'success' | 'error' | 'warning', title: string, message: string} | null>(null);

  // Local state for canteen status overrides before submitting
  const [localSelections, setLocalSelections] = useState<Record<string, 'permitted' | 'absent' | 'illegal'>>({});

  const welcomeName = canteenProfile?.full_name?.split(' ')[0] || 'Manager';

  // Compute stats combining DB state and local overrides
  const dynamicStats = React.useMemo(() => {
    let permitted = 0;
    let absent = 0;
    let illegal = 0;
    let inSchool = 0;
    let absentSchool = 0;

    allStudents.forEach(s => {
      const isAbsentFromSchool = s.schoolPresence === 'absent_school' || s.schoolPresence === 'no_record';
      if (isAbsentFromSchool) absentSchool++;
      else inSchool++;

      const status = localSelections[s.id] || s.canteenStatus;
      if (status === 'permitted') permitted++;
      else if (status === 'absent') absent++;
      else if (status === 'illegal') illegal++;
    });

    return {
      permitted,
      absent,
      illegal,
      inSchool,
      absentSchool,
      total: allStudents.length,
      unverified: allStudents.length - permitted - absent - illegal
    };
  }, [allStudents, localSelections]);

  const handleClassChange = (cls?: string) => {
    setSelectedClass(cls);
    setSelectedSection(undefined);
  };

  // Merge "no record" with "absent" — from canteen perspective, not confirmed = not here
  const notInSchool = [...absentFromSchool, ...noSchoolRecord];

  // Tab toggle: "present" or "absent"
  const [viewTab, setViewTab] = useState<'present' | 'absent'>('present');
  const displayStudents = viewTab === 'present' ? presentInSchool : notInSchool;

  // Boolean helper to check if UI should prompt for selection
  const needsSelection = !selectedClass || !selectedSection;

  // Is Class locked? (Once any student in the selected class/section is submitted, lock it)
  const isClassLocked = (selectedClass && selectedSection) 
    ? displayStudents.some(s => s.canteenStatus !== 'unverified')
    : false;

  const setStatus = (studentId: string, newStatus: 'permitted' | 'absent' | 'illegal') => {
    if (isClassLocked) {
      Alert.alert('Class Submitted', 'This class has already been finalized for today and cannot be edited.');
      return;
    }
    setLocalSelections(prev => ({ ...prev, [studentId]: newStatus }));
  };

  const submitAll = async () => {
    // Close modal securely first
    setShowSubmitModal(false);

    const today = new Date().toISOString().split('T')[0];
    const updates = Object.entries(localSelections).map(([studentId, status]) => {
      const s = allStudents.find(student => student.id === studentId);
      return {
        ...(s?.recordId ? { id: s.recordId } : {}),
        student_id: studentId,
        institution_id: institutionId!,
        attendance_date: today,
        status: s?.schoolPresence === 'in_school' ? 'present' : 'absent',
        canteen_permission: status,
        entry_allowed: s?.schoolPresence === 'in_school',
        academic_year: s?.academicYear,
      };
    });

    if (updates.length === 0) {
      setStatusModal({ type: 'warning', title: 'No Changes', message: 'Please select at least one student status before submitting.' });
      return;
    }

    const { error } = await supabase
      .from('student_attendance')
      .upsert(updates as any);

    if (error) {
      console.error('Error in bulk update:', error);
      setStatusModal({ type: 'error', title: 'Error', message: 'Failed to submit data to the dashboard.' });
    } else {
      setStatusModal({ type: 'success', title: 'Success', message: 'All records submitted successfully.' });
      setLocalSelections({}); // Clear cached selections
      refresh();
    }
  };

  const handleCloseDay = () => {
    setShowSubmitModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 1000);
  };


  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="dark" />
        <Text style={{ color: theme.colors.textMuted }}>Loading Canteen Data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <FlatList
        data={displayStudents}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListFooterComponent={<AdBanner type="CANTEEN" />}
        ListHeaderComponent={
          <View>
            {/* Greeting */}
            <PageHeader 
              title={`Hi, ${welcomeName} 👋`}
              subtitle="Canteen Management Overview"
              institutionName={institution?.name}
              institutionLogo={institution?.logo_url}
              userRole={role || 'canteen'}
               actions={null}
            />

            <EventAdCarousel 
              nativeAdUnitID="ca-app-pub-3940256099942544/2247696110" 
              adInterval={2}
            />

            {/* Stats Strip */}
            <View style={styles.statsStrip}>
              <View style={styles.statPill}>
                <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.statNum}>{dynamicStats.inSchool}</Text>
                <Text style={styles.statLbl}>In School</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.statNum}>{dynamicStats.absentSchool}</Text>
                <Text style={styles.statLbl}>Absent</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <View style={[styles.statDot, { backgroundColor: '#F97316' }]} />
                <Text style={styles.statNum}>{dynamicStats.illegal}</Text>
                <Text style={styles.statLbl}>Illegal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statPill}>
                <View style={[styles.statDot, { backgroundColor: '#6366F1' }]} />
                <Text style={styles.statNum}>{dynamicStats.total}</Text>
                <Text style={styles.statLbl}>Total</Text>
              </View>
            </View>

            {/* Present / Absent Toggle */}
            <View style={styles.tabRow}>
              <TouchableOpacity 
                style={[styles.tabBtn, viewTab === 'present' && styles.tabBtnActiveGreen]}
                onPress={() => setViewTab('present')}
              >
                <CheckCircle size={16} color={viewTab === 'present' ? 'white' : '#10B981'} {...({} as any)} />
                <Text style={[styles.tabBtnText, viewTab === 'present' && styles.tabBtnTextActive]}>
                  Came to School
                </Text>
                <View style={[styles.tabBadge, viewTab === 'present' ? styles.tabBadgeActiveGreen : styles.tabBadgeGreen]}>
                  <Text style={[styles.tabBadgeText, viewTab === 'present' && styles.tabBadgeTextActive]}>
                    {presentInSchool.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabBtn, viewTab === 'absent' && styles.tabBtnActiveRed]}
                onPress={() => setViewTab('absent')}
              >
                <XCircle size={16} color={viewTab === 'absent' ? 'white' : '#EF4444'} {...({} as any)} />
                <Text style={[styles.tabBtnText, viewTab === 'absent' && styles.tabBtnTextActive]}>
                  Did Not Come
                </Text>
                <View style={[styles.tabBadge, viewTab === 'absent' ? styles.tabBadgeActiveRed : styles.tabBadgeRed]}>
                  <Text style={[styles.tabBadgeText, viewTab === 'absent' && styles.tabBadgeTextActive]}>
                    {notInSchool.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Class Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.chipScroll}
              style={{ marginBottom: 6 }}
            >
              <TouchableOpacity 
                style={[styles.chip, !selectedClass && styles.activeChip]}
                onPress={() => handleClassChange(undefined)}
              >
                <Text style={[styles.chipText, !selectedClass && styles.activeChipText]}>All Classes</Text>
              </TouchableOpacity>
              {classes.map(cls => (
                <TouchableOpacity 
                  key={cls} 
                  style={[styles.chip, selectedClass === cls && styles.activeChip]}
                  onPress={() => handleClassChange(cls)}
                >
                  <Text style={[styles.chipText, selectedClass === cls && styles.activeChipText]}>{cls}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Section Filter */}
            {sections.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.chipScroll}
                style={{ marginBottom: 10 }}
              >
                <TouchableOpacity 
                  style={[styles.sectionChip, !selectedSection && styles.activeSectionChip]}
                  onPress={() => setSelectedSection(undefined)}
                >
                  <Text style={[styles.sectionChipText, !selectedSection && styles.activeSectionChipText]}>All Sections</Text>
                </TouchableOpacity>
                {sections.map(sec => (
                  <TouchableOpacity 
                    key={sec} 
                    style={[styles.sectionChip, selectedSection === sec && styles.activeSectionChip]}
                    onPress={() => setSelectedSection(sec)}
                  >
                    <Text style={[styles.sectionChipText, selectedSection === sec && styles.activeSectionChipText]}>Sec {sec}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* If class and section not selected, show placeholder */}
            {needsSelection ? (
              <View style={styles.emptyState}>
                <HelpCircle size={36} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.emptyTitle}>Select Class & Section</Text>
                <Text style={styles.emptySubtitle}>
                  Please choose a class and section from the filters above to manage canteen attendance.
                </Text>
              </View>
            ) : (
              <>
                {/* Student count header */}
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {viewTab === 'present' ? (
                      <CheckSquare size={16} color="#10B981" {...({} as any)} />
                    ) : (
                      <XSquare size={16} color="#EF4444" {...({} as any)} />
                    )}
                    <Text style={styles.sectionTitle}>
                      {viewTab === 'present' ? 'Students in School' : 'Students Not in School'}
                    </Text>
                  </View>
                  <Text style={styles.sectionCount}>{displayStudents.length} entries</Text>
                </View>

                {displayStudents.length === 0 && (
                  <View style={styles.emptyState}>
                    {viewTab === 'present' ? (
                      <Users size={36} color={theme.colors.textMuted} {...({} as any)} />
                    ) : (
                      <PartyPopper size={36} color="#10B981" {...({} as any)} />
                    )}
                    <Text style={styles.emptyTitle}>
                      {viewTab === 'present' ? 'No Students Present' : 'All Students Came Today!'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {viewTab === 'present' 
                        ? 'No students marked present in morning attendance' 
                        : 'Every student is present in school today 🎉'}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (needsSelection) return null;

          const status = (localSelections[item.id] || item.canteenStatus) as string;
          const isPermitted = status === 'permitted';
          const isAbsent = status === 'absent';
          const isIllegal = status === 'illegal';
          const isUnverified = status === 'unverified';
          const isAbsentFromSchool = item.schoolPresence === 'absent_school' || item.schoolPresence === 'no_record';

          return (
            <View style={[
              styles.card, 
              isAbsentFromSchool && styles.cardAbsentSchool,
              isClassLocked && styles.cardLocked
            ]}>
              {/* Card Header: Badges & Online Status */}
              <View style={styles.cardHeader}>
                <View style={styles.statusIndicator}>
                  <View style={[
                    styles.pulseDot, 
                    { backgroundColor: isAbsentFromSchool ? '#EF4444' : '#10B981' }
                  ]} />
                  <Text style={[
                    styles.statusText, 
                    { color: isAbsentFromSchool ? '#EF4444' : '#10B981' }
                  ]}>
                    {isAbsentFromSchool ? 'Not in School' : 'In School'}
                  </Text>
                </View>

                {isClassLocked && (
                  <View style={styles.lockedBadge}>
                    <Lock size={10} color="#64748B" {...({} as any)} />
                    <Text style={styles.lockedText}>Finalized</Text>
                  </View>
                )}
              </View>

              {/* Student Main Info */}
              <View style={styles.studentMainInfo}>
                <View style={styles.avatarContainer}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={[
                      styles.avatar,
                      isAbsentFromSchool && styles.avatarGrayscale,
                    ]} />
                  ) : (
                    <View style={[
                      styles.avatarFallback,
                      isAbsentFromSchool && { backgroundColor: '#FEE2E2' },
                    ]}>
                      <User size={22} color={isAbsentFromSchool ? '#EF4444' : '#CBD5E1'} {...({} as any)} />
                    </View>
                  )}
                </View>

                <View style={styles.infoContent}>
                  <Text style={[styles.studentName, isAbsentFromSchool && styles.textMuted]} numberOfLines={1}>
                    {item.name || 'Unknown Student'}
                  </Text>
                  <View style={styles.metadataRow}>
                    <Text style={styles.metaLabel}>ID:</Text>
                    <Text style={styles.metaValue}>{item.roll}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.metaValue}>{item.className}</Text>
                    <Text style={styles.metaSlash}>/</Text>
                    <Text style={styles.metaValue}>{item.section}</Text>
                  </View>
                </View>
              </View>

              {/* Verification Actions */}
              <View style={styles.verificationRow}>
                <TouchableOpacity 
                  style={[
                    styles.verifyBtn, 
                    isPermitted && styles.verifyBtnPermitted,
                    isClassLocked && !isPermitted && styles.verifyBtnDisabled
                  ]}
                  onPress={() => setStatus(item.id, 'permitted')}
                  disabled={isClassLocked}
                >
                  <ShieldCheck size={16} color={isPermitted ? 'white' : '#10B981'} {...({} as any)} />
                  <Text style={[styles.verifyBtnText, isPermitted && styles.textWhite]}>Permit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.verifyBtn, 
                    isAbsent && styles.verifyBtnAbsent,
                    isClassLocked && !isAbsent && styles.verifyBtnDisabled
                  ]}
                  onPress={() => setStatus(item.id, 'absent')}
                  disabled={isClassLocked}
                >
                  <ShieldX size={16} color={isAbsent ? 'white' : '#EF4444'} {...({} as any)} />
                  <Text style={[styles.verifyBtnText, isAbsent && styles.textWhite]}>Absent</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.verifyBtn, 
                    isIllegal && styles.verifyBtnIllegal,
                    isClassLocked && !isIllegal && styles.verifyBtnDisabled
                  ]}
                  onPress={() => setStatus(item.id, 'illegal')}
                  disabled={isClassLocked}
                >
                  <AlertTriangle size={16} color={isIllegal ? 'white' : '#F97316'} {...({} as any)} />
                  <Text style={[styles.verifyBtnText, isIllegal && styles.textWhite]}>Illegal</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Footer (Only show if class and section are selected) */}
      {!needsSelection && (
        <View style={styles.footer}>
          {!isClassLocked ? (
            <TouchableOpacity style={styles.closeBtn} onPress={handleCloseDay}>
              <Lock size={16} color="white" {...({} as any)} />
              <Text style={styles.closeBtnText}>Submit & Close {selectedClass} {selectedSection}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.closeBtn, { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1', borderWidth: 1 }]}>
              <CheckCircle size={16} color="#64748B" {...({} as any)} />
              <Text style={[styles.closeBtnText, { color: '#64748B' }]}>Day Closed for {selectedClass} {selectedSection}</Text>
            </View>
          )}
        </View>
      )}

      {/* Submit Confirmation Modal */}
      <Modal
        visible={showSubmitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Lock size={24} color={theme.colors.primary} {...({} as any)} />
              </View>
              <Text style={styles.modalTitle}>Submit & Close Day</Text>
              <Text style={styles.modalDesc}>Finalize all meal records for today. This action cannot be undone.</Text>
            </View>

            <View style={styles.modalStats}>
              <View style={styles.modalStatRow}>
                <View style={[styles.modalStatIcon, { backgroundColor: '#ECFDF5' }]}>
                  <CheckCircle size={18} color="#10B981" {...({} as any)} />
                </View>
                <Text style={styles.modalStatLabel}>Present</Text>
                <Text style={styles.modalStatValue}>{dynamicStats.permitted}</Text>
              </View>
              
              <View style={styles.modalStatRow}>
                <View style={[styles.modalStatIcon, { backgroundColor: '#FEF2F2' }]}>
                  <XCircle size={18} color="#EF4444" {...({} as any)} />
                </View>
                <Text style={styles.modalStatLabel}>Absent</Text>
                <Text style={styles.modalStatValue}>{dynamicStats.absent}</Text>
              </View>

              <View style={styles.modalStatRow}>
                <View style={[styles.modalStatIcon, { backgroundColor: '#FFF7ED' }]}>
                  <ShieldAlert size={18} color="#F97316" {...({} as any)} />
                </View>
                <Text style={styles.modalStatLabel}>Illegal Entry</Text>
                <Text style={styles.modalStatValue}>{dynamicStats.illegal}</Text>
              </View>

              <View style={styles.modalStatRow}>
                <View style={[styles.modalStatIcon, { backgroundColor: '#F1F5F9' }]}>
                  <Clock size={18} color="#64748B" {...({} as any)} />
                </View>
                <Text style={styles.modalStatLabel}>Unverified</Text>
                <Text style={styles.modalStatValue}>{dynamicStats.unverified}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSubmitModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitAll}>
                <Text style={styles.modalSubmitText}>Finalize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success/Error/Warning Status Modal */}
      <Modal
        visible={!!statusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', paddingVertical: 32 }]}>
            <View style={[
              styles.modalIconWrap, 
              statusModal?.type === 'success' ? { backgroundColor: '#ECFDF5' } : 
              statusModal?.type === 'error' ? { backgroundColor: '#FEF2F2' } : 
              { backgroundColor: '#FFF7ED' } // warning
            ]}>
              {statusModal?.type === 'success' && <CheckCircle size={28} color="#10B981" {...({} as any)} />}
              {statusModal?.type === 'error' && <XCircle size={28} color="#EF4444" {...({} as any)} />}
              {statusModal?.type === 'warning' && <ShieldAlert size={28} color="#F97316" {...({} as any)} />}
            </View>
            <Text style={[styles.modalTitle, { fontSize: 22, marginTop: 8 }]}>{statusModal?.title}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 24, fontSize: 14 }]}>{statusModal?.message}</Text>
            
            <TouchableOpacity 
              style={[
                { 
                  width: '100%', 
                  paddingVertical: 16, 
                  borderRadius: 14, 
                  alignItems: 'center',
                  justifyContent: 'center'
                },
                statusModal?.type === 'success' ? { backgroundColor: '#10B981' } : 
                statusModal?.type === 'error' ? { backgroundColor: '#EF4444' } : 
                { backgroundColor: '#F97316' }
              ]} 
              onPress={() => setStatusModal(null)}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Greeting
  greeting: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 12,
    paddingBottom: 16,
  },
  greetTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  greetSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, fontWeight: '500' },

  // Stats
  statsStrip: { 
    flexDirection: 'row', 
    marginHorizontal: 16, 
    backgroundColor: 'white', 
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statPill: { flex: 1, alignItems: 'center' },
  statDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  statNum: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  statLbl: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600', marginTop: 1 },
  statDivider: { width: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActiveGreen: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabBtnActiveRed: { backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabBtnTextActive: { color: 'white' },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  tabBadgeGreen: { backgroundColor: '#E2E8F0' },
  tabBadgeActiveGreen: { backgroundColor: '#059669' },
  tabBadgeRed: { backgroundColor: '#E2E8F0' },
  tabBadgeActiveRed: { backgroundColor: '#DC2626' },
  tabBadgeText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  tabBadgeTextActive: { color: 'white' },

  // Filters
  chipScroll: { paddingHorizontal: 16, gap: 6 },
  chip: { 
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, 
    backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0',
  },
  activeChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  activeChipText: { color: 'white' },
  sectionChip: { 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, 
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  activeSectionChip: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  sectionChipText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
  activeSectionChipText: { color: 'white' },

  // List Header
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sectionCount: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '500' },

  // Student Cards
  list: { paddingBottom: 100 },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardAbsentSchool: {
    backgroundColor: '#FFFBFB',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  // Student Info
  studentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9',
  },
  avatarGrayscale: { opacity: 0.5 },
  avatarFallback: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', 
    justifyContent: 'center', alignItems: 'center',
  },
  onlineDot: { 
    position: 'absolute', bottom: 0, right: 0, 
    width: 12, height: 12, borderRadius: 6, 
    backgroundColor: '#10B981', borderWidth: 2, borderColor: 'white',
  },
  offlineDot: { 
    position: 'absolute', bottom: 0, right: 0, 
    width: 12, height: 12, borderRadius: 6, 
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: 'white',
  },
  studentDetails: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
  cardNameMuted: { color: '#94A3B8' },
  didNotComeBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  didNotComeText: { fontSize: 9, fontWeight: '700', color: '#EF4444' },
  inSchoolBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  inSchoolText: { fontSize: 9, fontWeight: '700', color: '#10B981' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: '#94A3B8' },
  metaSep: { fontSize: 11, color: '#CBD5E1' },
  metaClass: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },

  // Action Buttons
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5,
  },
  actionText: { fontSize: 11, fontWeight: '700' },
  actionTextActive: { color: 'white' },
  presentBtn: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  presentBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  presentText: { color: '#10B981' },
  absentBtn: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  absentBtnActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  absentText: { color: '#EF4444' },
  illegalBtn: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  illegalBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  illegalText: { color: '#F97316' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, textAlign: 'center' },

  // Footer
  footer: { 
    padding: 16, paddingBottom: 20, backgroundColor: 'white', 
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  closeBtn: { 
    backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 15, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  closeBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: 'white', width: '100%', borderRadius: 24, padding: 24, paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalIconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
  modalDesc: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
  modalStats: {
    backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, gap: 12, marginBottom: 24,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  modalStatRow: { flexDirection: 'row', alignItems: 'center' },
  modalStatIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalStatLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  modalStatValue: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center'
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  modalSubmitBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center'
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: 'white' },

  // Premium Card Styles
  cardLocked: {
    backgroundColor: '#F8FAFC',
    opacity: 0.9,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  studentMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  textMuted: {
    color: '#94A3B8',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
  metaSlash: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 1,
  },
  verificationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  verifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifyBtnPermitted: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  verifyBtnAbsent: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  verifyBtnIllegal: {
    backgroundColor: '#F97316',
    borderColor: '#EA580C',
  },
  verifyBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.5,
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  textWhite: {
    color: 'white',
  },
});
