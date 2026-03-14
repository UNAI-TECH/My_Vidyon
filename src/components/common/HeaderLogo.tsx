import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export const HeaderLogo = () => {
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
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingLeft: 4,
    width: 120, // max width permitted in header left
  },
  logo: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
