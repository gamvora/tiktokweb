const fs = require('fs');
const path = require('path');
const config = require('../config');

class Storage {
  constructor() {
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(config.DATA_DIR)) {
      fs.mkdirSync(config.DATA_DIR, { recursive: true });
    }
  }

  loadGameState() {
    try {
      if (fs.existsSync(config.DATA_FILE)) {
        const raw = fs.readFileSync(config.DATA_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[Storage] Error loading game state:', err);
    }
    return null;
  }

  saveGameState(state) {
    try {
      this.ensureDirs();
      const tmpFile = `${config.DATA_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
      fs.renameSync(tmpFile, config.DATA_FILE);
    } catch (err) {
      console.error('[Storage] Error saving game state:', err);
    }
  }

  loadLogs(limit = 200) {
    try {
      if (fs.existsSync(config.LOGS_FILE)) {
        const raw = fs.readFileSync(config.LOGS_FILE, 'utf8');
        const logs = JSON.parse(raw);
        return logs.slice(-limit);
      }
    } catch (err) {
      console.error('[Storage] Error loading logs:', err);
    }
    return [];
  }

  appendLog(entry) {
    try {
      this.ensureDirs();
      let logs = [];
      if (fs.existsSync(config.LOGS_FILE)) {
        try {
          logs = JSON.parse(fs.readFileSync(config.LOGS_FILE, 'utf8'));
        } catch (e) {
          logs = [];
        }
      }
      const logItem = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        ...entry
      };
      logs.push(logItem);
      // Keep up to 1000 logs
      if (logs.length > 1000) {
        logs = logs.slice(logs.length - 1000);
      }
      fs.writeFileSync(config.LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
      return logItem;
    } catch (err) {
      console.error('[Storage] Error appending log:', err);
      return null;
    }
  }

  clearLogs() {
    try {
      fs.writeFileSync(config.LOGS_FILE, JSON.stringify([], null, 2), 'utf8');
    } catch (err) {
      console.error('[Storage] Error clearing logs:', err);
    }
  }
}

module.exports = new Storage();
