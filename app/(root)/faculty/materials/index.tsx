import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { BookOpen, FileText, Trash2, Plus, Download, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { downloadAndShareFile } from '../../../../src/utils/fileUtils';
import { AlertModal } from '../../../../src/components/common/AlertModal';

export default function FacultyMaterialsManagement() {
  const { user, institutionId, institutionUuid } = useAuth();
  const router = useRouter();
  const { myMaterials, isLoadingMyMaterials, refetchMaterials, deleteMaterial } = useFacultyDashboard(user?.id, (institutionUuid || institutionId) || undefined);
  
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [alertConfig, setAlertConfig] = React.useState({
    visible: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const handleDelete = (material: any) => {
    Alert.alert(
      'Delete Material',
      `Are you sure you want to delete "${material.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(material.id);
            try {
              await deleteMaterial(material.id, material.file_url);
              setAlertConfig({
                visible: true,
                title: 'Deleted',
                message: 'Study material has been removed successfully.',
                type: 'success'
              });
            } catch (error: any) {
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: error.message || 'Failed to delete material',
                type: 'error'
              });
            } finally {
              setIsDeleting(null);
            }
          }
        }
      ]
    );
  };

  if (isLoadingMyMaterials && myMaterials.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Study Materials" 
        subtitle="Manage your uploaded resources" 
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
        actions={
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/(root)/faculty/materials/upload')}
          >
            <Plus size={20} color="white" {...({} as any)} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={myMaterials}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoadingMyMaterials} onRefresh={refetchMaterials} colors={[theme.colors.primary]} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardMain}>
              <View style={styles.iconWrapper}>
                <FileText size={24} color={theme.colors.primary} {...({} as any)} />
              </View>
              <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.subjects?.name || 'Unknown'} • {item.classes?.name || 'Class'} • {item.section || 'All'}
                </Text>
                {item.description && (
                  <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => downloadAndShareFile(item.file_url, item.file_name)}
              >
                <Download size={18} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item)}
                disabled={isDeleting === item.id}
              >
                {isDeleting === item.id ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Trash2 size={18} color="#EF4444" {...({} as any)} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <BookOpen size={48} color={theme.colors.textMuted} {...({} as any)} />
            </View>
            <Text style={styles.emptyTitle}>No Materials Found</Text>
            <Text style={styles.emptySubtitle}>Upload study resources to share with your students.</Text>
            <TouchableOpacity 
              style={styles.uploadNowBtn}
              onPress={() => router.push('/(root)/faculty/materials/upload')}
            >
              <Text style={styles.uploadNowText}>Upload Now</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      <AlertModal 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { marginRight: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  list: { paddingBottom: 100 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconWrapper: { width: 50, height: 50, borderRadius: 16, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  meta: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  description: { fontSize: 13, color: theme.colors.textMuted, marginTop: 6, lineHeight: 18 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  deleteBtn: { backgroundColor: '#EF4444' + '10', borderColor: '#EF4444' + '20' },
  
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  emptySubtitle: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  uploadNowBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  uploadNowText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
