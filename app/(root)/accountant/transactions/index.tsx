import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  Printer
} from 'lucide-react-native';

export default function AccountantTransactions() {
  const transactions = [
    { id: '1', type: 'credit', name: 'Rahul N.', amount: '₹12,400', method: 'Online', status: 'verified', date: 'Mar 10' },
    { id: '2', type: 'credit', name: 'Priya K.', amount: '₹1,200', method: 'Cash', status: 'pending', date: 'Mar 09' },
    { id: '3', type: 'debit', name: 'Electricity Bill', amount: '₹8,500', method: 'RTGS', status: 'verified', date: 'Mar 08' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Transaction Ledger" subtitle="Precision financial tracking & Quick Bills" />
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn}>
          <ArrowUpRight size={18} color="white" {...({} as any)} />
          <Text style={styles.actionBtnText}>Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1E293B' }]}>
          <Printer size={18} color="white" {...({} as any)} />
          <Text style={styles.actionBtnText}>Quick Bill</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: item.type === 'credit' ? '#ECFDF5' : '#FEF2F2' }]}>
              {item.type === 'credit' ? (
                <ArrowDownLeft size={20} color="#10B981" {...({} as any)} />
              ) : (
                <ArrowUpRight size={20} color="#EF4444" {...({} as any)} />
              )}
            </View>
            <View style={styles.content}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.date} • {item.method}</Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={[styles.amount, { color: item.type === 'credit' ? '#10B981' : '#EF4444' }]}>{item.amount}</Text>
              <View style={styles.statusRow}>
                <Clock size={10} color={item.status === 'verified' ? '#10B981' : '#F59E0B'} {...({} as any)} />
                <Text style={[styles.statusText, { color: item.status === 'verified' ? '#10B981' : '#F59E0B' }]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  name: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  meta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statusText: { fontSize: 8, fontWeight: 'bold' }
});
