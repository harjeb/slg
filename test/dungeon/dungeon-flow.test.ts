// 副本·虎牢关与宝物的 WS 联调（v63）：真实 API + Worker 进程连临时库，WebSocket 客户端走完整流程——
// 查副本 → 编成校验错误码 → 出征（武将占用 / 同时只能一支）→ Worker 到达结算推送 → 返程回城 →
// 宝物穿戴 / 卸下 / 出售 → 折返取消 → 次数用尽；以及地图入口地块不接普通出征。
// 需要可写的 PostgreSQL（DATABASE_URL，建议用临时库，见 test/README.md）；没有时整体跳过。
// 会把 settings.time_scale 设为 60（行军几秒到达），不要对共享开发库跑。

import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, type ChildProcess } from 'node:child_process';
import { Client } from '../wechat/harness';
import { ensureDungeonSites } from '../../backend/common/src/dungeon-db';
import { Op } from '../../backend/common/src/protocol';
import { seedAccount } from '../account-seed';

const backendDir = path.resolve(__dirname, '../../backend');
const pg = createRequire(path.join(backendDir, 'package.json'))('pg') as typeof import('pg');
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = 18_093;

function start(script: string): ChildProcess {
  const preload = script === 'worker/src/index.ts' ? ['--require', path.resolve(__dirname, 'worker-seed.cjs')] : [];
  return spawn(process.execPath, [...preload, '--import', 'tsx', script], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', LOG_LEVEL: 'warn' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

async function waitFor<T>(fn: () => Promise<T | null | undefined | false>, what: string, timeoutMs = 60_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const out = await fn();
    if (out) {
      return out;
    }
    assert.ok(Date.now() < deadline, `${what} 超时`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

test('副本·虎牢关与宝物：完整联调', { skip: !DATABASE_URL, timeout: 240_000 }, async () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const procs: ChildProcess[] = [];
  let client: Client | null = null;
  try {
    // 先起 API 建表（幂等），再设时间缩放、起 Worker
    procs.push(start('api/src/index.ts'));
    await waitFor(async () => (await fetch(`http://127.0.0.1:${PORT}/health`).catch(() => null))?.ok, 'API 启动', 120_000);
    await pool.query(`INSERT INTO settings (key, value) VALUES ('time_scale', '{"scale": 60}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);

    const username = `dungeon_${Date.now().toString(36)}`;
    await seedAccount(username, 'dungeon-pass-1');
    const acc = (await pool.query(`SELECT a.id AS account_id, c.id AS city_id, c.gold FROM accounts a JOIN cities c ON c.account_id = a.id WHERE a.username = $1`, [username])).rows[0];
    const capitalId = acc.city_id;
    const site = (await pool.query('SELECT x, y FROM dungeon_sites WHERE dungeon_id = $1', ['hulao'])).rows[0];
    await pool.query("UPDATE world_tiles SET kind = 'wilderness' WHERE x = $1 AND y = $2", [site.x, site.y]);
    await ensureDungeonSites(pool);
    assert.equal((await pool.query('SELECT t.kind FROM dungeon_sites s JOIN world_tiles t USING (x, y)')).rows[0].kind, 'dungeon');
    // 主城无兵，只在另一座城放驻军，确保显式 cityId 决定出发与回城地点。
    const dungeonSite = (await pool.query("SELECT x, y FROM dungeon_sites WHERE dungeon_id = 'hulao'")).rows[0];
    const branchTile = (await pool.query("SELECT x, y FROM world_tiles WHERE kind = 'wilderness' AND owner_city_id IS NULL AND npc IS NULL ORDER BY abs(x - $1) + abs(y - $2) LIMIT 1", [dungeonSite.x, dungeonSite.y])).rows[0];
    acc.city_id = (await pool.query(`INSERT INTO cities (account_id, name, gold, wood, food, stone, iron, population, x, y)
      VALUES ($1, '副本测试分城', 1000000, 1000000, 1000000, 1000000, 1000000, 50, $2, $3) RETURNING id`, [acc.account_id, branchTile.x, branchTile.y])).rows[0].id;
    await pool.query("INSERT INTO city_buildings (city_id, kind, level) VALUES ($1, 'parade_ground', 20), ($1, 'barracks', 3)", [acc.city_id]);
    await pool.query("UPDATE world_tiles SET kind = 'city', level = 0, npc = NULL, owner_city_id = $3 WHERE x = $1 AND y = $2", [branchTile.x, branchTile.y, acc.city_id]);
    // 武将与驻军直插：主将 + 两名副将 + 一名备用；城里放混编兵力。
    const heroIds: string[] = [];
    for (const [name, attr] of [['主将甲', 80], ['副将乙', 60], ['副将丙', 60], ['备用丁', 40]] as Array<[string, number]>) {
      const row = await pool.query(
        `INSERT INTO account_heroes (account_id, name, lead, force, wit, base_lead, base_force, base_wit, level, salary_at)
         VALUES ($1, $2, $3, $3, $3, $3, $3, $3, 10, now() + interval '1 day') RETURNING id`,
        [acc.account_id, name, attr],
      );
      heroIds.push(row.rows[0].id);
    }
    for (const [troop, count] of [['swordsman', 400], ['pikeman', 400], ['archer', 300], ['cavalry', 200], ['supply_wagon', 10], ['medic', 10]] as Array<[string, number]>) {
      await pool.query(
        `INSERT INTO city_army (city_id, troop, count) VALUES ($1, $2, $3) ON CONFLICT (city_id, troop) DO UPDATE SET count = EXCLUDED.count`,
        [acc.city_id, troop, count],
      );
    }
    const [mainId, dep1, dep2, spare] = heroIds;
    const army = { swordsman: 300, pikeman: 300, archer: 250, cavalry: 138, medic: 2 };

    client = await Client.connect(PORT);
    assert.equal((await client.call(Op.LOGIN, { username, password: 'dungeon-pass-1', asAgent: false })).ok, true);

    // 副本信息
    const info = await client.call(Op.GET_DUNGEON, {});
    const dungeon = info.data?.dungeons?.[0];
    assert.equal(dungeon?.id, 'hulao');
    assert.equal(dungeon.attemptsLeft, 5);
    assert.equal(dungeon.waves.length, 6);
    assert.equal(dungeon.waves[5].siege, true);
    assert.equal(dungeon.rules.medicPopPerWagon, 0);
    assert.equal(dungeon.rules.medicPopPerUnit, 20);
    assert.equal(dungeon.rules.woundedReturnShare, 0);

    // 后勤兵复用真实征兵接口，Worker 后续完成后入驻分城。
    const recruited = await client.call(Op.RECRUIT, { cityId: acc.city_id, troop: 'medic', count: 2 });
    assert.equal(recruited.ok, true, JSON.stringify(recruited.error));
    assert.equal(recruited.data?.recruit.troop, 'medic');
    const recruitRow = (await pool.query('SELECT city_id, population, cost FROM recruits WHERE id = $1', [recruited.data?.recruit.id])).rows[0];
    assert.equal(recruitRow.city_id, acc.city_id);
    assert.equal(recruitRow.population, 12);
    assert.deepEqual(recruitRow.cost, { gold: 400, wood: 600, food: 120, stone: 0, iron: 80 });

    // 地图入口：kind=dungeon，普通出征拒绝
    const tile = await client.call(Op.GET_TILE, { x: dungeon.x, y: dungeon.y });
    assert.equal(tile.data?.tile.kind, 'dungeon');
    assert.equal(tile.data?.tile.dungeon?.name, '虎牢关');
    assert.equal((await client.call(Op.MARCH, { x: dungeon.x, y: dungeon.y, troops: { swordsman: 10 } })).error?.code, 'TARGET_NOT_ATTACKABLE');

    // 编成校验错误码
    const enter = (data: Record<string, unknown>) => client!.call(Op.ENTER_DUNGEON, { dungeonId: 'hulao', cityId: acc.city_id, ...data });
    assert.equal((await enter({ mainHeroId: mainId, troops: { swordsman: 1001 } })).error?.code, 'DUNGEON_POP_LIMIT');
    assert.equal((await enter({ mainHeroId: mainId, deputyHeroIds: [dep1, dep2, spare], troops: army })).error?.code, 'DUNGEON_HERO_LIMIT');
    assert.equal((await enter({ mainHeroId: mainId, troops: { swordsman: 5000 } })).error?.code, 'DUNGEON_POP_LIMIT');
    assert.equal((await enter({ mainHeroId: mainId, troops: { swordsman: -1 } })).error?.code, 'INVALID_PARAMS');
    assert.equal((await enter({ mainHeroId: mainId, troops: { swordsman: 1.5 } })).error?.code, 'INVALID_PARAMS');
    assert.equal((await enter({ mainHeroId: mainId, troops: { unknown: 1 } })).error?.code, 'INVALID_PARAMS');
    assert.equal((await enter({ mainHeroId: mainId, troops: { medic: 1 } })).error?.code, 'INVALID_PARAMS');
    assert.equal((await enter({ mainHeroId: mainId, troops: { swordsman: 999, archer: 1 }, retreatBelowPercent: 0 })).error?.code, 'INVALID_PARAMS');

    // 出征
    const ok = await enter({ mainHeroId: mainId, deputyHeroIds: [dep1, dep2], troops: army, retreatBelowPercent: 10 });
    assert.equal(ok.ok, true, JSON.stringify(ok.error));
    assert.equal(ok.data?.attemptsLeft, 4);
    assert.equal(ok.data?.march.purpose, 'dungeon');
    assert.equal(ok.data?.march.fromCityId, acc.city_id);
    assert.equal((await pool.query('SELECT count FROM city_army WHERE city_id = $1 AND troop = $2', [acc.city_id, 'swordsman'])).rows[0].count, 100);
    assert.equal((await pool.query('SELECT count FROM city_army WHERE city_id = $1 AND troop = $2', [acc.city_id, 'medic'])).rows[0].count, 8);
    assert.equal((await pool.query('SELECT 1 FROM city_army WHERE city_id = $1', [capitalId])).rowCount, 0);
    await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'started' && f.data?.run.id === ok.data?.run.id);
    assert.equal(ok.data?.run.status, 'marching');
    assert.equal((await enter({ mainHeroId: spare, troops: { swordsman: 10 } })).error?.code, 'DUNGEON_IN_PROGRESS');
    // 副将同样占用：不能换宝物
    const busyItem = (await pool.query(`INSERT INTO account_items (account_id, def, source) VALUES ($1, 'qixing_blade', 'test') RETURNING id`, [acc.account_id])).rows[0].id;
    assert.equal((await client.call(Op.EQUIP_ITEM, { itemId: busyItem, heroId: dep1 })).error?.code, 'HERO_BUSY');
    const heroes = await client.call(Op.GET_HEROES, {});
    const dep1View = heroes.data?.heroes.find((h: { id: string }) => h.id === dep1);
    assert.equal(dep1View.marchingMarchId, ok.data?.march.id);
    procs.push(start('worker/src/index.ts'));

    // Worker 到达结算 → 推送
    await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'arrived' && f.data?.run.id === ok.data?.run.id, 90_000);
    const push = await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'resolved' && f.data?.run.id === ok.data?.run.id, 90_000);
    const run = push.data?.run;
    assert.equal(run.status, 'resolved');
    assert.equal(run.outcome, 'cleared');
    assert.equal(run.waves.length, 6);
    assert.equal(run.wavesWon, 6);
    assert.ok(run.waves.some((wave: { healed: Record<string, number> }) => Object.values(wave.healed).some((count) => count > 0)), '后勤兵实际救治');
    assert.deepEqual(run.waves[5].healed, {}, '最后一波不救治');
    assert.deepEqual(run.woundedReturned, {}, '取消战后伤兵返还');
    assert.deepEqual(run.returning, run.survivors, '返程兵力只有最终幸存部队');
    assert.deepEqual((await pool.query('SELECT troops FROM marches WHERE id = $1', [run.returnMarchId])).rows[0].troops, run.survivors);
    const reports = await client.call(Op.GET_DUNGEON_REPORTS, { limit: 5 });
    assert.equal(reports.data?.reports[0].id, run.id);
    assert.equal(run.firstClear, true);
    assert.ok(run.treasure, '首通必掉宝物');
    assert.equal((await pool.query("SELECT 1 FROM account_items WHERE account_id = $1 AND source = 'dungeon:hulao'", [acc.account_id])).rowCount, 1);
    const clearEvents = (await pool.query("SELECT detail FROM events WHERE account_id = $1 AND type = 'dungeon_cleared'", [acc.account_id])).rows;
    assert.equal(clearEvents.length, 1);
    assert.equal(clearEvents[0].detail.runId, run.id);
    assert.equal(clearEvents[0].detail.firstClear, true);
    const events = await client.call(Op.GET_EVENTS, { limit: 50 });
    assert.ok(events.data?.events.some((e: { type: string }) => e.type === 'dungeon_cleared'));

    // 返程回城：驻军 = 出发后剩余 + 返程兵力；武将释放
    const armyRow = async () => Object.fromEntries((await pool.query(`SELECT troop, count FROM city_army WHERE city_id = $1`, [acc.city_id])).rows.map((r) => [r.troop, r.count]));
    await waitFor(async () => (await pool.query(`SELECT 1 FROM marches WHERE account_id = $1 AND status = 'marching'`, [acc.account_id])).rowCount === 0, '返程到达', 90_000);
    await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'returned' && f.data?.run.id === run.id, 90_000);
    assert.ok(run.returnMarchId);
    const returnedHero = (await client.call(Op.GET_HEROES, {})).data?.heroes.find((h: { id: string }) => h.id === dep1);
    assert.equal(returnedHero.marchingMarchId, null);
    await waitFor(async () => (await pool.query("SELECT 1 FROM recruits WHERE id = $1 AND status = 'completed'", [recruited.data?.recruit.id])).rowCount === 1, '后勤兵征募完成');
    const home = await armyRow();
    assert.equal(home.medic, 10 - 2 + 2 + (run.returning.medic ?? 0));
    assert.equal(home.swordsman, 400 - 300 + (run.returning.swordsman ?? 0));
    assert.equal(home.pikeman, 400 - 300 + (run.returning.pikeman ?? 0));

    // 宝物：装备 / 卸下 / 出售（用前面插入的那件）
    const equip = await client.call(Op.EQUIP_ITEM, { itemId: busyItem, heroId: mainId });
    assert.equal(equip.ok, true, JSON.stringify(equip.error));
    const mainView = (await client.call(Op.GET_HEROES, {})).data?.heroes.find((h: { id: string }) => h.id === mainId);
    assert.equal(mainView.equipment?.def, 'qixing_blade');
    assert.equal(mainView.bonus.atkPercent, 25, '武力 80 → 20% 封顶 + 宝刀 5%');
    assert.equal((await client.call(Op.SELL_ITEM, { itemId: busyItem })).error?.code, 'ITEM_EQUIPPED');
    assert.equal((await client.call(Op.UNEQUIP_ITEM, { itemId: busyItem })).ok, true);
    const goldBefore = (await pool.query(`SELECT gold FROM cities WHERE id = $1`, [capitalId])).rows[0].gold;
    const sold = await client.call(Op.SELL_ITEM, { itemId: busyItem });
    assert.equal(sold.data?.gold, 2000);
    const goldAfter = (await pool.query(`SELECT gold FROM cities WHERE id = $1`, [capitalId])).rows[0].gold;
    assert.ok(Number(goldAfter) >= Number(goldBefore) + 2000);
    assert.equal((await client.call(Op.SELL_ITEM, { itemId: busyItem })).error?.code, 'ITEM_NOT_FOUND');

    // 折返：挑战取消、次数不退、可以再出征；用完 5 次后拒绝
    for (let i = 0; i < 3; i += 1) {
      const again = await enter({ mainHeroId: spare, troops: { swordsman: 10 } });
      assert.equal(again.ok, true, JSON.stringify(again.error));
      assert.equal((await client.call(Op.RECALL_MARCH, { marchId: again.data?.march.id })).ok, true);
      const cancelledPush = await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'cancelled' && f.data?.run.id === again.data?.run.id);
      assert.equal(cancelledPush.data?.run.returnMarchId, again.data?.march.id);
      const active = (await client.call(Op.GET_DUNGEON, {})).data?.dungeons[0].active;
      assert.equal(active, null);
      // 返程中的武将仍占用，等回城再出下一次
      await waitFor(async () => (await pool.query(`SELECT 1 FROM marches WHERE account_id = $1 AND status = 'marching'`, [acc.account_id])).rowCount === 0, '折返回城', 60_000);
      await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'returned' && f.data?.run.id === again.data?.run.id, 60_000);
    }
    const cancelled = (await client.call(Op.GET_DUNGEON_REPORTS, { limit: 1 })).data?.reports[0];
    assert.equal(cancelled.status, 'cancelled');
    // 最后一次只带 1 个兵：战败全灭、不返还伤兵，武将仍须实际返程。
    const doomed = await enter({ mainHeroId: spare, troops: { swordsman: 1 } });
    assert.equal(doomed.ok, true, JSON.stringify(doomed.error));
    const defeat = await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'resolved' && f.data?.run.id === doomed.data?.run.id, 90_000);
    assert.equal(defeat.data?.run.outcome, 'defeated');
    assert.deepEqual(defeat.data?.run.woundedReturned, {});
    assert.deepEqual(defeat.data?.run.returning, defeat.data?.run.survivors);
    assert.equal(Object.values(defeat.data?.run.returning as Record<string, number>).reduce((a, n) => a + n, 0), 0);
    const returnId = defeat.data?.run.returnMarchId;
    assert.ok(returnId, '全灭武将有返程行军');
    const returnRow = (await pool.query('SELECT hero_id, troops, purpose FROM marches WHERE id = $1', [returnId])).rows[0];
    assert.equal(returnRow.hero_id, spare);
    assert.equal(returnRow.purpose, 'return');
    assert.equal(Object.values(returnRow.troops as Record<string, number>).reduce((a, n) => a + n, 0), 0);
    await client.waitPush((f) => f.op === Op.PUSH_DUNGEON_STATE && f.data?.reason === 'returned' && f.data?.run.id === doomed.data?.run.id, 90_000);
    assert.equal((await client.call(Op.GET_DUNGEON, {})).data?.dungeons[0].attemptsLeft, 0);
    assert.equal((await enter({ mainHeroId: spare, troops: { swordsman: 10 } })).error?.code, 'DUNGEON_NO_ATTEMPTS');
  } finally {
    client?.close();
    await Promise.all(procs.map((p) => new Promise<void>((resolve) => {
      if (p.exitCode !== null || p.signalCode !== null) return resolve();
      const timer = setTimeout(() => p.kill('SIGKILL'), 5000);
      p.once('exit', () => { clearTimeout(timer); resolve(); });
      p.kill('SIGTERM');
    })));
    await pool.query(`DELETE FROM settings WHERE key = 'time_scale'`).catch(() => undefined);
    await pool.end();
  }
});
