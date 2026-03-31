import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { theme } from '../../../theme';

// Use require for better compatibility with Expo and potential module loading issues
let Ads: any = null;
try {
  Ads = require('react-native-google-mobile-ads');
} catch (e) {
  // Module not available
}

interface NativeAdItemProps {
  adUnitID: string;
}

export const NativeAdItem: React.FC<NativeAdItemProps> = ({ adUnitID }) => {
  if (!Ads || !Ads.NativeAdView) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const {
    NativeAdView,
    AdBadge,
    CallToActionView,
    HeadlineView,
    ImageView,
    StarRatingView,
    TaglineView,
    AdvertiserView,
  } = Ads;

  // Final safety check for sub-components to prevent "Element type is invalid" crash
  if (!NativeAdView || !AdBadge || !CallToActionView || !HeadlineView || !ImageView || !TaglineView) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NativeAdView
      adUnitID={adUnitID}
      style={styles.container}
    >
      <View style={styles.adContent}>
        {/* Ad Badge */}
        <View style={styles.badgeWrapper}>
          <AdBadge style={styles.adBadge} textStyle={styles.adBadgeText} />
        </View>

        <View style={styles.mainContent}>
          <View style={styles.leftContent}>
             <HeadlineView
                style={styles.headline}
                numberOfLines={1}
              />
              <TaglineView
                style={styles.tagline}
                numberOfLines={2}
              />
              <AdvertiserView
                style={styles.advertiser}
              />
          </View>
          
          <View style={styles.rightContent}>
             <ImageView
                style={styles.image}
                resizeMode="cover"
              />
          </View>
        </View>

        <View style={styles.footer}>
           <StarRatingView style={styles.starRating} size={12} />
           <CallToActionView
              style={styles.cta}
              textStyle={styles.ctaText}
              allowFontScaling={true}
            />
        </View>
      </View>
    </NativeAdView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    height: 140, // Match the AdCard height exactly
    width: '100%',
  },
  loadingContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adContent: {
    padding: 16,
    flex: 1,
  },
  badgeWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  adBadge: {
    width: 60,
    height: 20,
    borderBottomLeftRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  leftContent: {
    flex: 1,
    paddingRight: 12,
  },
  rightContent: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headline: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  advertiser: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  starRating: {
    width: 60,
  },
  cta: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
