import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { type ReactNode } from 'react';
import { useTheme } from '../theme';

export function Shell({ children }: { children: ReactNode }) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}
