import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Linking,
  Dimensions,
  Alert
} from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Megaphone, 
  ExternalLink, 
  Clock,
  Layout,
  Tag
} from 'lucide-react-native';
import { format } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function UnifiedEventsScreen() {
  const { institutionUuid, role } = useAuth();

  // Fetch both institution-specific events AND global ads/sponsored content
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['unified-events', institutionUuid],
    queryFn: async () => {
      const instId = institutionUuid;
      
      let query = (supabase.from('academic_events') as any)
        .select('*');

      if (instId) {
        query = query.or(`institution_id.eq.${instId},is_admin_added.eq.true,institution_id.is.null`);
      } else {
        query = query.or(`is_admin_added.eq.true,institution_id.is.null`);
      }

      const { data, error } = await query.order('start_date', { ascending: true });

      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  const extractUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };

  const handleAction = async (item: any) => {
    if (item.hyperlink) {
      const cleanUrl = extractUrl(item.hyperlink);
      if (cleanUrl) {
        const supported = await Linking.canOpenURL(cleanUrl);
        if (supported) {
          Linking.openURL(cleanUrl).catch(err => console.error("Couldn't load page", err));
        } else {
          Alert.alert("Notice", "This link cannot be opened automatically.");
        }
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Events & Details" 
        subtitle="Stay updated with school life and offers"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Layout size={64} color={theme.colors.textMuted} opacity={0.2} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No events or announcements found.</Text>
          </View>
        ) : (
          events.map((item) => (
            <View key={item.id} style={styles.eventCard}>
              {item.banner_url ? (
                <Image source={{ uri: item.banner_url }} style={styles.bannerImage} />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Layout size={48} color={theme.colors.primary} opacity={0.2} />
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.categoryRow}>
                  <View style={[styles.badge, item.is_admin_added ? styles.sponsoredBadge : styles.eventBadge]}>
                    <Text style={[styles.badgeText, item.is_admin_added ? styles.sponsoredBadgeText : styles.eventBadgeText]}>
                      {item.is_admin_added ? 'PROMOTION' : (item.category || 'EVENT').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.dateBadge}>
                    <Clock size={12} color={theme.colors.textMuted} />
                    <Text style={styles.dateText}>{format(new Date(item.start_date), 'MMM d, yyyy')}</Text>
                  </View>
                </View>

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>

                {item.hyperlink && (
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => handleAction(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Learn More</Text>
                    <ExternalLink size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: theme.colors.textMuted, marginTop: 16, fontSize: 16 },
  
  eventCard: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    marginBottom: 24, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  bannerImage: { width: '100%', height: 180, resizeMode: 'cover' },
  bannerPlaceholder: { width: '100%', height: 120, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  
  cardBody: { padding: 20 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eventBadge: { backgroundColor: theme.colors.primary + '15' },
  sponsoredBadge: { backgroundColor: '#FDF2F2' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  eventBadgeText: { color: theme.colors.primary },
  sponsoredBadgeText: { color: '#EF4444' },
  
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  
  title: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  description: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 20 },
  
  actionBtn: { 
    backgroundColor: theme.colors.primary, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderRadius: 16, 
    gap: 10 
  },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
