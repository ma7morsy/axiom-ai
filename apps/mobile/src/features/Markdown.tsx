import React from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { isRtl } from '@axiom/shared';
import { useTheme } from '../theme/ThemeProvider';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function Inline({ text, color, size }: { text: string; color: string; size: number }) {
  const t = useTheme();
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return (
    <Text style={{ color, fontSize: size, lineHeight: size * 1.55, textAlign: isRtl(text) ? 'right' : 'left', writingDirection: isRtl(text) ? 'rtl' : 'ltr' }}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <Text key={i} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text>
        : p.startsWith('`') && p.endsWith('`') && p.length > 2 ? <Text key={i} style={{ fontFamily: mono, backgroundColor: t.colors.surfaceAlt }}>{p.slice(1, -1)}</Text>
        : p.startsWith('*') && p.endsWith('*') && p.length > 2 ? <Text key={i} style={{ fontStyle: 'italic' }}>{p.slice(1, -1)}</Text>
        : p)}
    </Text>
  );
}

type Block = { k: 'h'; level: number; text: string } | { k: 'p'; text: string } | { k: 'li'; text: string; n?: number } | { k: 'code'; text: string } | { k: 'table'; rows: string[][] };

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r/g, '').split('\n'), out: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.startsWith('```')) { const buf: string[] = []; i++; while (i < lines.length && !lines[i]!.startsWith('```')) buf.push(lines[i++]!); out.push({ k: 'code', text: buf.join('\n') }); continue; }
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i]!)) rows.push(lines[i]!.trim().slice(1, -1).split('|').map(c => c.trim())); i++; }
      i--; out.push({ k: 'table', rows }); continue;
    }
    const h = /^(#{1,4})\s+(.*)/.exec(l); if (h) { out.push({ k: 'h', level: h[1]!.length, text: h[2]! }); continue; }
    const li = /^\s*[-*•]\s+(.*)/.exec(l); if (li) { out.push({ k: 'li', text: li[1]! }); continue; }
    const ol = /^\s*(\d+)[.)]\s+(.*)/.exec(l); if (ol) { out.push({ k: 'li', text: ol[2]!, n: Number(ol[1]) }); continue; }
    if (l.trim()) out.push({ k: 'p', text: l.trim() });
  }
  return out;
}

export function Markdown({ text, color, size = 15 }: { text: string; color?: string; size?: number }) {
  const t = useTheme();
  const c = color ?? t.colors.text;
  return (
    <View style={{ gap: 6 }}>
      {parseMarkdown(text).map((b, i) => {
        if (b.k === 'h') return <Text key={i} accessibilityRole="header" style={{ color: c, fontWeight: '800', fontSize: size + (5 - b.level) * 1.5, marginTop: 4, textAlign: isRtl(b.text) ? 'right' : 'left' }}>{b.text}</Text>;
        if (b.k === 'li') return <View key={i} style={{ flexDirection: isRtl(b.text) ? 'row-reverse' : 'row', gap: 8, paddingLeft: 4 }}><Text style={{ color: c, fontSize: size }}>{b.n ? `${b.n}.` : '•'}</Text><View style={{ flex: 1 }}><Inline text={b.text} color={c} size={size} /></View></View>;
        if (b.k === 'code') return <ScrollView key={i} horizontal style={{ backgroundColor: t.colors.surfaceAlt, borderRadius: 8, padding: 10 }}><Text selectable style={{ fontFamily: mono, color: c, fontSize: size - 2 }}>{b.text}</Text></ScrollView>;
        if (b.k === 'table') return (
          <ScrollView key={i} horizontal><View style={{ borderWidth: 1, borderColor: t.colors.border, borderRadius: 8 }}>
            {b.rows.map((r, ri) => <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri === 0 ? t.colors.surfaceAlt : 'transparent', borderTopWidth: ri ? 1 : 0, borderTopColor: t.colors.border }}>
              {r.map((cell, ci) => <View key={ci} style={{ width: 150, padding: 8 }}><Text style={{ color: c, fontSize: size - 1, fontWeight: ri === 0 ? '700' : '400' }}>{cell}</Text></View>)}
            </View>)}
          </View></ScrollView>
        );
        return <Inline key={i} text={b.text} color={c} size={size} />;
      })}
    </View>
  );
}
