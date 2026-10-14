// 固定 Worker 的战斗种子，使联调必定覆盖首通；其他随机数仍由系统产生。
const crypto = require('node:crypto');
const { syncBuiltinESMExports } = require('node:module');
const randomInt = crypto.randomInt;
crypto.randomInt = (min, max, ...args) =>
  min === 0 && max === 2 ** 31 && args.length === 0 ? 90000 : randomInt(min, max, ...args);
syncBuiltinESMExports();
