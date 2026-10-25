import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
interface Props {
  title?: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName;
  loading?: boolean; disabled?: boolean; small?: boolean; full?: boolean; style?: ViewStyle; accessibilityLabel?: string;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, full, style, accessibilityLabel }: Props) {
  const t = useTheme();
  const off = disabled || loading;
  const fg = variant === 'primary' ? t.colors.primaryText : variant === 'danger' ? t.colors.danger : t.colors.text;
  const body = (
    <View style={[s.row, { paddingVertical: small ? 7 : 11, paddingHorizontal: small ? 12 : 16 }]}>
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={small ? 15 : 18} color={fg} /> : null}
      {title ? <Text style={{ color: fg, fontWeight: '600', fontSize: small ? t.font.sm : t.font.md }}>{title}</Text> : null}
    </View>
  );
  const box: ViewStyle = { borderRadius: t.radius.md, overflow: 'hidden', opacity: off ? 0.55 : 1, alignSelf: full ? 'stretch' : 'flex-start' };
  const outline: ViewStyle = variant === 'secondary' ? { backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.border }
    : variant === 'danger' ? { borderWidth: 1, borderColor: t.colors.danger } : {};
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} style={({ pressed }) => [box, outline, pressed && { opacity: 0.8 }, style]}>
      {variant === 'primary' ? <LinearGradient colors={[...t.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{body}</LinearGradient> : body}
    </Pressable>
  );
}
export function IconButton({ icon, onPress, label, color, size = 20 }: { icon: IconName; onPress?: () => void; label: string; color?: string; size?: number }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [{ padding: 6, borderRadius: t.radius.sm, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={size} color={color ?? t.colors.muted} />
    </Pressable>
  );
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 } });
