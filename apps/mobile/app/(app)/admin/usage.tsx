import React from 'react';
import { Text, View } from 'react-native';
import { formatCost } from '@axiom/shared';
import { useUsage } from '../../../src/api/hooks';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { Card, EmptyState, ErrorState, ProgressBar, Screen, Spinner, Stat } from '../../../src/ui';

export default function Usage() {
  const t = useTheme();
  const u = useUsage();
  if (u.isLoading) return <Spinner />;
  if (u.isError || !u.data) return <ErrorState message="Could not load usage." onRetry={() => u.refetch()} />;
  const d = u.data, pct = d.mediaQuota ? Math.round((d.mediaUsed / d.mediaQuota) * 100) : 0, max = Math.max(1, ...d.byModel.map(x => x.requests));
  return (
    <Screen title="Usage" subtitle="Requests and cost across all models">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat label="Total requests" value={d.totalRequests.toLocaleString()} />
        <Stat label="Total cost" value={formatCost(d.totalCost)} />
        <Stat label="Media quota (this month)" value={`${pct}%`}><ProgressBar value={pct} /><Text style={{ color: t.colors.muted, fontSize: t.font.xs }}>{d.mediaUsed} of {d.mediaQuota} jobs</Text></Stat>
      </View>
      <Card title="By model">
        {d.byModel.length ? d.byModel.map(x => (
          <View key={x.model} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: t.colors.text, fontWeight: '600' }}>{x.model}</Text><Text style={{ color: t.colors.muted }}>{x.requests} requests · {formatCost(x.cost)}</Text></View>
            <ProgressBar value={(x.requests / max) * 100} />
          </View>)) : <EmptyState icon="stats-chart-outline" title="No data yet" hint="Be the first to add something." />}
      </Card>
    </Screen>
  );
}
