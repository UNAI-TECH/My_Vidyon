import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { Bell, Send, Users, School, Copy, RefreshCw, Trash2, CheckCircle, ShieldAlert, Globe } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/hooks/useAuth';
import { AlertModal } from '../../../src/components/common/AlertModal';
import { Select } from '../../../src/components/common/Select';
import { DataTable } from '../../../src/components/common/DataTable';
import { ActionDropdown, ActionDropdownItem } from '../../../src/components/common/ActionDropdown';
import { Badge } from '../../../src/components/common/Badge';

interface Institution {
  id: string; 
  institution_id: string;
  name: string;
  city?: string;
}

const MESSAGE_TEMPLATES = [
  {
    id: 'custom',
    label: 'Custom Announcement (Draft from scratch)',
    content: '',
  },
  {
    id: 'maintenance',
    label: '🛠️ Scheduled System Maintenance Alert',
    content: 'Important Notice: The Vidyon platform will undergo scheduled core infrastructure upgrades tonight from 12:00 AM to 02:00 AM IST. Portal access may experience intermittent pauses during this window.',
  },
  {
    id: 'exam',
    label: 'Examination Schedule Publication',
    content: 'Academic Advisory: The comprehensive semester examination timetables and hall ticket guidelines have been officially released. Please review your portal calendar for detailed subject dates.',
  },
  {
    id: 'fees',
    label: 'Term Fee Payment Reminder',
    content: 'Accounts Notification: Please be advised that the upcoming academic term fee cycle settlement deadline is approaching. Ensure pending dues are settled via the secure online portal before the cutoff date.',
  },
  {
    id: 'holiday',
    label: 'Public Holiday / Campus Closure Notice',
    content: 'Campus Advisory: Please take note that all regular academic lectures, practical laboratories, and administrative offices will remain suspended tomorrow in observation of the official holiday.',
  },
  {
    id: 'advisory',
    label: 'Emergency / Weather Advisory',
    content: 'Urgent Advisory: Due to adverse meteorological conditions, physical campus sessions will transition to asynchronous online learning modules for today. Stay safe and monitor notifications.',
  },
];

export default function CommunicationHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [audience, setAudience] = useState<'all' | 'institution'>('all');
  const [targetRole, setTargetRole] = useState<'all' | 'student' | 'faculty' | 'staff'>('all');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // Alert State
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: any }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const { data: institutions = [] } = useQuery<Institution[]>({
    queryKey: ['institutions-active-v5'],
    queryFn: async () => {
      const { data } = await supabase
        .from('institutions')
        .select('id, institution_id, name, city')
        .eq('status', 'active');
      return (data as Institution[]) || [];
    },
    staleTime: 60000,
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (tmpl && tmpl.content) {
      setMessage(tmpl.content);
    }
  };

  const onBlast = async () => {
    if (!message.trim() || !user) return;
    if (audience === 'institution' && !selectedInstitutionId) {
      showAlert('Selection Required', 'Please select a target campus for this institution announcement.', 'warning');
      return;
    }

    setIsSending(true);
    try {
      const payload: any = {
        title: audience === 'all' ? 'System Announcement' : `Campus Announcement`,
        content: message.trim(),
        type: targetRole,
        category: targetRole,
        created_by: user.id,
      };

      if (audience === 'institution' && selectedInstitutionId) {
        payload.institution_id = selectedInstitutionId;
      } else {
        payload.institution_id = null;
      }

      const { error } = await supabase
        .from('announcements')
        .insert(payload);
      
      if (!error) {
        // Send notifications
        try {
          let userIds: string[] = [];
          
          if (targetRole === 'all' || targetRole === 'student') {
            const query = supabase.from('students').select('user_id');
            if (audience === 'institution' && selectedInstitutionId) {
              query.eq('institution_id', selectedInstitutionId);
            }
            const { data } = await query as { data: { user_id: string }[] | null };
            if (data) userIds.push(...data.map(s => s.user_id).filter(Boolean));
          }

          if (targetRole === 'all' || targetRole === 'faculty' || targetRole === 'staff') {
            const query = supabase.from('profiles').select('id');
            if (targetRole !== 'all') query.eq('role', targetRole);
            if (audience === 'institution' && selectedInstitutionId) {
              query.eq('institution_id', selectedInstitutionId);
            }
            const { data } = await query as { data: { id: string }[] | null };
            if (data) userIds.push(...data.map(p => p.id).filter(Boolean));
          }

          userIds = [...new Set(userIds)];

          if (userIds.length > 0) {
            const notifications = userIds.map(uid => ({
              user_id: uid,
              title: payload.title,
              message: payload.content,
              type: 'announcement',
              read: false,
              institution_id: payload.institution_id,
            }));

            const chunkSize = 100;
            for (let i = 0; i < notifications.length; i += chunkSize) {
              await supabase.from('notifications').insert(notifications.slice(i, i + chunkSize) as any);
            }
          }
        } catch (notifErr) {
          console.error('Failed to blast notifications:', notifErr);
        }

        setMessage('');
        setSelectedTemplate('custom');
        showAlert('Announcement Dispatched', 'Broadcast notification dispatched across mobile apps and web dashboards.', 'success');
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      } else {
        showAlert('Error', error.message, 'error');
      }
    } catch (e: any) {
      showAlert('Error', e.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      showAlert('Deleted', 'Announcement removed from history.', 'info');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to delete announcement', 'error');
    }
  };

  const showAlert = (title: string, message: string, type: any) => {
    setAlert({ visible: true, title, message, type });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Communication & Broadcast Hub</Text>

      <View style={styles.broadcastCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconCircle}>
            <Bell size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeaderTitle}>Compose New Broadcast</Text>
            <Text style={styles.cardHeaderSub}>Dispatch real-time push notifications & banner alerts</Text>
          </View>
        </View>

        {/* Audience Selector Dropdown */}
        <Select
          label="Audience Scope *"
          value={audience}
          options={[
            { label: 'All Institutions (Platform-Wide Global Broadcast)', value: 'all', subLabel: 'Sends to all campuses on Vidyon' },
            { label: 'Specific Institution / Campus Only', value: 'institution', subLabel: 'Target a single campus tenant' },
          ]}
          onSelect={(val) => {
            setAudience(val as 'all' | 'institution');
            if (val === 'all') setSelectedInstitutionId(null);
          }}
          searchable={false}
        />

        {/* Specific Institution Dropdown if selected */}
        {audience === 'institution' && (
          <Select
            label="Target Campus / Institution *"
            placeholder="Search and select campus..."
            value={selectedInstitutionId || ''}
            options={institutions.map(inst => ({
              label: inst.name,
              value: inst.institution_id || inst.id,
              subLabel: `${inst.institution_id} • ${inst.city || 'India'}`,
            }))}
            onSelect={(val) => setSelectedInstitutionId(val)}
            searchable={true}
          />
        )}

        {/* Target Role Dropdown */}
        <Select
          label="Target User Role *"
          value={targetRole}
          options={[
            { label: 'All Roles (Students, Parents, Faculty, Staff)', value: 'all' },
            { label: 'Students Only', value: 'student' },
            { label: 'Faculty / Teachers Only', value: 'faculty' },
            { label: 'Administrative Staff Only', value: 'staff' },
          ]}
          onSelect={(val) => setTargetRole(val as any)}
          searchable={false}
        />

        {/* Template Preset Dropdown */}
        <Select
          label="Message Template Preset"
          placeholder="Choose standard template..."
          value={selectedTemplate}
          options={MESSAGE_TEMPLATES.map(t => ({
            label: t.label,
            value: t.id,
          }))}
          onSelect={handleSelectTemplate}
          searchable={false}
        />

        <Text style={styles.label}>Broadcast Message Body *</Text>
        <TextInput
          style={styles.messageBox}
          placeholder="Type your official announcement here..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity 
          style={[styles.sendBtn, (!message.trim() || isSending) && { opacity: 0.5 }]} 
          onPress={onBlast}
          disabled={!message.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Send size={18} color="white" />
          )}
          <Text style={styles.sendBtnText}>{isSending ? 'Dispatching...' : 'Blast Broadcast Alert'}</Text>
        </TouchableOpacity>
      </View>

      {/* Broadcast History Table */}
      <View style={{ marginTop: 32, marginBottom: 40 }}>
        <Text style={styles.sectionTitle}>Broadcast History & Activity</Text>

        <DataTable<any>
          columns={[
            {
              key: 'content',
              title: 'Announcement Content',
              width: '40%',
              render: (item) => (
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }} numberOfLines={2}>
                    {item.content}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    {item.title || 'Announcement'}
                  </Text>
                </View>
              ),
            },
            {
              key: 'type',
              title: 'Target Role',
              width: '18%',
              render: (item) => (
                <Badge variant={item.type === 'student' ? 'default' : item.type === 'faculty' ? 'success' : 'info'}>
                  {(item.type || 'ALL').toUpperCase()}
                </Badge>
              ),
            },
            {
              key: 'institution_id',
              title: 'Scope',
              width: '18%',
              render: (item) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {!item.institution_id && <Globe size={13} color="#059669" />}
                  <Text style={{ fontSize: 12, color: item.institution_id ? '#0284C7' : '#059669', fontWeight: '600' }}>
                    {item.institution_id ? `Inst: ${item.institution_id}` : 'Platform-Wide'}
                  </Text>
                </View>
              ),
            },
            {
              key: 'created_at',
              title: 'Sent Date',
              width: '14%',
              render: (item) => (
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              ),
            },
            {
              key: 'actions',
              title: 'Actions',
              width: '10%',
              align: 'right',
              render: (item) => {
                const actions: ActionDropdownItem[] = [
                  {
                    id: 'copy',
                    label: 'Use This Message',
                    subLabel: 'Load content into compose box',
                    icon: <Copy size={14} color="#3B82F6" />,
                    onPress: () => {
                      setMessage(item.content);
                      if (item.type) setTargetRole(item.type);
                      if (item.institution_id) {
                        setAudience('institution');
                        setSelectedInstitutionId(item.institution_id);
                      } else {
                        setAudience('all');
                      }
                      showAlert('Loaded', 'Content copied into compose editor above.', 'info');
                    },
                  },
                  {
                    id: 'delete',
                    label: 'Delete Broadcast',
                    subLabel: 'Remove from history',
                    icon: <Trash2 size={14} color="#DC2626" />,
                    variant: 'destructive',
                    onPress: () => handleDeleteAnnouncement(item.id),
                  },
                ];
                return <ActionDropdown items={actions} size="sm" />;
              },
            },
          ]}
          data={history}
          keyExtractor={(item) => item.id}
          searchable={false}
          pageSize={8}
          loading={isLoading}
          emptyTitle="No Broadcasts Found"
          emptyDescription="Announcements blasted across campus will appear here."
        />
      </View>

      <AlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingTop: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text, marginBottom: 20 },
  broadcastCard: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  cardHeaderSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 8, marginTop: 4 },
  messageBox: {
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  sendBtn: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  sendBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 14 },
});
