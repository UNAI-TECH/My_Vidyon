import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { 
  GraduationCap, 
  Search, 
  Settings2, 
  BookOpen, 
  Plus, 
  X,
  ChevronRight,
  ChevronDown,
  Check,
  Trash2,
  UserX
} from 'lucide-react-native';
import { Badge } from '../../../../src/components/common/Badge';
import { compareClasses, compareSections } from '../../../../src/utils/classUtils';

export default function FacultyAssigningScreen() {
  const { institutionId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; style?: 'cancel' | 'destructive'; onPress: () => void }[];
  } | null>(null);
  
  const { 
    classes, 
    staff, 
    subjects, 
    assignments, 
    isLoading, 
    assignStaff, 
    assignClassTeacher 
  } = useInstitutionFaculty(institutionId);

  const groupedClasses = useMemo(() => {
    const filtered = classes.filter((c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, any[]> = {};
    filtered.forEach((c: any) => {
      if (!groups[c.name]) groups[c.name] = [];
      groups[c.name].push(c);
    });

    // Ensure sections within each class group are strictly ordered (A -> B -> C -> D)
    Object.values(groups).forEach(list => list.sort((a, b) => compareSections(a.section, b.section)));

    // Ensure class standards follow official onboarding sequence (Pre-KG -> 12th Standard)
    return Object.entries(groups).sort((a, b) => {
      const classObjA = a[1]?.[0] || a[0];
      const classObjB = b[1]?.[0] || b[0];
      return compareClasses(classObjA, classObjB);
    });
  }, [classes, searchQuery]);

  const handleEdit = (cls: any) => {
    setSelectedClass(cls);
    setIsModalOpen(true);
  };

  const renderClassCard = (cls: any) => {
    const classTeacherAssignment = (assignments as any[]).find((a: any) => 
      a.class_id === cls.id && a.section === cls.section && a.assignment_type === 'class_teacher'
    );
    const classTeacher = (staff as any[]).find((s: any) => s.id === classTeacherAssignment?.faculty_profile_id);

    const subjectAssignments = (assignments as any[]).filter((a: any) => 
      a.class_id === cls.id && a.section === cls.section && a.assignment_type === 'subject_staff'
    );
    const assignedSubjectCount = new Set(subjectAssignments.map((a: any) => a.subject_id)).size;

    return (
      <TouchableOpacity 
        key={`${cls.id}-${cls.section}`} 
        style={styles.classCard}
        onPress={() => handleEdit(cls)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionText}>Section {cls.section}</Text>
            <Text style={styles.classNameSub}>{cls.name}</Text>
          </View>
          <Settings2 size={18} color={theme.colors.primary} {...({} as any)} />
        </View>

        <View style={styles.teacherIndicator}>
          <GraduationCap size={14} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.teacherLabel}>Class Teacher:</Text>
          <Text style={[styles.teacherName, !classTeacher && styles.unassigned]}>
            {classTeacher ? (classTeacher as any).full_name : 'Unassigned'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.stat}>
            <BookOpen size={12} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.statText}>{assignedSubjectCount} Subjects</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textMuted} {...({} as any)} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Faculty Assigning" 
        subtitle="Manage class teachers & subjects" 
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.colors.textMuted} {...({} as any)} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search class or section..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {groupedClasses.map(([name, sections]) => (
            <View key={name} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <View style={styles.groupIcon}>
                  <Text style={styles.groupIconText}>{(name.replace(/\D/g, '') || name[0])}</Text>
                </View>
                <Text style={styles.groupTitle}>{name}</Text>
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>{sections.length} Sections</Text>
                </View>
              </View>
              <View style={styles.grid}>
                {sections.map(cls => renderClassCard(cls))}
              </View>
            </View>
          ))}
          {groupedClasses.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No classes found matching search</Text>
            </View>
          )}
        </ScrollView>
      )}

      {selectedClass && (
        <AssignmentModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cls={selectedClass}
          staff={staff}
          subjects={subjects}
          assignments={assignments}
          classes={classes}
          onAssignStaff={assignStaff}
          onAssignClassTeacher={assignClassTeacher}
          setAlertConfig={setAlertConfig}
        />
      )}

      {/* Unified Alert Modal */}
      <Modal
        visible={!!alertConfig?.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertConfig(null)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alertConfig?.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig?.message}</Text>
            <View style={styles.alertActions}>
              {alertConfig?.buttons.map((btn, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.alertBtn, 
                    btn.style === 'cancel' ? styles.alertCancelBtn : styles.alertPrimaryBtn,
                    alertConfig.buttons.length > 1 && { flex: 1 }
                  ]}
                  onPress={() => {
                    btn.onPress();
                    setAlertConfig(null);
                  }}
                >
                  <Text style={[
                      styles.alertBtnText,
                      btn.style === 'cancel' ? styles.alertCancelBtnText : { color: 'white' }
                  ]}>{btn.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AssignmentModal({ isOpen, onClose, cls, staff, subjects, assignments, classes, onAssignStaff, onAssignClassTeacher, setAlertConfig }: any) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectionModal, setSelectionModal] = useState<{ isOpen: boolean, subject: any, assignedIds: string[] }>({
    isOpen: false,
    subject: null,
    assignedIds: []
  });

  const getCleanName = (name: any) => {
    if (typeof name === 'string' && name.startsWith('{')) {
      try {
        const parsed = JSON.parse(name);
        return parsed.name || 'Unknown Class';
      } catch (e) {
        return name;
      }
    }
    return typeof name === 'string' ? name : 'Unknown Class';
  };
  
  // Current assignments for this specific class/section
  const classTeacherId = assignments.find((a: any) => 
    a.class_id === cls.id && a.section === cls.section && a.assignment_type === 'class_teacher'
  )?.faculty_profile_id;

  const currentClassTitle = `${getCleanName(cls.name)} - ${cls.section}`;

  const currentSubjectAssignments = assignments.filter((a: any) => 
    a.class_id === cls.id && a.section === cls.section && a.assignment_type === 'subject_staff'
  );

  const parseSubjectClassAndSection = (subClassName: string) => {
    if (!subClassName) return { className: '', section: null };
    const trimmed = subClassName.trim();

    // Pattern 1: "10th Standard - Sec A" or "10th Standard - Section A"
    const secMatch1 = trimmed.match(/^(.*?)\s*-\s*sec(?:tion)?\s*([a-z0-9]+)$/i);
    if (secMatch1) {
      return { className: secMatch1[1].trim(), section: secMatch1[2].trim().toUpperCase() };
    }

    // Pattern 2: "10th Standard - A"
    const secMatch2 = trimmed.match(/^(.*?)\s*-\s*([a-z0-9]+)$/i);
    if (secMatch2) {
      return { className: secMatch2[1].trim(), section: secMatch2[2].trim().toUpperCase() };
    }

    // Pattern 3: "10th Standard (A)" or "10th Standard (Sec A)"
    const secMatch3 = trimmed.match(/^(.*?)\s*\(\s*(?:sec(?:tion)?\s*)?([a-z0-9]+)\s*\)$/i);
    if (secMatch3) {
      return { className: secMatch3[1].trim(), section: secMatch3[2].trim().toUpperCase() };
    }

    return { className: trimmed, section: null };
  };

  const normalizeClassName = (name: string) => {
    return (name || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isClassNameMatch = (subClassName: string, targetClassName: string) => {
    const sNorm = normalizeClassName(subClassName);
    const tNorm = normalizeClassName(targetClassName);

    if (!sNorm || !tNorm) return false;
    if (sNorm === tNorm) return true;

    // Fuzzy check: strip words like "standard", "grade", "class", "std"
    const strip = (str: string) => str.replace(/\b(standard|grade|class|std)\b/gi, '').replace(/[^a-z0-9]/gi, '').trim();
    const sStripped = strip(sNorm);
    const tStripped = strip(tNorm);

    if (sStripped && tStripped && sStripped === tStripped) {
      return true;
    }

    return false;
  };

  const isSubjectForClassAndSection = (sub: any, targetCls: any) => {
    if (!sub || !targetCls) return false;

    // 1. If subject is already assigned to this class and section, always include it
    const isAssignedHere = currentSubjectAssignments.some((a: any) => a.subject_id === sub.id);
    if (isAssignedHere) return true;

    const rawSubClassName = sub.class_name ? String(sub.class_name).trim() : '';
    if (!rawSubClassName) {
      // Subject without class_name might be a common/global subject
      return true;
    }

    const { className: parsedClass, section: parsedSection } = parseSubjectClassAndSection(rawSubClassName);
    const cleanTargetClass = getCleanName(targetCls.name);

    // Check if class name matches
    if (!isClassNameMatch(parsedClass, cleanTargetClass)) {
      return false;
    }

    // If subject has a specific section designation (e.g. Sec B)
    if (parsedSection) {
      const targetSection = (targetCls.section || 'A').toString().trim().toUpperCase();
      return parsedSection === targetSection;
    }

    // Common to all sections of this class
    return true;
  };

  const classSubjects = useMemo(() => {
    if (!cls || !Array.isArray(subjects)) return [];

    // 1. Filter subjects matching this class & section
    const matching = subjects.filter((sub: any) => isSubjectForClassAndSection(sub, cls));

    // 2. If no subjects matched class_name specifically, check if any subjects in the DB have class_name
    const anySubjectHasClassName = subjects.some((s: any) => Boolean(s.class_name?.trim()));
    const candidates = (matching.length > 0 || anySubjectHasClassName) ? matching : subjects;

    // 3. Deduplicate by subject name so multiple duplicate rows collapse into one
    const uniqueByName = new Map<string, any>();
    for (const sub of candidates) {
      const key = (sub.name || '').trim().toLowerCase();
      if (!uniqueByName.has(key)) {
        uniqueByName.set(key, sub);
      } else {
        // If current candidate is actively assigned in this class and the stored one is not, prioritize the assigned one
        const currentIsAssigned = currentSubjectAssignments.some((a: any) => a.subject_id === sub.id);
        const storedIsAssigned = currentSubjectAssignments.some((a: any) => a.subject_id === uniqueByName.get(key).id);
        if (currentIsAssigned && !storedIsAssigned) {
          uniqueByName.set(key, sub);
        }
      }
    }

    return Array.from(uniqueByName.values());
  }, [subjects, cls, currentSubjectAssignments]);

  const handleUpdateTeacher = async (teacherId: string) => {
    if (teacherId === 'unassigned') {
      setIsSaving(true);
      try {
        await onAssignClassTeacher(cls.id, cls.section, '');
      } catch (e) {
        setAlertConfig({
          visible: true,
          title: "Error",
          message: "Failed to update class teacher",
          buttons: [{ text: "OK", onPress: () => {} }]
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Check if teacher is already assigned elsewhere
    const existing = assignments.find((a: any) => 
      a.faculty_profile_id === teacherId && 
      a.assignment_type === 'class_teacher' &&
      (a.class_id !== cls.id || a.section !== cls.section)
    );

    if (existing) {
      const staffName = staff.find((s: any) => s.id === teacherId)?.full_name || 'This faculty';
      const classInfo = classes.find((c: any) => c.id === existing.class_id);
      const className = classInfo ? getCleanName(classInfo.name) : 'another class';
      
      setAlertConfig({
        visible: true,
        title: "Transfer Class Teacher",
        message: `${staffName} is already the class teacher for ${className} - ${existing.section}. Do you want to transfer them to ${currentClassTitle}?`,
        buttons: [
          { text: "Cancel", style: 'cancel', onPress: () => {} },
          { 
            text: "Transfer", 
            onPress: async () => {
              setIsSaving(true);
              try {
                await onAssignClassTeacher(cls.id, cls.section, teacherId);
              } catch (e) {
                setAlertConfig({
                  visible: true,
                  title: "Error",
                  message: "Failed to update class teacher",
                  buttons: [{ text: "OK", onPress: () => {} }]
                });
              } finally {
                setIsSaving(false);
              }
            }
          }
        ]
      });
    } else {
      setIsSaving(true);
      try {
        await onAssignClassTeacher(cls.id, cls.section, teacherId);
      } catch (e) {
        setAlertConfig({
          visible: true,
          title: "Error",
          message: "Failed to update class teacher",
          buttons: [{ text: "OK", onPress: () => {} }]
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUpdateSubject = async (subId: string, staffIds: string[]) => {
    setIsSaving(true);
    try {
      await onAssignStaff(cls.id, cls.section, subId, staffIds);
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: "Error",
        message: e?.message || "Failed to update subject faculty",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const openSelection = (sub: any, assignedIds: string[]) => {
    setSelectionModal({
      isOpen: true,
      subject: sub,
      assignedIds: assignedIds
    });
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Manage {currentClassTitle}</Text>
              <Text style={styles.modalSub}>Assign faculty and class teacher</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.text} {...({} as any)} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <GraduationCap size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionLabel}>Class Teacher</Text>
              </View>
              <View style={styles.pickerContainer}>
                <FlatListWithSelection 
                  data={staff}
                  selectedId={classTeacherId || 'unassigned'}
                  onSelect={handleUpdateTeacher}
                  placeholder="Select Class Teacher"
                  assignments={assignments}
                  classes={classes}
                  getCleanName={getCleanName}
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionLabel}>Subject Faculty</Text>
              </View>
              
              {classSubjects.length === 0 ? (
                <View style={styles.emptySubjectsBox}>
                  <Text style={styles.emptySubjectsText}>
                    No subjects configured for {currentClassTitle} yet.
                  </Text>
                </View>
              ) : (
                classSubjects.map((sub: any) => {
                  const assigned = currentSubjectAssignments.filter((a: any) => 
                    a.subject_id === sub.id || 
                    subjects.find((s: any) => s.id === a.subject_id)?.name?.trim().toLowerCase() === sub.name?.trim().toLowerCase()
                  );
                  const assignedIds = Array.from(new Set(assigned.map((a: any) => a.faculty_profile_id))) as string[];
                  
                  return (
                    <View key={sub.id} style={styles.subjectAssignmentBlock}>
                      <View style={styles.subjectRow}>
                        <View style={styles.subjectInfo}>
                          <Text style={styles.subjectName}>{sub.name}</Text>
                          <Text style={styles.assignedCount}>{assignedIds.length} assigned</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.assignChip}
                          onPress={() => openSelection(sub, assignedIds)}
                        >
                          <Plus size={14} color={theme.colors.primary} {...({} as any)} />
                          <Text style={styles.assignChipText}>Assign</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {assignedIds.length > 0 && (
                        <View style={styles.assignedStaffList}>
                          {assignedIds.map((facultyId: string) => {
                            const member = staff.find((s: any) => s.id === facultyId);
                            return (
                              <View key={facultyId} style={styles.assignedStaffChip}>
                                <Text style={styles.assignedStaffName} numberOfLines={1}>
                                  {member?.full_name || 'Unknown'}
                                </Text>
                                <TouchableOpacity 
                                  style={styles.unassignMiniBtn}
                                  onPress={() => {
                                    const newIds = assignedIds.filter((id: string) => id !== facultyId);
                                    handleUpdateSubject(sub.id, newIds);
                                  }}
                                >
                                  <X size={12} color="#EF4444" {...({} as any)} />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <StaffSelectionModal 
        isOpen={selectionModal.isOpen}
        onClose={() => setSelectionModal(prev => ({ ...prev, isOpen: false }))}
        subject={selectionModal.subject}
        staff={staff}
        assignedIds={selectionModal.assignedIds}
        onConfirm={async (staffIds: string[]) => {
          if (!selectionModal.subject?.id) return;
          try {
            await handleUpdateSubject(selectionModal.subject.id, staffIds);
            setSelectionModal(prev => ({ ...prev, isOpen: false }));
          } catch (e) {
            // error alert already handled in handleUpdateSubject
          }
        }}
      />
    </Modal>
  );
}

function StaffSelectionModal({ isOpen, onClose, subject, staff, assignedIds, onConfirm }: any) {
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedIds || []);
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(assignedIds || []);
      setQuery('');
      setIsSubmitting(false);
    }
  }, [isOpen, assignedIds]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s: any) => 
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q)
    );
  }, [staff, query]);

  const toggleStaff = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedIds);
    } catch (err) {
      console.error('Failed to confirm staff assignment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.staffSelectionContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Assign to {subject?.name || 'Subject'}</Text>
              <Text style={styles.modalSub}>
                {selectedIds.length === 0 
                  ? '0 staff selected • Tap to select faculty' 
                  : `${selectedIds.length} staff selected`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.text} {...({} as any)} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBar, { marginBottom: 16 }]}>
            <Search size={18} color={theme.colors.textMuted} {...({} as any)} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search faculty name or department..." 
              value={query}
              onChangeText={setQuery}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {filteredStaff.length === 0 ? (
              <View style={styles.emptySelectionBox}>
                <Text style={styles.emptySelectionText}>
                  {query.trim() ? `No faculty found matching "${query}"` : 'No faculty members found.'}
                </Text>
              </View>
            ) : (
              filteredStaff.map((s: any) => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <TouchableOpacity 
                    key={s.id} 
                    style={[styles.selectionItem, isSelected && styles.selectionItemSelected]}
                    onPress={() => toggleStaff(s.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectionItemLeft}>
                      <View style={[styles.avatarMini, isSelected && styles.avatarMiniSelected]}>
                        <Text style={[styles.avatarTextMini, isSelected && styles.avatarTextMiniSelected]}>
                          {(s.full_name?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, isSelected && styles.memberNameSelected]}>
                          {s.full_name || 'Faculty Member'}
                        </Text>
                        <Text style={[styles.deptSub, isSelected && styles.deptSubSelected]}>
                          {s.department ? s.department : 'General'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={[styles.checkboxIndicator, isSelected && styles.checkboxIndicatorSelected]}>
                      {isSelected && (
                        <Check size={14} color="white" strokeWidth={3} {...({} as any)} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { flexDirection: 'row', gap: 12 }]}>
            <TouchableOpacity 
              style={[styles.doneBtn, { flex: 1, backgroundColor: '#F1F5F9' }]} 
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.doneBtnText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.doneBtn, 
                { flex: 1 }, 
                isSubmitting && { opacity: 0.7 },
                selectedIds.length > 0 && styles.confirmActiveBtn
              ]} 
              onPress={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={16} color="white" strokeWidth={2.5} {...({} as any)} />
                  <Text style={styles.doneBtnText}>
                    {selectedIds.length > 0 ? `Confirm (${selectedIds.length})` : 'Confirm'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Helper for simple dropdown simulation on mobile
function FlatListWithSelection({ data, selectedId, onSelect, placeholder, assignments, classes, getCleanName }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = data.find((d: any) => d.id === selectedId);

  return (
    <View>
      <TouchableOpacity 
        style={styles.dropdown} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[styles.dropdownText, !selected && styles.unassigned]}>
          {selected ? selected.full_name : placeholder}
        </Text>
        <ChevronDown size={16} color={theme.colors.textMuted} {...({} as any)} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownList}>
          <TouchableOpacity 
            style={[styles.dropdownItem, { backgroundColor: '#FEF2F2' }]} 
            onPress={() => { onSelect('unassigned'); setIsOpen(false); }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <UserX size={16} color="#EF4444" {...({} as any)} />
              <Text style={[styles.unassigned, { color: '#EF4444', fontWeight: 'bold' }]}>Unassign Class Teacher</Text>
            </View>
          </TouchableOpacity>
          {data.map((item: any) => {
            const assignment = assignments?.find((a: any) => a.faculty_profile_id === item.id && a.assignment_type === 'class_teacher');
            const classInfo = assignment ? classes?.find((c: any) => c.id === assignment.class_id) : null;
            const assignmentLabel = classInfo ? `${getCleanName(classInfo.name)} - ${assignment.section}` : null;

            return (
              <TouchableOpacity 
                key={item.id} 
                style={styles.dropdownItem} 
                onPress={() => { onSelect(item.id); setIsOpen(false); }}
              >
                <View>
                  <Text style={styles.dropdownItemText}>{item.full_name}</Text>
                  {assignmentLabel && (
                    <Text style={styles.assignedInfo}>Assigned: {assignmentLabel}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchContainer: { padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.text },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  groupContainer: { marginBottom: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  groupIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  groupIconText: { color: 'white', fontWeight: 'bold' },
  groupTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  groupBadge: { backgroundColor: '#3B82F620', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  groupBadgeText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  classCard: { width: '48%', backgroundColor: 'white', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  classNameSub: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  teacherIndicator: { backgroundColor: '#F1F5F9', padding: 8, borderRadius: 10, marginBottom: 12, gap: 4 },
  teacherLabel: { fontSize: 9, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  teacherName: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  unassigned: { fontStyle: 'italic', color: '#94A3B8' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: theme.colors.textMuted },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.colors.textMuted },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  modalSub: { fontSize: 13, color: theme.colors.textMuted },
  closeBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalSection: { gap: 12, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  pickerContainer: { marginTop: 8 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  dropdownText: { fontSize: 14, color: theme.colors.text },
  dropdownList: { marginTop: 4, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 14, color: theme.colors.text },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 24 },
  emptySubjectsBox: {
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptySubjectsText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  assignedCount: { fontSize: 12, color: theme.colors.textMuted },
  assignChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F610', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  assignChipText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  subjectAssignmentBlock: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  assignedStaffList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  assignedStaffChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4, maxWidth: '48%' },
  assignedStaffName: { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  unassignMiniBtn: { padding: 2 },
  modalFooter: { paddingTop: 20 },
  doneBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
  doneBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  staffSelectionContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%', padding: 24, width: '100%' },
  selectionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  selectionItemSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: theme.colors.secondary,
    borderWidth: 2,
  },
  selectionItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarMini: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(245, 158, 11, 0.12)', justifyContent: 'center', alignItems: 'center' },
  avatarMiniSelected: { backgroundColor: theme.colors.secondary },
  avatarTextMini: { fontSize: 14, fontWeight: 'bold', color: theme.colors.secondary },
  avatarTextMiniSelected: { color: 'white' },
  memberName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  memberNameSelected: { fontWeight: '700', color: '#78350F' },
  deptSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  deptSubSelected: { color: '#B45309' },
  checkboxIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxIndicatorSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  emptySelectionBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySelectionText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  confirmActiveBtn: {
    backgroundColor: theme.colors.secondary,
  },
  
  // Alert Modal Styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, textAlign: 'center' },
  alertMessage: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  alertActions: { width: '100%', gap: 10, flexDirection: 'row', justifyContent: 'center' },
  alertBtn: { height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  alertPrimaryBtn: { backgroundColor: theme.colors.primary },
  alertCancelBtn: { backgroundColor: '#F1F5F9' },
  alertBtnText: { fontSize: 15, fontWeight: '700' },
  alertCancelBtnText: { color: theme.colors.textMuted },
  assignedInfo: { fontSize: 10, color: theme.colors.primary, fontWeight: 'bold', marginTop: 2 },
});
