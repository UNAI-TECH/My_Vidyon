export const initAdMob = () => {
    try {
      const mobileAds = require('react-native-google-mobile-ads').default;
      
      if (typeof mobileAds === 'function' || mobileAds) {
        (typeof mobileAds === 'function' ? mobileAds() : mobileAds)
          .initialize()
          .then((adapterStatuses: any) => {
            if (__DEV__) {
              console.log('[AdMob] SDK Initialized', adapterStatuses);
            }
          })
          .catch((err: any) => {
            if (__DEV__) console.warn('[AdMob] Initialization Error:', err);
          });
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[AdMob] Native module not found or failed to load. Skipping init (Expo Go).');
      }
    }
};
