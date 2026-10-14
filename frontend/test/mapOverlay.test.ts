import assert from 'node:assert/strict';
import test from 'node:test';
import type { TileView, WorldMapResponseData } from '../src/api/protocol';
import { territoryEdges } from '../src/components/map/MapOverlay';

const tile = (x: number, y: number, owner: string | null, kind: TileView['kind'] = 'wilderness'): TileView =>
  ({ x, y, kind, owner: owner ? { accountId: owner, username: owner, cityId: `${owner}-c`, cityName: owner } : null }) as TileView;

/** 4×3 视野，原点 (10, 20)：me 占 (11,21)(12,21) 两格相邻，他人占 (13,21) 紧挨着，(10,20) 是 NPC 城 */
const win = (tiles: TileView[]): WorldMapResponseData => ({ x: 10, y: 20, w: 4, h: 3, size: 1000, tiles }) as WorldMapResponseData;
const grid = (owners: Record<string, string>) => {
  const tiles: TileView[] = [];
  for (let y = 20; y < 23; y += 1) {
    for (let x = 10; x < 14; x += 1) {
      tiles.push(tile(x, y, owners[`${x},${y}`] ?? null, x === 10 && y === 20 ? 'npc_city' : 'wilderness'));
    }
  }
  return win(tiles);
};

test('adjacent tiles of the same owner merge into one outline (no inner edge)', () => {
  const edges = territoryEdges(grid({ '11,21': 'me', '12,21': 'me' }), 'me', true);
  // 两格合成 2×1 的块：外轮廓 6 条单位边，中间那条共享边不画
  assert.equal(edges.length, 6);
  assert.ok(edges.every((edge) => edge.mine));
  assert.ok(!edges.some((edge) => edge.x1 === 2 && edge.x2 === 2), 'shared edge between (11,21) and (12,21) must not be drawn');
});

test('different owners each get their own border; hidden own layer keeps others', () => {
  const view = grid({ '11,21': 'me', '12,21': 'me', '13,21': 'rival' });
  const all = territoryEdges(view, 'me', true);
  // rival 在视野最右列：右边在视野外不画，剩上 / 下 / 左 3 条；me 块 6 条（与 rival 相邻的边双方各画一次）
  assert.equal(all.filter((edge) => !edge.mine).length, 3);
  assert.equal(all.filter((edge) => edge.mine).length, 6);
  const othersOnly = territoryEdges(view, 'me', false);
  assert.equal(othersOnly.length, 3);
  assert.ok(othersOnly.every((edge) => !edge.mine));
});

test('ownerless and NPC tiles draw nothing', () => {
  assert.equal(territoryEdges(grid({}), 'me', true).length, 0);
});
