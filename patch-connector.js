const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'node_modules', 'tiktok-live-connector', 'dist', 'lib-DWhiWLli.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  const oldCode = 'return `http${this.isSecure(host) ? "s" : ""}://${host}`;';
  const newCode = 'return `https://${host}`;';

  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[Patch] Successfully updated getBaseUrl to https://');
  } else {
    console.log('[Patch] Target string already updated or not found.');
  }
} else {
  console.log('[Patch] Target file not found.');
}
