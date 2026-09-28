import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Linking,
  ImageBackground,
  Alert
} from 'react-native';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Calendar, ChevronRight } from 'lucide-react-native';
import { NativeAdItem } from './Ads/NativeAdView';
import { EventDetailModal } from './EventDetailModal';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width - 48; // Padding 24 on each side

interface EventAdCarouselProps {
  nativeAdUnitID: string;
  adInterval?: number; // Show ad every X items
}

const extractUrl = (str: string): string => {
  if (!str) return '';
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const match = str.match(urlPattern);
  return match ? match[0] : str.trim();
};

export const EventAdCarousel: React.FC<EventAdCarouselProps> = ({ 
  nativeAdUnitID, 
  adInterval = 2 
}) => {
  const { user, role, fullName, institutionUuid } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const indexRef = useRef(0);

  // Frequency Balancing Ref (Google Ads style):
  // Tracks timestamp when each ad was last seen by this user in the carousel
  const lastSeenAdRef = useRef<{ [adId: string]: number }>({});
  // Impression debit window: only debit at most 1 view per 30 minutes per ad
  const lastDebitedViewRef = useRef<{ [adId: string]: number }>({});
  // View lead recording window: 15 minutes per user per ad to avoid flooding
  const recordedViewLeadsRef = useRef<{ [key: string]: number }>({});
  // Click throttle ref (3s)
  const lastAdClickRef = useRef<{ [adId: string]: number }>({});
 
  // 1. Fetch Events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['academic-events', institutionUuid],
    queryFn: async () => {
      const instId = institutionUuid;
      
      // Fetch both institution-specific events AND global ads/sponsored content
      let query = (supabase.from('academic_events') as any)
        .select('*');

      if (instId) {
        // 1. Institution's own events
        // 2. Admin ads targeted to THIS institution
        // 3. Admin ads that are GLOBAL (institution_id is null)
        query = query.or(`institution_id.eq.${instId},and(is_admin_added.eq.true,institution_id.is.null)`);
      } else {
        // Fallback: only show Global Admin ads
        query = query.eq('is_admin_added', true).is('institution_id', null);
      }

      const { data, error } = await query.order('start_date', { ascending: true });

      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user
  });

  // Record User Lead details on click or view
  const recordAdLead = async (ad: any, actionType: 'click' | 'view' = 'click') => {
    try {
      if (!ad?.id || !ad?.is_admin_added) return;

      // Do NOT include admin or superadmin in ad leads
      const currentRole = (role || '').toLowerCase();
      if (currentRole === 'admin' || currentRole === 'superadmin') return;

      // Deduplicate views per user per ad so rotating carousel doesn't spam database
      if (actionType === 'view') {
        const viewKey = `${ad.id}_${user?.id || 'anon'}`;
        const lastRecorded = recordedViewLeadsRef.current[viewKey] || 0;
        if (Date.now() - lastRecorded < 15 * 60 * 1000) return; // 15-minute window
        recordedViewLeadsRef.current[viewKey] = Date.now();
      }

      let contactNumber = user?.phone || '';
      let name = fullName || (user?.user_metadata as any)?.full_name || '';
      let email = user?.email || '';
      let institutionName = '';

      // Check profile if phone/name not populated in auth context
      if (user?.id) {
        const { data: prof } = await (supabase.from('profiles') as any)
          .select('phone, full_name, email, institution_id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (prof) {
          if (prof.role === 'admin' || prof.role === 'superadmin') return;
          contactNumber = prof.phone || contactNumber;
          name = prof.full_name || name;
          email = prof.email || email;

          if (prof.institution_id) {
            const { data: inst } = await (supabase.from('institutions') as any)
              .select('name')
              .eq('institution_id', prof.institution_id)
              .maybeSingle();
            if (inst?.name) institutionName = inst.name;
          }
        }

        // Additional fallback for students / parents
        if (!contactNumber || !name) {
          if (role === 'student') {
            const { data: stu } = await (supabase.from('students') as any)
              .select('name, phone, emergency_contact, parent_phone')
              .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
              .maybeSingle();
            if (stu) {
              name = stu.name || name;
              contactNumber = stu.phone || stu.emergency_contact || stu.parent_phone || contactNumber;
            }
          } else if (role === 'parent') {
            const { data: par } = await (supabase.from('parents') as any)
              .select('name, phone, emergency_phone')
              .eq('user_id', user.id)
              .maybeSingle();
            if (par) {
              name = par.name || name;
              contactNumber = par.phone || par.emergency_phone || contactNumber;
            }
          }
        }
      }

      const finalName = name || (user?.email ? user.email.split('@')[0] : 'App User');
      const finalContact = contactNumber || 'Not Provided';
      const finalEmail = email || user?.email || 'Not Provided';
      const userRole = role || 'user';

      // 1. Try atomic database function
      const { error: rpcErr } = await (supabase.rpc as any)('record_ad_lead', {
        p_ad_id: ad.id,
        p_user_id: user?.id || null,
        p_user_name: finalName,
        p_contact_number: finalContact,
        p_user_email: finalEmail,
        p_user_role: userRole,
        p_action_type: actionType
      });

      if (rpcErr) {
        // Fallback direct table insertion
        await (supabase.from('ad_leads') as any).insert({
          ad_id: ad.id,
          ad_title: ad.title || 'Sponsored Campaign',
          user_id: user?.id || null,
          user_name: finalName,
          contact_number: finalContact,
          user_email: finalEmail,
          user_role: userRole,
          institution_name: institutionName || null,
          action_type: actionType
        });
      }
    } catch (err) {
      console.warn('Could not record ad lead:', err);
    }
  };

  // Record Click Debit
  const recordAdClick = async (ad: any) => {
    if (!ad?.id || !ad?.is_admin_added) return;
    if (ad.ad_pricing_type === 'view') return; // Free clicks for View-only ads

    const now = Date.now();
    const lastClick = lastAdClickRef.current[ad.id] || 0;
    if (now - lastClick < 3000) return; // Prevent double debit within 3 seconds
    lastAdClickRef.current[ad.id] = now;

    try {
      const { error: rpcError } = await (supabase.rpc as any)('record_ad_click', { p_ad_id: ad.id });
      if (rpcError) {
        // Fallback: try record_ad_visit
        const { error: visitError } = await (supabase.rpc as any)('record_ad_visit', { p_ad_id: ad.id });
        if (visitError) {
          const { data: currentAd } = await (supabase.from('academic_events') as any)
            .select('paid_amount, amount_debited, cost_per_click, cost_per_visit, clicks_count, visits_count')
            .eq('id', ad.id)
            .single();

          if (currentAd) {
            const cost = Number(currentAd.cost_per_click || currentAd.cost_per_visit || ad.cost_per_click || ad.cost_per_visit || 2.5);
            const currentDebited = Number(currentAd.amount_debited || 0);
            const totalPaid = Number(currentAd.paid_amount || ad.paid_amount || 0);
            const newDebited = totalPaid > 0 ? Math.min(totalPaid, currentDebited + cost) : currentDebited + cost;
            const newClicks = Number(currentAd.clicks_count || currentAd.visits_count || 0) + 1;
            const newRemaining = Math.max(0, totalPaid - newDebited);

            await (supabase.from('academic_events') as any)
              .update({
                amount_debited: newDebited,
                remaining_balance: newRemaining,
                clicks_count: newClicks,
                visits_count: newClicks,
              })
              .eq('id', ad.id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to record ad click debit:', err);
    }
  };

  // Record View Impression Debit & Lead
  const recordAdView = async (ad: any) => {
    if (!ad?.id || !ad?.is_admin_added) return;

    // Log the user who viewed this ad in ad_leads
    recordAdLead(ad, 'view');

    // Only debit if this ad has view pricing (hybrid or view)
    if (ad.ad_pricing_type === 'click') return; // Free views for Click-only ads

    const now = Date.now();
    const lastView = lastDebitedViewRef.current[ad.id] || 0;
    // Impression cooldown: At most 1 debit per ad per 30 minutes for this user session
    // This ensures opening/closing the app repeatedly over months NEVER repeatedly deducts money!
    if (now - lastView < 30 * 60 * 1000) return;
    lastDebitedViewRef.current[ad.id] = now;

    try {
      const { error: rpcError } = await (supabase.rpc as any)('record_ad_view', { p_ad_id: ad.id });
      if (rpcError) {
        const { data: currentAd } = await (supabase.from('academic_events') as any)
          .select('paid_amount, amount_debited, cost_per_view, views_count')
          .eq('id', ad.id)
          .single();

        if (currentAd) {
          const cost = Number(currentAd.cost_per_view || ad.cost_per_view || 0.20);
          const currentDebited = Number(currentAd.amount_debited || 0);
          const totalPaid = Number(currentAd.paid_amount || ad.paid_amount || 0);
          const newDebited = totalPaid > 0 ? Math.min(totalPaid, currentDebited + cost) : currentDebited + cost;
          const newViews = Number(currentAd.views_count || 0) + 1;
          const newRemaining = Math.max(0, totalPaid - newDebited);

          await (supabase.from('academic_events') as any)
            .update({
              amount_debited: newDebited,
              remaining_balance: newRemaining,
              views_count: newViews,
            })
            .eq('id', ad.id);
        }
      }
    } catch (err) {
      console.warn('Failed to record ad view debit:', err);
    }
  };

  // 2. Mix Events and Ads with Google Ads Frequency Balancing & Dashboard Targeting
  const mixedData = React.useMemo(() => {
    let result: any[] = [];
    const now = new Date();

    const regularEvents: any[] = [];
    const sponsoredAds: any[] = [];

    events.forEach((event: any) => {
      if (event.is_admin_added) {
        // 1. Dashboard / Target Audience Matching
        const target = event.target_audience || 'all';
        const matchesDashboard = 
          target === 'all' || 
          !role || 
          role === 'admin' || 
          role === 'superadmin' || 
          target === role;

        if (!matchesDashboard) return;

        // 2. No Due Dates: Runs until sponsor paid amount is completely depleted
        const paid = Number(event.paid_amount || 0);
        if (paid > 0) {
          const remaining = Number(event.remaining_balance ?? paid);
          if (remaining <= 0) return; // budget fully exhausted
        }

        sponsoredAds.push(event);
      } else {
        // Regular institution event: check expiry
        if (event.end_date) {
          if (new Date(event.end_date) >= now) regularEvents.push(event);
        } else if (event.event_date) {
          const endOfDay = new Date(event.event_date);
          endOfDay.setHours(23, 59, 59, 999);
          if (endOfDay >= now) regularEvents.push(event);
        } else {
          regularEvents.push(event);
        }
      }
    });

    // 3. Frequency Balancing for Ads (Google Ads Style):
    // Ads least recently seen by this user appear first; recently seen ads cool down
    sponsoredAds.sort((a, b) => {
      const seenA = lastSeenAdRef.current[a.id] || 0;
      const seenB = lastSeenAdRef.current[b.id] || 0;
      return seenA - seenB;
    });

    // Merge balanced ads and regular events
    const combinedList = [...sponsoredAds, ...regularEvents];

    if (combinedList.length === 0) {
      return [{ type: 'ad' }];
    }

    combinedList.forEach((item: any, index: number) => {
      result.push({ ...(item as object), type: 'event' });
      if ((index + 1) % adInterval === 0) {
        result.push({ type: 'ad', id: `ad-${index}` });
      }
    });

    return result;
  }, [events, adInterval, role]);

  // Sync ref when activeIndex changes manually (e.g. from user scroll)
  useEffect(() => {
    indexRef.current = activeIndex;
  }, [activeIndex]);

  // Track initial/current visible ad on mount or when activeIndex updates
  useEffect(() => {
    if (mixedData && mixedData.length > 0) {
      const currentItem = mixedData[activeIndex] || mixedData[0];
      if (currentItem && currentItem.is_admin_added && currentItem.id) {
        lastSeenAdRef.current[currentItem.id] = Date.now();
        recordAdView(currentItem);
      }
    }
  }, [mixedData, activeIndex]);

  // Auto-scroll logic for infinite loop
  useEffect(() => {
    if (mixedData.length <= 1) return;

    const interval = setInterval(() => {
      // Calculate next index using the ref so we don't need to rebuild the interval
      const nextIndex = (indexRef.current + 1) % mixedData.length;
      try {
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        setActiveIndex(nextIndex);
        indexRef.current = nextIndex;
      } catch (err) {
        console.warn("Carousel scroll failed:", err);
      }
    }, 4000); // Scroll every 4 seconds

    return () => clearInterval(interval);
  }, [mixedData.length]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const top = viewableItems[0];
      const index = top.index;
      if (index !== null && index !== undefined) {
        setActiveIndex(index);
        indexRef.current = index;
      }

      // Track view for Google Ads frequency balancing & record impression debit
      const item = top.item;
      if (item && item.is_admin_added && item.id) {
        lastSeenAdRef.current[item.id] = Date.now();
        recordAdView(item);
      }
    }
  }).current;

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'ad') {
      return (
        <View style={styles.carouselItem}>
          <NativeAdItem adUnitID={nativeAdUnitID} />
        </View>
      );
    }

    const isSponsored = item.is_admin_added;

    return (
      <TouchableOpacity 
        style={styles.carouselItem} 
        onPress={async () => {
          if (isSponsored) {
            // Debit click cost only on actual user click/tap
            recordAdClick(item);
            // Capture user lead details
            recordAdLead(item);
          }

          if (item.hyperlink && isSponsored) {
            const cleanUrl = extractUrl(item.hyperlink);
            if (cleanUrl) {
              const supported = await Linking.canOpenURL(cleanUrl);
              if (supported) {
                Linking.openURL(cleanUrl).catch(err => console.error("Couldn't load page", err));
              } else {
                Alert.alert("Notice", "This link cannot be opened automatically.");
              }
            }
          } else {
            setSelectedEvent({
              title: item.title,
              description: item.description,
              startDate: item.start_date,
              category: item.category,
              bannerUrl: item.banner_url,
              hyperlink: item.hyperlink
            });
            setModalVisible(true);
          }
        }}
        activeOpacity={0.9}
      >
        <ImageBackground 
          source={item.banner_url ? { uri: item.banner_url } : undefined}
          style={styles.card}
          imageStyle={styles.cardImage}
          resizeMode="cover"
        >
          <View style={[styles.overlay, !item.banner_url && { backgroundColor: theme.colors.primary }]}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{isSponsored ? 'Sponsored' : 'Event'}</Text>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                
                <View style={styles.cardFooter}>
                  <Calendar size={12} color="white" {...({} as any)} />
                  <Text style={styles.cardDate}>
                    {new Date(item.start_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.actionIcon}>
                <ExternalLink size={18} color="white" {...({} as any)} />
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={mixedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || `carousel-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(data, index) => ({
          length: CAROUSEL_WIDTH,
          offset: CAROUSEL_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
        snapToInterval={CAROUSEL_WIDTH}
        decelerationRate="fast"
      />

      <View style={styles.pagination}>
        {mixedData.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              activeIndex === i ? styles.activeDot : null
            ]} 
          />
        ))}
      </View>

      <EventDetailModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        event={selectedEvent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  loadingContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    marginBottom: 24,
  },
  carouselItem: { width: CAROUSEL_WIDTH, marginRight: 0 },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
    height: 140,
  },
  cardImage: { opacity: 0.8 },
  overlay: {
    padding: 20,
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  cardBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 10,
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTextContainer: { flex: 1, paddingRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' },
  activeDot: { backgroundColor: theme.colors.primary, width: 14 }
});
