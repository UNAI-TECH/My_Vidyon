import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Select } from '../../../../src/components/common/Select';
import { FormField } from '../../../../src/components/common/FormField';
import { Badge } from '../../../../src/components/common/Badge';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { useFeeManagement, StudentFeeLedgerItem } from '../../../../src/hooks/useFeeManagement';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import {
  ArrowLeft,
  Gift,
  Plus,
  Award,
  CheckCircle,
  Tag,
  Percent,
  IndianRupee,
  Calendar,
  Layers,
  Calculator,
  User,
} from 'lucide-react-native';

const CONCESSION_CATEGORIES = [
  { label: 'Merit Scholarship', value: 'merit' },
  { label: 'Financial Aid / Need-based', value: 'financial_aid' },
  { label: 'Sibling Discount', value: 'sibling_discount' },
  { label: 'Staff Ward Concession', value: 'staff_child' },
  { label: 'Sports / Co-curricular Waiver', value: 'sports' },
  { label: 'Discretionary Management Waiver', value: 'waiver' },
];

export default function FeeConcessionsScreen() {
  const router = useRouter();
  const { ledgers, loading, terms, grantConcession } = useFeeManagement();
  const { institutionId } = useAuth();
  const { classes: rawClasses = [] } = useInstitutionFaculty(institutionId);

  // Term / Scope tab filter state
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedFeeId, setSelectedFeeId] = useState<string>('');
  const [discountMethod, setDiscountMethod] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [concessionCategory, setConcessionCategory] = useState<string>('merit');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<false | boolean>(false);

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    buttons?: {
      text: string;
      style?: 'primary' | 'secondary' | 'destructive';
      onPress: () => void;
    }[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Extract institution classes
  const availableClasses = useMemo(() => {
    const names = new Set<string>();
    (rawClasses || []).forEach((c: any) => {
      if (c.name) names.add(c.name);
    });
    if (names.size > 0) return Array.from(names);
    return [
      'Pre-KG', 'LKG', 'UKG',
      '1st Standard', '2nd Standard', '3rd Standard', '4th Standard', '5th Standard',
      '6th Standard', '7th Standard', '8th Standard', '9th Standard', '10th Standard',
      '11th Standard', '12th Standard'
    ];
  }, [rawClasses]);

  // Extract sections for selected class
  const availableSections = useMemo(() => {
    const secs = new Set<string>();
    (rawClasses || [])
      .filter((c: any) => c.name === selectedClass)
      .forEach((c: any) => {
        if (c.section) secs.add(c.section);
      });
    if (secs.size > 0) return ['All', ...Array.from(secs)];
    return ['All', 'A', 'B', 'C', 'D'];
  }, [rawClasses, selectedClass]);

  // Set default class when opening modal
  useEffect(() => {
    if (modalVisible && !selectedClass && availableClasses.length > 0) {
      setSelectedClass(availableClasses[0]);
    }
  }, [modalVisible, availableClasses, selectedClass]);

  // Fetch students when Class or Section changes
  useEffect(() => {
    if (!institutionId || !selectedClass) return;

    let isMounted = true;
    async function fetchStudents() {
      try {
        let q = (supabase as any)
          .from('students')
          .select('id, name, register_number, class_name, section')
          .eq('institution_id', institutionId)
          .eq('class_name', selectedClass);

        if (selectedSection && selectedSection !== 'All') {
          q = q.eq('section', selectedSection);
        }

        const { data, error } = await q.order('name', { ascending: true });
        if (!error && data && isMounted) {
          setClassStudents(data);
          if (data.length > 0) {
            setSelectedStudentId(data[0].id);
          } else {
            setSelectedStudentId('');
            setSelectedFeeId('');
          }
        }
      } catch (e) {
        console.warn('Error fetching class students:', e);
      }
    }

    fetchStudents();
    return () => {
      isMounted = false;
    };
  }, [institutionId, selectedClass, selectedSection]);

  // Student active fees listener
  const studentFeeRecords = useMemo(() => {
    if (!selectedStudentId) return [];
    return ledgers.filter((l) => l.student_id === selectedStudentId);
  }, [ledgers, selectedStudentId]);

  // Sync selectedFeeId when studentFeeRecords changes
  useEffect(() => {
    if (studentFeeRecords.length > 0) {
      setSelectedFeeId(studentFeeRecords[0].id);
    } else {
      setSelectedFeeId('');
    }
  }, [studentFeeRecords]);

  // Active fee item calculations
  const activeFeeRecord = useMemo(() => {
    return studentFeeRecords.find((f) => f.id === selectedFeeId) || studentFeeRecords[0];
  }, [studentFeeRecords, selectedFeeId]);

  const activeFeeDue = Number(activeFeeRecord?.amount_due || 0);
  const activeFeePaid = Number(activeFeeRecord?.amount_paid || 0);
  const activeFeeExistingConc = Number(activeFeeRecord?.concession_amount || 0);
  const activeFeeNetPending = Math.max(0, activeFeeDue - activeFeePaid - activeFeeExistingConc);

  // Compute discount amount from value and method
  const computedDiscountAmount = useMemo(() => {
    const rawVal = parseFloat(discountValue) || 0;
    if (rawVal <= 0) return 0;
    if (discountMethod === 'percentage') {
      return Math.round((activeFeeNetPending * rawVal) / 100);
    }
    return rawVal;
  }, [discountMethod, discountValue, activeFeeNetPending]);

  const previewRemainingBalance = Math.max(0, activeFeeNetPending - computedDiscountAmount);

  // Filter concessions list for the main table by Term / Academic Scope
  const allConcessionLedgers = useMemo(() => {
    return ledgers.filter((l) => Number(l.concession_amount || 0) > 0);
  }, [ledgers]);

  const filteredConcessions = useMemo(() => {
    return allConcessionLedgers.filter((item) => {
      if (selectedTermFilter === 'all') return true;
      if (selectedTermFilter === 'academic') {
        return item.scope_type === 'academic' || !item.term_id;
      }
      return item.term_id === selectedTermFilter;
    });
  }, [allConcessionLedgers, selectedTermFilter]);

  // Metrics Bar Summary
  const metrics = useMemo(() => {
    const totalGranted = filteredConcessions.reduce(
      (sum, item) => sum + Number(item.concession_amount || 0),
      0
    );
    const uniqueStudents = new Set(filteredConcessions.map((item) => item.student_id)).size;
    const avgWaiver = uniqueStudents > 0 ? Math.round(totalGranted / uniqueStudents) : 0;
    return { totalGranted, uniqueStudents, avgWaiver };
  }, [filteredConcessions]);

  // Submit Concession
  const handleGrant = async () => {
    if (!selectedFeeId || !activeFeeRecord) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'No fee account selected. Please select a student with an active fee schedule.',
        type: 'error',
      });
      return;
    }

    if (computedDiscountAmount <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid discount amount or percentage greater than zero.',
        type: 'error',
      });
      return;
    }

    if (computedDiscountAmount > activeFeeNetPending) {
      setAlertConfig({
        visible: true,
        title: 'Validation Warning',
        message: `Discount amount (₹${computedDiscountAmount.toLocaleString('en-IN')}) cannot exceed the current pending balance of ₹${activeFeeNetPending.toLocaleString('en-IN')}.`,
        type: 'warning',
      });
      return;
    }

    try {
      setSubmitting(true);
      await grantConcession({
        studentFeeId: selectedFeeId,
        concessionType: concessionCategory,
        amount: computedDiscountAmount,
        percentage: discountMethod === 'percentage' ? parseFloat(discountValue) : undefined,
        reason: reason.trim() || undefined,
      });

      setModalVisible(false);
      setDiscountValue('');
      setReason('');

      const targetStudent = classStudents.find((s) => s.id === selectedStudentId);
      const studentName = targetStudent?.name || activeFeeRecord.student?.name || 'Student';
      const termLabel = activeFeeRecord.term_name || 'Academic Fee';

      setAlertConfig({
        visible: true,
        title: 'Concession Granted Successfully!',
        message: `Applied ₹${computedDiscountAmount.toLocaleString('en-IN')} ${
          discountMethod === 'percentage' ? `(${discountValue}%) ` : ''
        }concession for ${studentName} on ${termLabel}.\n• Remaining Balance: ₹${previewRemainingBalance.toLocaleString('en-IN')}`,
        type: 'success',
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Application Error',
        message: err?.message || 'Failed to apply concession. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns
  const columns: ColumnDef<StudentFeeLedgerItem>[] = [
    {
      key: 'student',
      title: 'Student Details',
      render: (item) => (
        <View>
          <Text style={styles.studentName}>{item.student?.name || 'Unknown'}</Text>
          <Text style={styles.studentSub}>
            Roll: {item.student?.roll_number || item.student?.register_number || 'N/A'} •{' '}
            {item.class_name || item.student?.class_name || '-'}
            {item.student?.section ? ` (${item.student.section})` : ''}
          </Text>
        </View>
      ),
    },
    {
      key: 'term',
      title: 'Term / Scope',
      render: (item) => {
        const isTerm = item.term_id && item.scope_type !== 'academic';
        return (
          <View style={{ alignItems: 'flex-start', gap: 2 }}>
            <Badge variant={isTerm ? 'default' : 'info'}>
              {item.term_name || (isTerm ? 'Term Fee' : 'Academic Year')}
            </Badge>
            {item.fee_structure?.name ? (
              <Text style={styles.feeSubName} numberOfLines={1}>
                {item.fee_structure.name}
              </Text>
            ) : null}
          </View>
        );
      },
    },
    {
      key: 'category',
      title: 'Category',
      render: (item) => {
        const conc = item.concessions?.[0];
        const catKey = conc?.concession_type || 'scholarship';
        const matched = CONCESSION_CATEGORIES.find((c) => c.value === catKey);
        const label = matched ? matched.label : catKey.replace(/_/g, ' ').toUpperCase();
        return <Badge variant="info">{label}</Badge>;
      },
    },
    {
      key: 'amount_due',
      title: 'Invoiced (₹)',
      align: 'right',
      render: (item) => (
        <Text style={styles.numText}>₹{Number(item.amount_due || 0).toLocaleString('en-IN')}</Text>
      ),
    },
    {
      key: 'concession',
      title: 'Concession (₹)',
      align: 'right',
      render: (item) => {
        const conc = item.concessions?.[0];
        return (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.numText, { color: theme.colors.primary, fontWeight: '800' }]}>
              ₹{Number(item.concession_amount || 0).toLocaleString('en-IN')}
            </Text>
            {conc?.percentage ? (
              <Text style={styles.percentageBadgeText}>{conc.percentage}% off</Text>
            ) : null}
          </View>
        );
      },
    },
    {
      key: 'paid',
      title: 'Paid (₹)',
      align: 'right',
      render: (item) => (
        <Text style={[styles.numText, { color: theme.colors.accent || '#10B981' }]}>
          ₹{Number(item.amount_paid || 0).toLocaleString('en-IN')}
        </Text>
      ),
    },
    {
      key: 'balance',
      title: 'Remaining (₹)',
      align: 'right',
      render: (item) => {
        const bal =
          item.balance ??
          Math.max(
            0,
            Number(item.amount_due || 0) -
              Number(item.amount_paid || 0) -
              Number(item.concession_amount || 0)
          );
        return (
          <Text
            style={[
              styles.numText,
              { color: bal > 0 ? '#EF4444' : theme.colors.textMuted, fontWeight: '700' },
            ]}
          >
            ₹{bal.toLocaleString('en-IN')}
          </Text>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (item) => {
        const bal =
          item.balance ??
          Math.max(
            0,
            Number(item.amount_due || 0) -
              Number(item.amount_paid || 0) -
              Number(item.concession_amount || 0)
          );
        const variant =
          bal <= 0 ? 'success' : Number(item.amount_paid || 0) > 0 ? 'warning' : 'destructive';
        const label =
          bal <= 0 ? 'PAID' : Number(item.amount_paid || 0) > 0 ? 'PARTIAL' : 'PENDING';
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Concessions & Waivers"
        subtitle="Manage academic scholarships, sibling discounts, and term-wise fee waivers"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          <Button
            title="Grant Concession"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={() => setModalVisible(true)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Metric Summary Cards */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconBox}>
              <Gift size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.metricLabel}>Total Concessions Granted</Text>
              <Text style={styles.metricVal}>₹{metrics.totalGranted.toLocaleString('en-IN')}</Text>
              <Text style={styles.metricSub}>All active waivers applied</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Award size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Beneficiary Students</Text>
              <Text style={[styles.metricVal, { color: '#10B981' }]}>{metrics.uniqueStudents}</Text>
              <Text style={styles.metricSub}>Students receiving waivers</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Calculator size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.metricLabel}>Average Waiver</Text>
              <Text style={[styles.metricVal, { color: '#3B82F6' }]}>
                ₹{metrics.avgWaiver.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.metricSub}>Per beneficiary student</Text>
            </View>
          </View>
        </View>

        {/* Term / Academic Scope Filter Tabs */}
        <View style={styles.termTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.termTabsList}
          >
            <TouchableOpacity
              style={[
                styles.termChip,
                selectedTermFilter === 'all' && styles.termChipActive,
              ]}
              onPress={() => setSelectedTermFilter('all')}
            >
              <Text
                style={[
                  styles.termChipText,
                  selectedTermFilter === 'all' && styles.termChipTextActive,
                ]}
              >
                All Concessions ({allConcessionLedgers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.termChip,
                selectedTermFilter === 'academic' && styles.termChipActive,
              ]}
              onPress={() => setSelectedTermFilter('academic')}
            >
              <Text
                style={[
                  styles.termChipText,
                  selectedTermFilter === 'academic' && styles.termChipTextActive,
                ]}
              >
                Academic (Annual) (
                {
                  allConcessionLedgers.filter(
                    (l) => l.scope_type === 'academic' || !l.term_id
                  ).length
                }
                )
              </Text>
            </TouchableOpacity>

            {terms.map((t) => {
              const count = allConcessionLedgers.filter((l) => l.term_id === t.id).length;
              const isSelected = selectedTermFilter === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.termChip, isSelected && styles.termChipActive]}
                  onPress={() => setSelectedTermFilter(t.id)}
                >
                  <Text
                    style={[
                      styles.termChipText,
                      isSelected && styles.termChipTextActive,
                    ]}
                  >
                    {t.term_name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Concessions Data Table */}
        <View style={styles.tableCard}>
          <DataTable
            columns={columns}
            data={filteredConcessions}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Search students with concessions..."
            searchKeys={[
              'student.name',
              'student.roll_number',
              'student.register_number',
              'class_name',
              'term_name',
            ]}
            loading={loading}
            emptyTitle="No Concessions in this Period"
            emptyDescription="No fee concessions or waivers recorded for the selected term or scope."
          />
        </View>
      </ScrollView>

      {/* Grant Concession Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Grant Fee Concession</Text>
                <Text style={styles.modalSubtitle}>
                  Apply academic scholarship or term-wise fee waiver to student
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Step 1 & 2: Class & Section Selectors */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Class / Standard *"
                    options={availableClasses.map((cName) => ({
                      label: cName,
                      value: cName,
                    }))}
                    value={selectedClass}
                    onSelect={(val) => {
                      setSelectedClass(val as string);
                      setSelectedSection('All');
                    }}
                  />
                </View>

                <View style={{ width: 130 }}>
                  <Select
                    label="Section *"
                    options={availableSections.map((sec) => ({
                      label: sec === 'All' ? 'All Sections' : `Section ${sec}`,
                      value: sec,
                    }))}
                    value={selectedSection}
                    onSelect={(val) => setSelectedSection(val as string)}
                  />
                </View>
              </View>

              {/* Step 3: Student Selector */}
              <View style={{ marginBottom: 12 }}>
                <Select
                  label="Select Enrolled Student *"
                  options={
                    classStudents.length > 0
                      ? classStudents.map((s) => ({
                          label: `${s.name} (${s.register_number || s.roll_number || 'N/A'})${
                            s.section ? ` • Sec ${s.section}` : ''
                          }`,
                          value: s.id,
                        }))
                      : [{ label: 'No students found in selected class', value: '' }]
                  }
                  value={selectedStudentId}
                  onSelect={(val) => setSelectedStudentId(val as string)}
                />
              </View>

              {/* Step 4: Fee Schedule & Pending Due Listener */}
              {Boolean(selectedStudentId) ? (
                studentFeeRecords.length === 0 ? (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeTitle}>No Fee Schedule Found</Text>
                    <Text style={styles.noticeText}>
                      This student does not have any fee structure assigned yet. Please assign a fee
                      blueprint in 'Assign to Class' first.
                    </Text>
                  </View>
                ) : (
                  <>
                  <View style={{ marginBottom: 12 }}>
                    <Select
                      label="Target Fee Schedule / Term *"
                      options={studentFeeRecords.map((f) => ({
                        label: `${f.term_name || 'Academic Fee'} — ${
                          f.fee_structure?.name || 'Standard'
                        } (Pending: ₹${Number(f.balance ?? (Number(f.amount_due) - Number(f.amount_paid) - Number(f.concession_amount || 0))).toLocaleString('en-IN')})`,
                        value: f.id,
                      }))}
                      value={selectedFeeId}
                      onSelect={(val) => setSelectedFeeId(val as string)}
                    />
                  </View>

                  {/* Live Pending Fee Summary Card */}
                  <View style={styles.pendingCard}>
                    <View style={styles.pendingHeader}>
                      <Text style={styles.pendingHeadTitle}>
                        {activeFeeRecord?.term_name || 'Fee Ledger Breakdown'}
                      </Text>
                      <Badge
                        variant={activeFeeNetPending <= 0 ? 'success' : 'warning'}
                      >
                        {activeFeeNetPending <= 0 ? 'CLEARED' : 'PENDING'}
                      </Badge>
                    </View>

                    <View style={styles.pendingGrid}>
                      <View style={styles.pendingItem}>
                        <Text style={styles.pendingItemLabel}>Invoiced Due</Text>
                        <Text style={styles.pendingItemVal}>
                          ₹{activeFeeDue.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.pendingItem}>
                        <Text style={styles.pendingItemLabel}>Paid to Date</Text>
                        <Text style={[styles.pendingItemVal, { color: '#10B981' }]}>
                          ₹{activeFeePaid.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.pendingItem}>
                        <Text style={styles.pendingItemLabel}>Existing Concession</Text>
                        <Text style={[styles.pendingItemVal, { color: theme.colors.primary }]}>
                          ₹{activeFeeExistingConc.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.pendingItem}>
                        <Text style={styles.pendingItemLabel}>Net Outstanding</Text>
                        <Text style={[styles.pendingItemVal, { color: '#EF4444', fontWeight: '800' }]}>
                          ₹{activeFeeNetPending.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Step 5: Concession Method & Value */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.fieldLabel}>Concession Calculation Method *</Text>
                    <View style={styles.methodToggleRow}>
                      <TouchableOpacity
                        style={[
                          styles.methodToggleBtn,
                          discountMethod === 'amount' && styles.methodToggleBtnActive,
                        ]}
                        onPress={() => setDiscountMethod('amount')}
                      >
                        <IndianRupee
                          size={15}
                          color={discountMethod === 'amount' ? '#FFFFFF' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.methodToggleText,
                            discountMethod === 'amount' && styles.methodToggleTextActive,
                          ]}
                        >
                          Flat Amount (₹)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.methodToggleBtn,
                          discountMethod === 'percentage' && styles.methodToggleBtnActive,
                        ]}
                        onPress={() => setDiscountMethod('percentage')}
                      >
                        <Percent
                          size={15}
                          color={discountMethod === 'percentage' ? '#FFFFFF' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.methodToggleText,
                            discountMethod === 'percentage' && styles.methodToggleTextActive,
                          ]}
                        >
                          Percentage (%)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <FormField
                    label={
                      discountMethod === 'percentage'
                        ? 'Discount Percentage (%) *'
                        : 'Discount Amount (₹) *'
                    }
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder={discountMethod === 'percentage' ? 'e.g. 10 (for 10%)' : 'e.g. 2000'}
                    keyboardType="numeric"
                    required
                  />

                  {/* Live Calculation Preview Box */}
                  {computedDiscountAmount > 0 ? (
                    <View style={styles.previewBox}>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Calculated Concession:</Text>
                        <Text style={styles.previewDiscount}>
                          -₹{computedDiscountAmount.toLocaleString('en-IN')}
                          {discountMethod === 'percentage' ? ` (${discountValue}%)` : ''}
                        </Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>New Remaining Due:</Text>
                        <Text style={styles.previewRemaining}>
                          ₹{previewRemainingBalance.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Step 6: Concession Category */}
                  <Select
                    label="Concession Category *"
                    options={CONCESSION_CATEGORIES}
                    value={concessionCategory}
                    onSelect={(val) => setConcessionCategory(val as string)}
                  />

                  {/* Step 7: Reason & Justification */}
                  <FormField
                    label="Reason & Justification"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="e.g. Approved by Principal / Academic Governing Board"
                  />
                </>
              )
            ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              />
              <Button
                title="Apply Concession"
                onPress={handleGrant}
                loading={submitting}
                disabled={!selectedFeeId || computedDiscountAmount <= 0}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Continuation & Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  metricSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  termTabsContainer: {
    marginBottom: 16,
  },
  termTabsList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  termChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  termChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  termChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  termChipTextActive: {
    color: '#FFFFFF',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  studentSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  feeSubName: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  numText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  percentageBadgeText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    padding: 24,
    maxWidth: 560,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  noticeBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  pendingCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 14,
    marginBottom: 16,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  pendingHeadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pendingItem: {
    flex: 1,
    minWidth: 100,
  },
  pendingItemLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  pendingItemVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  methodToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.borderRadius.m,
    padding: 4,
    gap: 6,
  },
  methodToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.s,
    gap: 6,
  },
  methodToggleBtnActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  methodToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  methodToggleTextActive: {
    color: '#FFFFFF',
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12.5,
    color: theme.colors.textMuted,
  },
  previewDiscount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  previewRemaining: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
});
