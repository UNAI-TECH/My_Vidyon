import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Printer, Search, CreditCard, Send } from 'lucide-react-native';

export default function AccountantQuickBills() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Quick Billing" subtitle="Generate and print ad-hoc invoices instantly" />

      <View style={styles.card}>
        <Text style={styles.label}>Search Student</Text>
        <View style={styles.searchBar}>
          <Search size={20} color={theme.colors.textMuted} {...({} as any)} />
          <TextInput style={styles.searchInput} placeholder="Name or Registration Number" />
        </View>

        <Text style={styles.label}>Bill Category</Text>
        <View style={styles.selector}>
          <Text style={styles.selectorText}>Miscellaneous Fees / Fine</Text>
        </View>

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput style={styles.input} placeholder="Enter amount" keyboardType="numeric" />

        <TouchableOpacity style={styles.generateBtn}>
          <Printer size={20} color="white" {...({} as any)} />
          <Text style={styles.generateBtnText}>Generate & Print Bill</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Bills</Text>
        {[
          { id: '#8943', name: 'Kamal N.', amount: '₹250', time: '10 mins ago' },
          { id: '#8942', name: 'Sarah S.', amount: '₹1,200', time: '1 hour ago' },
        ].map((bill, i) => (
          <View key={i} style={styles.billItem}>
            <View style={styles.billInfo}>
              <Text style={styles.billId}>{bill.id}</Text>
              <Text style={styles.billName}>{bill.name}</Text>
            </View>
            <View style={styles.billMeta}>
              <Text style={styles.billAmount}>{bill.amount}</Text>
              <Text style={styles.billTime}>{bill.time}</Text>
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
  card: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  label: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8, marginTop: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8 },
  selector: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorText: { color: theme.colors.text },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  generateBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  generateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  billItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  billInfo: { gap: 4 },
  billId: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary },
  billName: { fontSize: 14, color: theme.colors.text },
  billMeta: { alignItems: 'flex-end', gap: 4 },
  billAmount: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  billTime: { fontSize: 10, color: theme.colors.textMuted }
});
