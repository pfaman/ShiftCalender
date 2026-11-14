import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, useColorScheme, type ImageStyle, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

export type Colors = {
  bg: string; // screen background
  card: string; // sheets, tab bar, raised surfaces
  surface: string; // chips, inputs' fill, empty calendar cells
  border: string;
  text: string;
  text2: string; // secondary text
  muted: string;
  primary: string; // button fill (white text on top)
  accent: string; // teal used as text / outline
  tint: string; // soft teal background
  tintStrong: string;
  danger: string;
  placeholder: string;
  header: string; // top app bar
  onHeader: string;
  onHeaderMuted: string;
};

export const LIGHT: Colors = {
  bg: '#FFFFFF', card: '#FFFFFF', surface: '#F3F4F6', border: '#E5E7EB',
  text: '#111827', text2: '#374151', muted: '#6B7280',
  primary: '#0F766E', accent: '#0F766E', tint: '#F0FDFA', tintStrong: '#CCFBF1',
  danger: '#DC2626', placeholder: '#9CA3AF',
  header: '#134E4A', onHeader: '#FFFFFF', onHeaderMuted: '#FFFFFFAA',
};

export const DARK: Colors = {
  bg: '#0B1220', card: '#131C2E', surface: '#1E293B', border: '#334155',
  text: '#F8FAFC', text2: '#CBD5E1', muted: '#94A3B8',
  primary: '#0F766E', accent: '#5EEAD4', tint: '#0F2A2A', tintStrong: '#134E4A',
  danger: '#F87171', placeholder: '#64748B',
  header: '#0B2F2D', onHeader: '#FFFFFF', onHeaderMuted: '#FFFFFF99',
};

type Pref = 'system' | 'light' | 'dark';
type Ctx = { c: Colors; isDark: boolean };
const ThemeContext = createContext<Ctx>({ c: LIGHT, isDark: false });

export function ThemeProvider({ pref, children }: { pref: Pref; children: ReactNode }) {
  const system = useColorScheme();
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const value = useMemo(() => ({ c: isDark ? DARK : LIGHT, isDark }), [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Styles that depend on the theme: `const useStyles = makeStyles((c) => ({...}))`, then `const styles = useStyles()`.
type StyleMap = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends StyleMap>(fn: (c: Colors) => T) {
  return function useStyles(): T {
    const { c } = useTheme();
    return useMemo(() => StyleSheet.create(fn(c)), [c]);
  };
}

// Drop-in Text / TextInput that default to the theme's text color.
export function Text({ style, ...rest }: TextProps) {
  const { c } = useTheme();
  return <RNText {...rest} style={[{ color: c.text }, style]} />;
}

export function TextInput({ style, ...rest }: TextInputProps) {
  const { c } = useTheme();
  return <RNTextInput placeholderTextColor={c.placeholder} {...rest} style={[{ color: c.text }, style]} />;
}
