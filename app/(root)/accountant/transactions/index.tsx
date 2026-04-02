import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useAccountantTransactions } from '../../../../src/hooks/useAccountantTransactions';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  Printer
} from 'lucide-react-native';

export default function AccountantTransactions() {
  const { institutionId } = useAuth();
  const { transactions, isLoading } = useAccountantTransactions(institutionId || undefined);

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

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                {/* Assuming mostly credits for fees */}
                <ArrowDownLeft size={20} color="#10B981" {...({} as any)} />
              </View>
              <View style={styles.content}>
                <Text style={styles.name}>{item.students?.name || 'Student'}</Text>
                <Text style={styles.meta}>
                  {new Date(item.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • Online
                </Text>
              </View>
              <View style={styles.amountBox}>
                <Text style={[styles.amount, { color: '#10B981' }]}>₹{item.amount_paid?.toLocaleString()}</Text>
                <View style={styles.statusRow}>
                  <Clock size={10} color={item.status === 'verified' || item.status === 'paid' ? '#10B981' : '#F59E0B'} {...({} as any)} />
                  <Text style={[styles.statusText, { color: item.status === 'verified' || item.status === 'paid' ? '#10B981' : '#F59E0B' }]}>
                    {(item.status || 'verified').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: theme.colors.textMuted }}>No transactions found.</Text>
        </View>
      )}
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
