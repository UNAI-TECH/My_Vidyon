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
  const { user, institutionUuid } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const indexRef = useRef(0);
 
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

  // 2. Mix Events and Ads
  const mixedData = React.useMemo(() => {
    let result: any[] = [];
    if (events.length === 0) {
       return [{ type: 'ad' }];
    }

    events.forEach((event: any, index: number) => {
      result.push({ ...(event as object), type: 'event' });
      if ((index + 1) % adInterval === 0) {
        result.push({ type: 'ad', id: `ad-${index}` });
      }
    });

    return result;
  }, [events, adInterval]);

  // Sync ref when activeIndex changes manually (e.g. from user scroll)
  useEffect(() => {
    indexRef.current = activeIndex;
  }, [activeIndex]);

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
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setActiveIndex(index);
        indexRef.current = index;
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
