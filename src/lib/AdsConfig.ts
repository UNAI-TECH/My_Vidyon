// AdMob Configuration Mapping
// These IDs are mapped based on the user roles and dashboard types.
// We use Google's official Test IDs in development mode to prevent account suspension.

export const AD_UNITS = {
  STUDENT: __DEV__ 
    ? 'ca-app-pub-3940256099942544/6300978111' 
    : 'ca-app-pub-8782577961794696/8769558604',
    
  FACULTY: __DEV__ 
    ? 'ca-app-pub-3940256099942544/6300978111' 
    : 'ca-app-pub-8782577961794696/2200280822',
    
  INSTITUTION: __DEV__ 
    ? 'ca-app-pub-3940256099942544/6300978111' 
    : 'ca-app-pub-8782577961794696/6853841703',
    
  PARENT: __DEV__ 
    ? 'ca-app-pub-3940256099942544/6300978111' 
    : 'ca-app-pub-8782577961794696/3089653250',
    
  CANTEEN: __DEV__ 
    ? 'ca-app-pub-3940256099942544/6300978111' 
    : 'ca-app-pub-8782577961794696/8150408246',
    
  ACCOUNTANT: __DEV__ 
    ? 'ca-app-pub-3940256099942544/6300978111' 
    : 'ca-app-pub-8782577961794696/2008709130',
};

export type AdType = keyof typeof AD_UNITS;
