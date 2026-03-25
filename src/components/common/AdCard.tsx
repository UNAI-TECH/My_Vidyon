import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { theme } from '../../theme';
import { ExternalLink } from 'lucide-react-native';

interface AdCardProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
}

export const AdCard: React.FC<AdCardProps> = ({
  title = "Unlock Premium Features!",
  description = "Get an exclusive 20% discount on Unai Tech Pro subscriptions this week.",
  imageUrl,
  linkUrl = "https://unaitech.com/products"
}) => {
  const handlePress = () => {
    Linking.openURL(linkUrl);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.adBadgeContainer}>
        <Text style={styles.adBadgeText}>Sponsored</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
        </View>
        <View style={styles.iconContainer}>
          <ExternalLink size={20} color={theme.colors.primary} {...({} as any)} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  adBadgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 16,
  },
  adBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)', // Matches primary color mostly
    justifyContent: 'center',
    alignItems: 'center',
  },
});
