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
import { AlertModal } from '../../../../../src/components/common/AlertModal';
import { useFeeManagement, FeeStructure } from '../../../../../src/hooks/useFeeManagement';
import { ArrowLeft, Plus, Layers, ChevronDown, ChevronUp, Tag, Trash2 } from 'lucide-react-native';

export default function FeeStructuresScreen() {
  const router = useRouter();
  const { structures, loading, terms, deleteFeeStructure } = useFeeManagement();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    buttons?: {
      text: string;
      style?: 'primary' | 'secondary' | 'destructive';
      onPress: () => void;
    }[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const confirmDeleteStructure = (s: FeeStructure) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Fee Structure',
      message: `Are you sure you want to delete "${s.name}" (${s.class_name || 'All Classes'} • ₹${Number(s.amount || 0).toLocaleString('en-IN')})?\n\nIf any uncollected student fee schedules were assigned from this template, they will also be removed.`,
      type: 'warning',
      buttons: [
        {
          text: 'Cancel',
          style: 'secondary',
          onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        },
        {
          text: 'Delete Structure',
          style: 'destructive',
          onPress: async () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            try {
              setDeletingId(s.id);
              await deleteFeeStructure(s.id);
              setAlertConfig({
                visible: true,
                title: 'Fee Structure Deleted',
                message: `"${s.name}" has been deleted successfully.`,
                type: 'success',
              });
            } catch (err: any) {
              setAlertConfig({
                visible: true,
                title: 'Cannot Delete Fee Structure',
                message: err?.message || 'Failed to delete fee structure.',
                type: 'error',
              });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    });
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
                  <View style={styles.cardHeaderRow}>
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

                    <TouchableOpacity
                      style={styles.deleteIconBtn}
                      onPress={() => confirmDeleteStructure(s)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                      disabled={deletingId === s.id}
                      accessibilityLabel="Delete structure"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

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
                        <TouchableOpacity
                          style={styles.drawerDeleteBtn}
                          onPress={() => confirmDeleteStructure(s)}
                          disabled={deletingId === s.id}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={14} color="#EF4444" />
                          <Text style={styles.drawerDeleteText}>Delete Structure</Text>
                        </TouchableOpacity>

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

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  deleteIconBtn: {
    padding: 8,
    marginRight: 14,
    borderRadius: theme.borderRadius.m,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.m,
    backgroundColor: '#FEE2E2',
    marginRight: 10,
  },
  drawerDeleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
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
