import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Modal } from './Overlays';

export function Input({ label, error, hint, ...p }: TextInputProps & { label?: string; error?: string; hint?: string }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: t.colors.text, fontWeight: '600', fontSize: t.font.sm }}>{label}</Text> : null}
      <TextInput
        {...p} placeholderTextColor={t.colors.muted} onFocus={e => { setFocus(true); p.onFocus?.(e); }} onBlur={e => { setFocus(false); p.onBlur?.(e); }}
        accessibilityLabel={label}
        style={[{ borderWidth: 1.5, borderColor: error ? t.colors.danger : focus ? t.colors.primary : t.colors.border, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 10,
          color: t.colors.text, backgroundColor: t.colors.surface, fontSize: t.font.md, minHeight: p.multiline ? 90 : undefined, textAlignVertical: p.multiline ? 'top' : 'center' }, p.style]}
      />
      {error ? <Text style={{ color: t.colors.danger, fontSize: t.font.xs }}>{error}</Text> : hint ? <Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{hint}</Text> : null}
    </View>
  );
}

export interface Option<V extends string = string> { value: V; label: string }
export function Select<V extends string>({ label, value, options, onChange }: { label?: string; value: V; options: Option<V>[]; onChange: (v: V) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: t.colors.text, fontWeight: '600', fontSize: t.font.sm }}>{label}</Text> : null}
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}
        style={{ borderWidth: 1.5, borderColor: t.colors.border, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.colors.surface }}>
        <Text style={{ color: t.colors.text, fontSize: t.font.md }}>{cur?.label ?? 'Select'}</Text>
        <Ionicons name="chevron-down" size={16} color={t.colors.muted} />
      </Pressable>
      <Modal visible={open} onClose={() => setOpen(false)} title={label ?? 'Select'}>
        <FlatList data={options} keyExtractor={o => o.value} style={{ maxHeight: 360 }} renderItem={({ item }) => (
          <Pressable onPress={() => { onChange(item.value); setOpen(false); }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.text, fontSize: t.font.md, fontWeight: item.value === value ? '700' : '400' }}>{item.label}</Text>
            {item.value === value ? <Ionicons name="checkmark" size={18} color={t.colors.primary} /> : null}
          </Pressable>
        )} />
      </Modal>
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: checked ? t.colors.primary : t.colors.border, backgroundColor: checked ? t.colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <Text style={{ color: t.colors.text, fontSize: t.font.sm, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: Option<V>[]; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={[s.seg, { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md }]}>
      {options.map(o => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: o.value === value }}
          style={{ flex: 1, paddingVertical: 8, borderRadius: t.radius.sm, alignItems: 'center', backgroundColor: o.value === value ? t.colors.primary : 'transparent' }}>
          <Text style={{ color: o.value === value ? t.colors.primaryText : t.colors.muted, fontWeight: '600', fontSize: t.font.sm }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({ seg: { flexDirection: 'row', padding: 3, gap: 2 } });
