import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const [shortDimension, longDimension] = width < height ? [width, height] : [height, width];

// Guidelines for normalization based on a standard phone size
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number) => (shortDimension / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (longDimension / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const isSmallDevice = width < 375;

export const theme = {
  colors: {
    primary: '#FAB75A',
    secondary: '#F59E0B',
    accent: '#10B981',
    background: '#F8F9F3', // Light beige from HSL 46 66% 83%
    glass: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(0, 0, 0, 0.1)',
    text: '#1E293B',
    textMuted: '#64748B',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
  },
  metrics: {
    width,
    height,
    isSmallDevice,
    isTablet: width > 768,
    headerHeight: 60,
    normalize: moderateScale,
    verticalScale,
  },
  gradients: {
    primary: ['#FAB75A', '#F59E0B'] as const,
    surface: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'] as const,
    danger: ['#EF4444', '#DC2626'] as const,
  },
  blur: {
    intensity: 20,
  }
};
