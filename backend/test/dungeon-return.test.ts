import assert from 'node:assert/strict';
import test from 'node:test';
import type pg from 'pg';
import type { MarchRow } from '../api/src/views';
import { createReturnMarch } from '../worker/src/tick-shared';

const march = {
  id: 'out', account_id: 'account', from_city_id: 'city', x: 50, y: 50,
  troops: { supply_wagon: 2, swordsman: 10 }, purpose: 'dungeon', initiator: 'player',
  status: 'marching', started_at: new Date(0), arrive_at: new Date(1000), resolved_at: null,
  hero_id: 'main', deputy_hero_ids: ['deputy'],
} as MarchRow;

test('empty-army return carries main and deputy heroes and keeps outgoing travel speed', async () => {
  let inserted: unknown[] = [];
  const client = {
    async query(sql: string, values: unknown[]) {
      if (sql.includes('INSERT INTO marches')) {
        inserted = values;
        return { rows: [{ id: 'home' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  } as unknown as pg.PoolClient;
  const settled = { row: { x: 0, y: 0 } };
  assert.equal(await createReturnMarch(client, march, {}, settled, 'player'), 'home');
  assert.equal(inserted[4], '{}');
  assert.equal(inserted[8], 'main');
  assert.deepEqual(inserted[9], ['deputy']);
  const emptyTravel = inserted[6];
  await createReturnMarch(client, march, march.troops ?? {}, settled, 'player');
  assert.equal(inserted[6], emptyTravel);
  assert.ok(Number(emptyTravel) > 0);
});

test('no troops and no heroes, or no city coordinates, create no return', async () => {
  const client = { query: () => assert.fail('must not query') } as unknown as pg.PoolClient;
  assert.equal(await createReturnMarch(client, { ...march, hero_id: null, deputy_hero_ids: [] }, {}, { row: { x: 0, y: 0 } }, 'player'), null);
  assert.equal(await createReturnMarch(client, march, {}, { row: null }, 'player'), null);
});
