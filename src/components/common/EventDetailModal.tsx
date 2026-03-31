import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Linking,
  Dimensions,
  Image
} from 'react-native';
import { theme } from '../../theme';
import { X, Calendar, MapPin, ExternalLink, Info } from 'lucide-react-native';

interface EventDetailModalProps {
  visible: boolean;
  onClose: () => void;
  event: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    category?: string;
    bannerUrl?: string;
    hyperlink?: string;
  } | null;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ 
  visible, 
  onClose, 
  event 
}) => {
  if (!event) return null;

  const handleLink = () => {
    if (event.hyperlink) {
      Linking.openURL(event.hyperlink);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header Image or Category Placeholder */}
          {event.bannerUrl ? (
            <Image 
              source={{ uri: event.bannerUrl }} 
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.categoryHeader, { backgroundColor: theme.colors.primary + '10' }]}>
               <Info size={40} color={theme.colors.primary} {...({} as any)} />
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="white" {...({} as any)} />
          </TouchableOpacity>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category || 'Academic Event'}</Text>
            </View>

            <Text style={styles.title}>{event.title}</Text>

            <View style={styles.metaRow}>
              <Calendar size={16} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.metaText}>{formatDate(event.startDate)}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Details</Text>
            <Text style={styles.description}>
              {event.description || 'No additional details provided for this event.'}
            </Text>

            {event.hyperlink && (
              <TouchableOpacity style={styles.linkBtn} onPress={handleLink}>
                <ExternalLink size={18} color="white" {...({} as any)} />
                <Text style={styles.linkBtnText}>Visit Event Link</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: Dimensions.get('window').height * 0.8,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: 200,
  },
  categoryHeader: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textMuted,
    lineHeight: 24,
    marginBottom: 32,
  },
  linkBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  linkBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dismissBtn: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  dismissBtnText: {
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  }
});
