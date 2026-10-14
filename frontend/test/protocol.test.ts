import assert from 'node:assert/strict';
import test from 'node:test';
import { Op, PROTOCOL_VERSION } from '../src/api/protocol';
import { Op as ServerOp, PROTOCOL_VERSION as ServerVersion } from '../../backend/common/src/protocol';
import { setActiveCityId, withActiveCity } from '../src/api/cityScope';

test('前后端协议号与版本保持一致，公告与副本不共用推送号', () => {
  // 扫码器专用的三个操作不在网页客户端声明。
  const scannerOps = new Set(['WX_SCAN', 'WX_CONFIRM', 'WX_CANCEL']);
  const webOps = Object.fromEntries(Object.entries(ServerOp).filter(([name]) => !scannerOps.has(name)));
  assert.deepEqual(Op, webOps);
  assert.equal(PROTOCOL_VERSION, ServerVersion);
  assert.equal(new Set(Object.values(Op)).size, Object.keys(Op).length);
  assert.notEqual(Op.PUSH_ANNOUNCEMENT, Op.PUSH_DUNGEON_STATE);
});

test('放弃分城与副本出征都使用当前城，公告和地图查询不注入城池', () => {
  setActiveCityId('branch');
  try {
    assert.deepEqual(withActiveCity(Op.DISCARD_CITY, { confirm: true }), { confirm: true, cityId: 'branch' });
    assert.deepEqual(withActiveCity(Op.ENTER_DUNGEON, { dungeonId: 'hulao' }), { dungeonId: 'hulao', cityId: 'branch' });
    assert.deepEqual(withActiveCity(Op.GET_ANNOUNCEMENTS, {}), {});
    assert.deepEqual(withActiveCity(Op.GET_MAP_OVERVIEW, {}), {});
  } finally {
    setActiveCityId(null);
  }
});
