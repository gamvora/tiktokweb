const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let src = fs.readFileSync(path.join(root, 'server', 'state', 'gameState.js'), 'utf8');

// Remove Node-only requires
src = src.replace(
  /^const EventEmitter = require\('events'\);\nconst config = require\('\.\.\/config'\);\nconst storage = require\('\.\/storage'\);\n\n/,
  ''
);

// Remove CommonJS export
src = src.replace(/\nmodule\.exports = \{ GameState, GameStates \};\s*$/, '\n');

// Constructor options + injected config/storage
const ctorOld = '  constructor() {\n    super();\n';
const ctorNew = `  constructor(options = {}) {
    super();

    this.config = options.config || (typeof window !== 'undefined' && window.TikTokRouletteConfig) || {};
    this.storage = options.storage || null;
    this.persistEnabled = options.persist !== false;
`;
if (!src.includes(ctorOld)) throw new Error('constructor pattern not found');
src = src.replace(ctorOld, ctorNew);

// Config references
if (!src.includes('JSON.parse(JSON.stringify(config.defaultSettings))')) throw new Error('defaultSettings pattern not found');
src = src.replace(
  'JSON.parse(JSON.stringify(config.defaultSettings))',
  'JSON.parse(JSON.stringify(this.config.defaultSettings || {}))'
);
if (!src.includes('const catalog = config.giftCatalog || [];')) throw new Error('giftCatalog pattern not found');
src = src.replace('const catalog = config.giftCatalog || [];', 'const catalog = this.config.giftCatalog || [];');

// Storage references
if (!src.includes('const saved = storage.loadGameState();')) throw new Error('loadGameState pattern not found');
src = src.replace(
  'const saved = storage.loadGameState();',
  'const saved = this.storage ? this.storage.loadGameState() : null;'
);

const persistOld = `    storage.saveGameState({
      settings,
      state: this.state,
      roundNumber: this.roundNumber,
      players: this.players,
      winner: this.winner
    });`;
const persistNew = `    if (!this.persistEnabled || !this.storage) return;
    this.storage.saveGameState({
      settings,
      state: this.state,
      roundNumber: this.roundNumber,
      players: this.players,
      winner: this.winner
    });`;
if (!src.includes(persistOld)) throw new Error('saveGameState pattern not found');
src = src.replace(persistOld, persistNew);

const logOld = '    const entry = storage.appendLog({ type, message, details });';
const logNew = `    const entry = (this.storage && this.storage.appendLog)
      ? this.storage.appendLog({ type, message, details })
      : {
          id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          timestamp: new Date().toISOString(),
          type,
          message,
          details
        };`;
if (!src.includes(logOld)) throw new Error('appendLog pattern not found');
src = src.replace(logOld, logNew);

const emitter = `// ── Minimal EventEmitter (works in Node.js and browsers) ──────────────
class EventEmitter {
  constructor() {
    this._events = Object.create(null);
  }

  on(event, listener) {
    if (typeof listener !== 'function') return this;
    (this._events[event] || (this._events[event] = [])).push(listener);
    return this;
  }

  addListener(event, listener) {
    return this.on(event, listener);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener.apply(this, args);
    };
    wrapper.listener = listener;
    return this.on(event, wrapper);
  }

  off(event, listener) {
    const list = this._events[event];
    if (!list) return this;
    if (!listener) {
      delete this._events[event];
      return this;
    }
    this._events[event] = list.filter((fn) => fn !== listener && fn.listener !== listener);
    return this;
  }

  removeListener(event, listener) {
    return this.off(event, listener);
  }

  removeAllListeners(event) {
    if (event) delete this._events[event];
    else this._events = Object.create(null);
    return this;
  }

  listeners(event) {
    return (this._events[event] || []).slice();
  }

  listenerCount(event) {
    return (this._events[event] || []).length;
  }

  emit(event, ...args) {
    const list = this._events[event];
    if (!list || list.length === 0) return false;
    for (const listener of list.slice()) {
      try {
        listener.apply(this, args);
      } catch (err) {
        console.error('[EventEmitter] listener error for', event, err);
      }
    }
    return true;
  }
}
`;

const header = `// ═══════════════════════════════════════════════════════════════
// محرّك لعبة روليت تيك توك — يعمل في Node.js والمتصفح
// هذا الملف هو المصدر الوحيد لمنطق اللعبة.
// ═══════════════════════════════════════════════════════════════
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TikTokRouletteEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';

`;

const footer = `
return { GameState, GameStates };
});
`;

const out = header + emitter + '\n' + src.trimEnd() + '\n' + footer;
fs.writeFileSync(path.join(root, 'js', 'game-engine.js'), out, 'utf8');
console.log('Generated js/game-engine.js', out.length, 'bytes');
