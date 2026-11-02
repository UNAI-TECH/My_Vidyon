import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { User as UserIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useAccountSwitcher } from '../../context/AccountSwitcherContext';
import { theme } from '../../theme';

interface ProfileTabIconProps {
  color: any;
  focused?: boolean;
}

export const ProfileTabIcon: React.FC<ProfileTabIconProps> = ({ color, focused }) => {
  const { imageUrl, institutionLogo, role } = useAuth();
  const [imgError, setImgError] = React.useState(false);

  const effectiveImage = imageUrl || ((role === 'institution' || role === 'admin') ? institutionLogo : null);

  React.useEffect(() => {
    setImgError(false);
  }, [effectiveImage]);

  const hasValidImage = Boolean(
    effectiveImage &&
    !imgError &&
    typeof effectiveImage === 'string' &&
    (effectiveImage.startsWith('http') || effectiveImage.startsWith('data:'))
  );

  if (hasValidImage) {
    return (
      <View
        style={[
          styles.imageWrapper,
          focused && styles.imageWrapperFocused,
          focused && { borderColor: color },
        ]}
      >
        <Image
          source={{ uri: effectiveImage! }}
          style={styles.avatarImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconWrapper,
        focused && styles.iconWrapperFocused,
        focused && { borderColor: color, backgroundColor: `${color}18` },
      ]}
    >
      <UserIcon size={16} color={color} {...({} as any)} />
    </View>
  );
};

export const ProfileTabBarButton: React.FC<any> = (props) => {
  const { openAccountSwitcher } = useAccountSwitcher();

  return (
    <TouchableOpacity
      {...props}
      activeOpacity={0.7}
      delayLongPress={350}
      onPress={(e) => {
        props.onPress?.(e);
      }}
      onLongPress={(e) => {
        if (Platform.OS !== 'web') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (err) {}
        }
        openAccountSwitcher();
      }}
    >
      {props.children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  imageWrapper: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapperFocused: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  iconWrapper: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperFocused: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});
