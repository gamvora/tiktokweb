// ═══════════════════════════════════════════════════════════════
// غلاف Node.js لمحرّك اللعبة المشترك (js/game-engine.js)
// يمرّر إعدادات الخادم ومخزن الملفات إلى نفس المحرّك الذي يعمل
// داخل المتصفح، حتى يكون منطق اللعبة موحّداً في كل مكان.
// ═══════════════════════════════════════════════════════════════
const config = require('../config');
const storage = require('./storage');
const { GameState: UniversalGameState, GameStates } = require('../../js/game-engine.js');

class GameState extends UniversalGameState {
  constructor() {
    super({ config, storage, persist: true });
  }
}

module.exports = { GameState, GameStates };
