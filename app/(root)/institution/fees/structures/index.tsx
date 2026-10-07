import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../../src/theme';
import { PageHeader } from '../../../../../src/components/common/PageHeader';
import { Button } from '../../../../../src/components/common/Button';
import { Badge } from '../../../../../src/components/common/Badge';
import { LoadingState, EmptyState } from '../../../../../src/components/common/FeedbackStates';
import { useFeeManagement, FeeStructure } from '../../../../../src/hooks/useFeeManagement';
import { ArrowLeft, Plus, Layers, ChevronDown, ChevronUp, Tag } from 'lucide-react-native';

export default function FeeStructuresScreen() {
  const router = useRouter();
  const { structures, loading, terms } = useFeeManagement();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Structures"
        subtitle="Manage fee templates and itemized component breakdowns by class & term"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          <Button
            title="Create Structure"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={() => router.push('/(root)/institution/fees/structures/add' as any)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {loading && structures.length === 0 ? (
          <LoadingState message="Loading fee structures..." />
        ) : structures.length === 0 ? (
          <EmptyState
            title="No Fee Structures Configured"
            description="Fee structures define the itemized fee components (Tuition, Books, Lab, Transport) for classes."
            actionTitle="Add New Structure"
            onAction={() => router.push('/(root)/institution/fees/structures/add' as any)}
          />
        ) : (
          <View style={styles.structuresList}>
            {structures.map((s) => {
              const term = terms.find((t) => t.id === s.term_id);
              const isExpanded = expandedId === s.id;
              const components = s.components || [];

              return (
                <View key={s.id} style={styles.structCard}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(s.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconBox}>
                      <Layers size={20} color={theme.colors.primary} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.structName}>{s.name}</Text>
                      <Text style={styles.structSub}>
                        Class: {s.class_name || 'All Classes'} • Term: {term?.term_name || 'Annual'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                      <Text style={styles.structAmount}>₹{Number(s.amount || 0).toLocaleString('en-IN')}</Text>
                      <Badge variant="info">{s.category || 'tuition'}</Badge>
                    </View>

                    {isExpanded ? (
                      <ChevronUp size={18} color={theme.colors.textMuted} />
                    ) : (
                      <ChevronDown size={18} color={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {/* Component Breakdown */}
                  {isExpanded && (
                    <View style={styles.componentsDrawer}>
                      <Text style={styles.componentHeaderTitle}>Itemized Fee Components</Text>
                      {components.length === 0 ? (
                        <Text style={styles.noCompText}>No sub-components added (flat fee).</Text>
                      ) : (
                        components.map((comp, idx) => (
                          <View key={comp.id || idx} style={styles.compRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Tag size={13} color={theme.colors.textMuted} />
                              <Text style={styles.compName}>{comp.name}</Text>
                              {comp.is_optional && <Badge variant="default">Optional</Badge>}
                              {comp.is_transport && <Badge variant="warning">Transport</Badge>}
                            </View>
                            <Text style={styles.compAmount}>
                              ₹{Number(comp.amount || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        ))
                      )}

                      <View style={styles.drawerActions}>
                        <Button
                          title="Assign to Class"
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            router.push({
                              pathname: '/(root)/institution/fees/assign' as any,
                              params: { feeStructureId: s.id, className: s.class_name || '' },
                            })
                          }
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
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
  structuresList: {
    gap: 12,
  },
  structCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  structName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  structSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  structAmount: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  componentsDrawer: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    padding: 14,
  },
  componentHeaderTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  noCompText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  compName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  compAmount: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  drawerActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
