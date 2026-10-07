import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { theme } from '../../theme';
import { MapPin, ExternalLink, Navigation, Compass } from 'lucide-react-native';

interface LocationMapPreviewProps {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  mapLink?: string | null;
  institutionName?: string;
}

export function LocationMapPreview({
  addressLine1,
  addressLine2,
  city,
  state,
  pincode,
  latitude,
  longitude,
  mapLink,
  institutionName = 'Campus Location'
}: LocationMapPreviewProps) {
  const latNum = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lngNum = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  const hasCoordinates = !isNaN(latNum as number) && !isNaN(lngNum as number) && latNum !== null && lngNum !== null && latNum !== 0;

  const fullAddress = [addressLine1, addressLine2, city, state, pincode]
    .filter(Boolean)
    .join(', ');

  const getEffectiveMapUrl = () => {
    if (mapLink && mapLink.trim().length > 0) return mapLink.trim();
    if (hasCoordinates) return `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`;
    if (fullAddress) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    return null;
  };

  const effectiveUrl = getEffectiveMapUrl();

  const handleOpenMap = () => {
    if (effectiveUrl) {
      if (Platform.OS === 'web') {
        window.open(effectiveUrl, '_blank');
      } else {
        Linking.openURL(effectiveUrl);
      }
    }
  };

  if (!fullAddress && !hasCoordinates && !mapLink) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <MapPin size={18} color="#B45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Campus Location & Geo-Coordinates</Text>
          <Text style={styles.subtitle}>Verified institution geographic mapping</Text>
        </View>
        {effectiveUrl && (
          <TouchableOpacity style={styles.openBtn} onPress={handleOpenMap}>
            <ExternalLink size={14} color="#B45309" />
            <Text style={styles.openBtnText}>Open Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {fullAddress ? (
        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>STRUCTURED ADDRESS</Text>
          <Text style={styles.addressText}>{fullAddress}</Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Navigation size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>
            Latitude: <Text style={styles.metaValue}>{hasCoordinates ? (latNum as number).toFixed(6) : 'Not specified'}</Text>
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Compass size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText}>
            Longitude: <Text style={styles.metaValue}>{hasCoordinates ? (lngNum as number).toFixed(6) : 'Not specified'}</Text>
          </Text>
        </View>
      </View>

      {/* Web Interactive Pin Preview */}
      {Platform.OS === 'web' && hasCoordinates && (
        <View style={styles.mapIframeContainer}>
          <iframe
            title="Campus Map Preview"
            width="100%"
            height="180"
            style={{ border: 'none', borderRadius: 8 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${(lngNum as number) - 0.008}%2C${(latNum as number) - 0.008}%2C${(lngNum as number) + 0.008}%2C${(latNum as number) + 0.008}&layer=mapnik&marker=${latNum}%2C${lngNum}`}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  subtitle: {
    fontSize: 11,
    color: '#B45309',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  openBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  addressBox: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 10,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontWeight: '600',
    color: '#1E293B',
  },
  mapIframeContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  }
});
