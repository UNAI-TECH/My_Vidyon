import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { 
  Plus, 
  Utensils, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Users
} from 'lucide-react-native';

export default function CanteenMenu() {
  const menuItems = [
    { name: 'Standard Breakfast', type: 'Veg', price: '₹40', time: '08:00 AM', category: 'Breakfast' },
    { name: 'Full North Indian Meals', type: 'Veg', price: '₹80', time: '12:30 PM', category: 'Lunch' },
    { name: 'Chicken Biryani Special', type: 'Non-Veg', price: '₹120', time: '01:00 PM', category: 'Special' },
    { name: 'Evening Snacks & Tea', type: 'Veg', price: '₹30', time: '04:30 PM', category: 'Snacks' }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title="Menu Management" 
        subtitle="Configure daily meal plans and pricing" 
      />

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <TrendingUp size={16} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Active Items</Text>
        </View>
        <View style={styles.statBox}>
          <Users size={16} color="#FAB75A" {...({} as any)} />
          <Text style={styles.statValue}>450</Text>
          <Text style={styles.statLabel}>Avg. Users</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Featured Menu</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Plus size={16} color="white" {...({} as any)} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {menuItems.map((item, i) => (
        <TouchableOpacity key={i} style={styles.menuCard}>
          <View style={[styles.typeIndicator, { backgroundColor: item.type === 'Veg' ? '#22C55E' : '#EF4444' }]} />
          <View style={styles.menuInfo}>
            <View style={styles.menuHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
            <View style={styles.menuMeta}>
              <View style={styles.metaLabel}>
                <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.metaText}>{item.time}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            </View>
          </View>
          <ChevronRight size={20} color={theme.colors.textMuted} {...({} as any)} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginTop: 8 },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  addBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  menuCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  typeIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 16 },
  menuInfo: { flex: 1 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: theme.colors.primary },
  menuMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: theme.colors.textMuted },
  categoryBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted },
});
