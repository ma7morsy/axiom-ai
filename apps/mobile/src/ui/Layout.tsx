import React from 'react';
import { Pressable, ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useBreakpoint } from '../hooks/useBreakpoint';

export function Card({ children, style, title, right }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; title?: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: 16, gap: 12 }, style]}>
      {title ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text accessibilityRole="header" style={{ color: t.colors.text, fontWeight: '700', fontSize: t.font.lg }}>{title}</Text>{right}</View> : null}
      {children}
    </View>
  );
}

/** Scrolling page body with a readable max width. */
export function Screen({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  const t = useTheme();
  const { isMobile } = useBreakpoint();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.colors.bg }} contentContainerStyle={{ padding: isMobile ? 14 : 24, gap: 16, maxWidth: 1100, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ flexShrink: 1 }}>
          <Text accessibilityRole="header" style={{ color: t.colors.text, fontSize: t.font.xl, fontWeight: '800' }}>{title}</Text>
          {subtitle ? <Text style={{ color: t.colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export interface Column<R> { key: string; title: string; flex?: number; render: (row: R) => React.ReactNode; hideOnMobile?: boolean }
export function Table<R>({ columns, rows, rowKey, onRowPress }: { columns: Column<R>[]; rows: R[]; rowKey: (r: R) => string; onRowPress?: (r: R) => void }) {
  const t = useTheme();
  const { isMobile } = useBreakpoint();
  const cols = columns.filter(c => !(isMobile && c.hideOnMobile));
  return (
    <View style={{ borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', backgroundColor: t.colors.surfaceAlt, paddingVertical: 9, paddingHorizontal: 12 }}>
        {cols.map(c => <Text key={c.key} style={{ flex: c.flex ?? 1, color: t.colors.muted, fontSize: t.font.xs, fontWeight: '700' }}>{c.title}</Text>)}
      </View>
      {rows.map(r => (
        <Pressable key={rowKey(r)} disabled={!onRowPress} onPress={() => onRowPress?.(r)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.colors.border }}>
          {cols.map(c => <View key={c.key} style={{ flex: c.flex ?? 1, paddingRight: 8 }}>{c.render(r)}</View>)}
        </Pressable>
      ))}
    </View>
  );
}

export function Tabs<V extends string>({ value, tabs, onChange }: { value: V; tabs: { value: V; label: string }[]; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
      {tabs.map(x => (
        <Pressable key={x.value} onPress={() => onChange(x.value)} accessibilityRole="tab" accessibilityState={{ selected: x.value === value }}
          style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: x.value === value ? t.colors.primary : 'transparent' }}>
          <Text style={{ color: x.value === value ? t.colors.text : t.colors.muted, fontWeight: x.value === value ? '700' : '500' }}>{x.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? t.colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.42 }}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

export function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 150, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.md, padding: 14, gap: 4 }}>
      <Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{label}</Text>
      <Text style={{ color: t.colors.text, fontSize: t.font.xl, fontWeight: '800' }}>{value}</Text>
      {children}
    </View>
  );
}
export const ProgressBar = ({ value }: { value: number }) => {
  const t = useTheme();
  return <View style={{ height: 6, borderRadius: 3, backgroundColor: t.colors.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: 6, backgroundColor: t.colors.primary }} /></View>;
};
