import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useStudentDashboard } from '../../../../src/hooks/useStudentDashboard';
import { Badge } from '../../../../src/components/common/Badge';
import { FileText, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function StudentAssignments() {
  const { user } = useAuth();
  const router = useRouter();
  const { assignments, isLoading } = useStudentDashboard(user?.id);

  return (
    <View style={styles.container}>
      <PageHeader title="Assignments" subtitle="Manage your pending and graded tasks" />
      
      <FlatList
        data={assignments}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push({
              pathname: '/(root)/student/assignments/[id]',
              params: { id: item.id }
            })}
          >
            <View style={styles.iconWrapper}>
              <FileText size={20} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subject}>{item.subject}</Text>
              <View style={styles.footer}>
                <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.due}>Due: {item.dueDate}</Text>
              </View>
            </View>
            <Badge variant={item.status === 'pending' ? 'warning' : item.status === 'submitted' ? 'info' : 'success'}>
              {item.status}
            </Badge>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No assignments assigned.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  subject: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  due: { fontSize: 10, color: theme.colors.textMuted },
  empty: { textAlign: 'center', marginTop: 40, color: theme.colors.textMuted },
});
