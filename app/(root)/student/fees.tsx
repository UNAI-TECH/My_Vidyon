import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { theme } from '../../../src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, ChevronRight, FileText, CheckCircle2, Clock } from 'lucide-react-native';

const transactions = [
  { id: '1', title: 'Tuition Fee - Quarter 4', amount: '₹12,500', date: 'March 01, 2026', status: 'pending' },
  { id: '2', title: 'Library Fee', amount: '₹500', date: 'Feb 15, 2026', status: 'paid' },
  { id: '3', title: 'Tuition Fee - Quarter 3', amount: '₹12,500', date: 'Jan 02, 2026', status: 'paid' },
];

export default function FeesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fee Management</Text>
        <TouchableOpacity style={styles.walletBtn}>
          <Wallet size={20} color={theme.colors.primary} {...({} as any)} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={theme.gradients.primary} style={styles.dueCard}>
          <Text style={styles.dueLabel}>Total Amount Due</Text>
          <Text style={styles.dueAmount}>₹12,500</Text>
          <TouchableOpacity style={styles.payBtn}>
            <Text style={styles.payBtnText}>Pay Now</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Payment History</Text>
        {transactions.map((item) => (
          <View key={item.id} style={styles.transactionCard}>
            <View style={[styles.statusIcon, { backgroundColor: item.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
              {item.status === 'paid' ? <CheckCircle2 size={20} color="#10b981" {...({} as any)} /> : <Clock size={20} color="#ef4444" {...({} as any)} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>{item.title}</Text>
              <Text style={styles.txDate}>{item.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txAmount, { color: item.status === 'paid' ? '#10b981' : theme.colors.text }]}>{item.amount}</Text>
              <TouchableOpacity style={styles.receiptLink}>
                <FileText size={14} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.receiptText}>Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 24, marginTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
  walletBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.glassBorder },
  dueCard: { padding: 24, borderRadius: 24, alignItems: 'center', marginBottom: 32 },
  dueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  dueAmount: { color: 'white', fontSize: 36, fontWeight: '800', marginBottom: 20 },
  payBtn: { backgroundColor: 'white', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100 },
  payBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 16 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, backgroundColor: theme.colors.glass, borderWidth: 1, borderColor: theme.colors.glassBorder, marginBottom: 12 },
  statusIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  txDate: { fontSize: 12, color: theme.colors.textMuted },
  txAmount: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  receiptLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  receiptText: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
});
