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
  gradients: {
    primary: ['#FAB75A', '#F59E0B'] as const,
    surface: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'] as const,
    danger: ['#EF4444', '#DC2626'] as const,
  },
  blur: {
    intensity: 20,
  }
};
