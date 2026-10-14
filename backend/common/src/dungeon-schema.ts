// 副本与宝物的表结构（v61，虎牢关）：与其他表一起由 db.ts 的 ensureSchema 幂等创建（排在武将表之后）。
// - dungeon_sites：副本入口地块（启动时选定一次，见 dungeon-db.ensureDungeonSites；地块 kind 改为 'dungeon'）；
// - dungeon_progress：每人每个副本的首通时刻、通关次数与「北京日」已用次数；
// - dungeon_runs：每次挑战（出征即建行，到达结算后写 result；每人只保留最近 DUNGEON_REPORT_KEEP 条已结算的）；
// - account_items：宝物实例；hero_id 非空 = 装备在该武将身上（唯一约束保证一将一件），
//   account_heroes.equip_def 是它的冗余缓存（穿戴 / 卸下 / 出售同事务维护）；武将被解雇时宝物自动回背包；
// - marches.deputy_hero_ids：副本行军的副将（返程沿用，回城后释放），占用判定见 hero-db.heroBusyMarchMap。

export const DUNGEON_SCHEMA_SQL = `
ALTER TABLE marches ADD COLUMN IF NOT EXISTS deputy_hero_ids uuid[];
ALTER TABLE account_heroes ADD COLUMN IF NOT EXISTS equip_def text;

CREATE TABLE IF NOT EXISTS dungeon_sites (
  dungeon_id text PRIMARY KEY,
  x integer NOT NULL,
  y integer NOT NULL
);

CREATE TABLE IF NOT EXISTS dungeon_progress (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  dungeon_id text NOT NULL,
  first_cleared_at timestamptz,
  clears integer NOT NULL DEFAULT 0,
  day date,
  day_used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, dungeon_id)
);

-- heroes = [{ role, id, name, lead, force, wit, specialty, equipment }]；result = DungeonRunStored（结算后）
CREATE TABLE IF NOT EXISTS dungeon_runs (
  id bigserial PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  dungeon_id text NOT NULL,
  march_id uuid NOT NULL,
  from_city_id uuid NOT NULL,
  heroes jsonb NOT NULL,
  troops jsonb NOT NULL,
  retreat_below integer,
  status text NOT NULL DEFAULT 'marching',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS return_march_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dungeon_runs_return_march ON dungeon_runs (return_march_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dungeon_runs_march ON dungeon_runs (march_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_runs_account ON dungeon_runs (account_id, id DESC);

CREATE TABLE IF NOT EXISTS account_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  def text NOT NULL,
  hero_id uuid UNIQUE REFERENCES account_heroes(id) ON DELETE SET NULL,
  source text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_items_account ON account_items (account_id, acquired_at);
`;
