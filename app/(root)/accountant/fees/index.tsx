import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Settings2, 
  CreditCard, 
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react-native';

export default function AccountantFeeStructure() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Fee Components" subtitle="Define and edit institutional fee structures" />

      <TouchableOpacity style={styles.addBtn}>
        <Plus size={20} color="white" {...({} as any)} />
        <Text style={styles.addBtnText}>Create New Component</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Structure (2025-26)</Text>
        {[
          { name: 'Tuition Fee (Monthly)', amount: '₹4,500', term: 'Recurring' },
          { name: 'Lab & Practical Charges', amount: '₹2,500', term: 'Annual' },
          { name: 'Infrastructure Fund', amount: '₹10,000', term: 'One-time' }
        ].map((item, i) => (
          <View key={i} style={styles.itemCard}>
            <View style={styles.iconBox}>
              <DollarSign size={20} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.term}</Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amountText}>{item.amount}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity style={styles.miniBtn}>
                  <Settings2 size={12} color={theme.colors.textMuted} {...({} as any)} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn}>
                  <Trash2 size={12} color="#EF4444" {...({} as any)} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  addBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 32 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  itemCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  itemMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  itemActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  miniBtn: { padding: 4 }
});
