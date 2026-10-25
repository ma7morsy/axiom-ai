import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCost, groupByDay, isRtl } from './format';

const c = (id: string, updatedAt: string) => ({ id, agentId: 'a', agentName: 'A', title: id, updatedAt, messageCount: 1 });

test('groups conversations by day label', () => {
  const now = new Date('2026-10-24T12:00:00');
  const g = groupByDay([c('1', '2026-10-24T09:00:00'), c('2', '2026-10-23T09:00:00'), c('3', '2026-10-01T09:00:00')], now);
  assert.deepEqual(g.map(x => x.label), ['Today', 'Yesterday', 'Earlier']);
});
test('formats cost', () => { assert.equal(formatCost(142.3), '$142.30'); assert.equal(formatCost(0.05), '$0.05'); });
test('detects arabic', () => { assert.equal(isRtl('مرحبا'), true); assert.equal(isRtl('hello'), false); });
