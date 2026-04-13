import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

export const HeaderLogo = () => {
  const { width } = useWindowDimensions();
  
  if (width >= 1024) return null;

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../../assets/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    paddingLeft: 16,
    width: 200, 
  },
  logo: {
    width: 140,
    height: 40,
    backgroundColor: 'transparent',
    transform: [{ scale: 1.65 }],
    marginLeft: 12,
  },
});
