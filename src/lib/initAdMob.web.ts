export const initAdMob = () => {
    // Web does not support or need React Native Google Mobile Ads currently.
    if (__DEV__) {
      console.log('[AdMob] Skipping AdMob initialization on Web environment.');
    }
};
