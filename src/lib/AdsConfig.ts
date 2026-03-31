// AdMob Configuration Mapping
// These IDs are mapped based on the user roles and dashboard types.
// We use Google's official Test IDs in development mode to prevent account suspension.

// SET THIS TO FALSE WHEN YOU ARE READY FOR PRODUCTION
export const FORCE_TEST_ADS = true; 

const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

export const AD_UNITS = {
  STUDENT: (FORCE_TEST_ADS || __DEV__) 
    ? TEST_BANNER_ID 
    : 'ca-app-pub-8782577961794696/8769558604',
    
  FACULTY: (FORCE_TEST_ADS || __DEV__) 
    ? TEST_BANNER_ID 
    : 'ca-app-pub-8782577961794696/2200280822',
    
  INSTITUTION: (FORCE_TEST_ADS || __DEV__) 
    ? TEST_BANNER_ID 
    : 'ca-app-pub-8782577961794696/6853841703',
    
  PARENT: (FORCE_TEST_ADS || __DEV__) 
    ? TEST_BANNER_ID 
    : 'ca-app-pub-8782577961794696/3089653250',
    
  CANTEEN: (FORCE_TEST_ADS || __DEV__) 
    ? TEST_BANNER_ID 
    : 'ca-app-pub-8782577961794696/8150408246',
    
  ACCOUNTANT: (FORCE_TEST_ADS || __DEV__) 
    ? TEST_BANNER_ID 
    : 'ca-app-pub-8782577961794696/2008709130',
};

export type AdType = keyof typeof AD_UNITS;

