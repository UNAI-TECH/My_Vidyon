import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { 
  CreditCard, 
  Lock, 
  CheckCircle2,
  Gift
} from 'lucide-react-native';

export default function FeeGateway() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Secure Fee Gateway" subtitle="Child: Rahul N. • Term 1 Fees" />

      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>DUE AMOUNT</Text>
        <Text style={styles.amountValue}>₹12,400</Text>
        <View style={styles.rewardBadge}>
          <Gift size={14} color="#F59E0B" {...({} as any)} />
          <Text style={styles.rewardText}> Earn 120 Vidyon Points</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methodCard}>
           <View style={styles.methodRow}>
              <View style={styles.iconBox}>
                <CreditCard size={20} color={theme.colors.primary} {...({} as any)} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>HDFC Bank Mobile Pay</Text>
                <Text style={styles.methodMeta}>**** 5432</Text>
              </View>
              <CheckCircle2 size={24} color="#10B981" {...({} as any)} />
           </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.securityNote}>
          <Lock size={12} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.securityText}>AES-256 Bit Encrypted Transaction</Text>
        </View>
        <TouchableOpacity style={styles.payBtn}>
          <Text style={styles.payText}>Verify & Pay ₹12,400</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  amountCard: { backgroundColor: theme.colors.primary, borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 32 },
  amountLabel: { color: 'white', fontSize: 12, fontWeight: 'bold', opacity: 0.8 },
  amountValue: { color: 'white', fontSize: 40, fontWeight: 'bold', marginVertical: 8 },
  rewardBadge: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  rewardText: { fontSize: 11, fontWeight: 'bold', color: '#B45309' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  methodCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  methodMeta: { fontSize: 12, color: theme.colors.textMuted },
  footer: { marginTop: 16 },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  securityText: { fontSize: 11, color: theme.colors.textMuted },
  payBtn: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, alignItems: 'center' },
  payText: { color: 'white', fontWeight: 'bold', fontSize: 17 }
});
