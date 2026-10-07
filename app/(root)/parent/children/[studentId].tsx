import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { FormField } from '../../../../src/components/common/FormField';
import { ReadOnlyBadge } from '../../../../src/components/parent/ReadOnlyBadge';
import { LoadingState, ErrorState } from '../../../../src/components/common/FeedbackStates';
import { useParentStudents } from '../../../../src/hooks/useParentStudents';
import { supabase } from '../../../../src/lib/supabase';
import { GraduationCap, Phone, Shield, User, ArrowLeft } from 'lucide-react-native';

export default function ParentStudentDetailScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const { children, loading: parentLoading } = useParentStudents();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security check: verify this student is in parent's linked children list
  const isLinked = children.some((c) => c.student_id === studentId);

  useEffect(() => {
    async function fetchStudent() {
      if (!studentId) return;
      try {
        setLoading(true);
        setError(null);

        const { data, error: err } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single();

        if (err) throw err;
        setStudent(data);
      } catch (e: any) {
        setError(e.message || 'Unable to load student information.');
      } finally {
        setLoading(false);
      }
    }

    if (!parentLoading) {
      if (!isLinked && children.length > 0) {
        setError('Access Denied: You are not authorized to view this student profile.');
        setLoading(false);
      } else {
        fetchStudent();
      }
    }
  }, [studentId, isLinked, parentLoading, children.length]);

  if (loading || parentLoading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Student Profile"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <LoadingState message="Loading student details..." />
      </View>
    );
  }

  if (error || !student) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Student Profile"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <ErrorState
          title="Profile Unavailable"
          message={error || 'Student record could not be found.'}
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={student.name}
        subtitle={`${student.class_name || 'Class'}${student.section ? ` - ${student.section}` : ''} • Roll: ${
          student.roll_number || 'N/A'
        }`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={<ReadOnlyBadge label="Parent Read-Only" />}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Student Avatar Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatar}>
            {student.image_url ? (
              <Image source={{ uri: student.image_url }} style={styles.avatarImg} />
            ) : (
              <User size={36} color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.profileHeaderInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentMeta}>
              Class {student.class_name || '—'} {student.section ? `(Sec ${student.section})` : ''}
            </Text>
            <Text style={styles.studentMeta}>
              Academic Year: {student.academic_year || 'Current'}
            </Text>
          </View>
        </View>

        {/* Academic Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <GraduationCap size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Academic Information</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField
                label="Class"
                value={student.class_name || '—'}
                editable={false}
              />
            </View>
            <View style={styles.flex1}>
              <FormField
                label="Section"
                value={student.section || '—'}
                editable={false}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField
                label="Roll Number"
                value={student.roll_number || '—'}
                editable={false}
              />
            </View>
            <View style={styles.flex1}>
              <FormField
                label="Status"
                value={student.is_active ? 'Active Enrolled' : 'Inactive'}
                editable={false}
              />
            </View>
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Personal Details</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField
                label="Date of Birth"
                value={student.dob || '—'}
                editable={false}
              />
            </View>
            <View style={styles.flex1}>
              <FormField
                label="Gender"
                value={student.gender || '—'}
                editable={false}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField
                label="Blood Group"
                value={student.blood_group || '—'}
                editable={false}
              />
            </View>
            <View style={styles.flex1}>
              <FormField
                label="Emergency Phone"
                value={student.parent_phone || student.parent_contact || '—'}
                editable={false}
              />
            </View>
          </View>
        </View>

        {/* Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Phone size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Registered Address</Text>
          </View>
          <FormField
            label="Street Address"
            value={student.address || '—'}
            editable={false}
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField
                label="City"
                value={student.city || '—'}
                editable={false}
              />
            </View>
            <View style={styles.flex1}>
              <FormField
                label="Pincode"
                value={student.zip_code || '—'}
                editable={false}
              />
            </View>
          </View>
        </View>
      </ScrollView>
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
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 16,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  profileHeaderInfo: {
    flex: 1,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  studentMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
    paddingBottom: 8,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
});
