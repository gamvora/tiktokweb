const path = require('path');
const gameConfig = require('../js/game-config.js');

const ROOT_DIR = path.join(__dirname, '..');

// مسار قاعدة البيانات: يمكن تخصيصه عبر DATA_DIR
// (مفيد للاختبارات وللنشر على منصات لا تسمح بالكتابة داخل مجلد المشروع)
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT_DIR, 'data');

const config = {
  PORT: parseInt(process.env.PORT, 10) || 3001,
  ROOT_DIR,
  DATA_DIR,
  DATA_FILE: path.join(DATA_DIR, 'game_state.json'),
  LOGS_FILE: path.join(DATA_DIR, 'activity_logs.json'),

  // كتالوج الهدايا والإعدادات الافتراضية مشتركة مع نسخة المتصفح
  giftCatalog: gameConfig.giftCatalog,
  defaultSettings: gameConfig.defaultSettings
};

module.exports = config;
