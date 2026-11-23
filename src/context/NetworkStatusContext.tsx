// ============================================================
// File: src/context/NetworkStatusContext.tsx
// Purpose: Global network connectivity monitoring and offline banner.
// ============================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { theme } from '../theme';

interface NetworkStatusContextType {
  isOnline: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  checkConnection: async () => true,
});

export const useNetworkStatus = () => useContext(NetworkStatusContext);

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        if (!navigator.onLine) {
          setIsOnline(false);
          setIsChecking(false);
          return false;
        }
      }

      // Try lightweight probe
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      setIsOnline(true);
      setIsChecking(false);
      return true;
    } catch {
      setIsOnline(false);
      setIsChecking(false);
      return false;
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => {
        setIsOnline(true);
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3500);
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initial check
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, checkConnection }}>
      {children}

      {/* Floating Offline Alert Banner */}
      {!isOnline && (
        <View style={styles.bannerContainer}>
          <View style={styles.offlineBanner}>
            <View style={styles.bannerLeft}>
              <View style={styles.iconCircleOffline}>
                <WifiOff size={14} color="#EA580C" {...({} as any)} />
              </View>
              <View>
                <Text style={styles.bannerTitle}>You're Offline</Text>
                <Text style={styles.bannerSub}>Showing cached campus records</Text>
              </View>
            </View>

            <View style={styles.bannerRight}>
              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => router.push('/offline')}
              >
                <Text style={styles.detailsBtnText}>Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={checkConnection}
                disabled={isChecking}
              >
                <RefreshCw size={13} color="#1E293B" {...({} as any)} />
                <Text style={styles.retryBtnText}>{isChecking ? '...' : 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Temporary Back Online Banner */}
      {showRestored && isOnline && (
        <View style={styles.bannerContainer}>
          <View style={styles.restoredBanner}>
            <CheckCircle2 size={15} color="#059669" style={{ marginRight: 8 }} {...({} as any)} />
            <Text style={styles.restoredText}>Back Online — Campus sync restored</Text>
          </View>
        </View>
      )}
    </NetworkStatusContext.Provider>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 12 : 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    maxWidth: 520,
    width: '100%',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleOffline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  bannerSub: {
    fontSize: 10,
    color: '#B45309',
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(254, 243, 199, 0.8)',
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  restoredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  restoredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
});
