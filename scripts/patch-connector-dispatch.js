const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'server', 'connectors', 'tiktokConnector.js');
let src = fs.readFileSync(file, 'utf8');
const start = src.indexOf('  dispatchGift(giftEvent) {');
if (start === -1) throw new Error('dispatchGift not found');
const end = src.lastIndexOf('\n}');
const replacement = `  dispatchGift(giftEvent) {
    // منطق توزيع الهدايا موجود في محرّك اللعبة المشترك
    return this.gameState.dispatchGift(giftEvent);
  }`;
src = src.slice(0, start) + replacement + src.slice(end);
fs.writeFileSync(file, src, 'utf8');
console.log('Patched tiktokConnector.js');
