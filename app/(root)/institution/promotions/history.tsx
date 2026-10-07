import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Badge } from '../../../../src/components/common/Badge';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { usePromotions, PromotionHistoryRecord } from '../../../../src/hooks/usePromotions';
import { ArrowLeft, History, CheckCircle } from 'lucide-react-native';

export default function PromotionHistoryScreen() {
  const router = useRouter();
  const { history, loading } = usePromotions();

  const columns: ColumnDef<PromotionHistoryRecord>[] = [
    {
      key: 'student',
      title: 'Student',
      sortable: true,
      render: (item) => (
        <View>
          <Text style={styles.studentName}>{item.student?.name || 'Unknown'}</Text>
          <Text style={styles.studentSub}>Roll #{item.student?.roll_number || 'N/A'}</Text>
        </View>
      ),
    },
    {
      key: 'transition',
      title: 'Progression Record',
      render: (item) => (
        <Text style={styles.transitionText}>
          {item.from_class} ➔ <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{item.to_class}</Text>
        </Text>
      ),
    },
    {
      key: 'year',
      title: 'Target Academic Year',
      render: (item) => (
        <Text style={styles.metaText}>{item.academic_year || '-'}</Text>
      ),
    },
    {
      key: 'action',
      title: 'Action',
      align: 'center',
      render: (item) => (
        <Badge variant="success">{item.action.toUpperCase()}</Badge>
      ),
    },
    {
      key: 'date',
      title: 'Executed At',
      sortable: true,
      render: (item) => (
        <Text style={styles.metaText}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Promotion Audit History"
        subtitle="Immutable audit log of all applied student grade promotions and transitions"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tableCard}>
          <DataTable
            columns={columns}
            data={history}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Search audit log by student name..."
            searchKeys={['student.name', 'student.roll_number', 'from_class', 'to_class']}
            loading={loading}
            emptyTitle="No Promotion History"
            emptyDescription="No promotion execution events have been recorded yet."
          />
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
  transitionText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
