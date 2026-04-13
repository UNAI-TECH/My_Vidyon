import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { AD_UNITS, AdType, FORCE_TEST_ADS } from '../../../lib/AdsConfig';

interface AdBannerProps {
  type: AdType;
}

/**
 * A reusable Banner Ad component that dynamically selects the Ad Unit ID
 * based on the provided user type (e.g. STUDENT, FACULTY).
 */
export const AdBanner: React.FC<AdBannerProps> = ({ type }) => {
  if (Platform.OS === 'web') return null;
  // Safety check for Expo Go or environments without the native module
  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { BannerAd, BannerAdSize, TestIds } = adsModule;

    if (!BannerAd) return null;

    const adUnitId = AD_UNITS[type] || TestIds.BANNER;

    return (
      <View style={[styles.container, FORCE_TEST_ADS && styles.testContainer]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error: any) => {
            if (__DEV__ || FORCE_TEST_ADS) {
              console.warn(`[AdMob] ${type} Banner failed to load:`, error);
            }
          }}
        />
      </View>
    );
  } catch (error) {
    if (__DEV__) {
      console.log(`[AdMob] ${type} Banner could not be rendered (Native Module load failed - Expo Go).`);
    }
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    width: '100%',
    minHeight: 60, // Ensure space is reserved for the banner
  },
  testContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginVertical: 8,
  },
});

