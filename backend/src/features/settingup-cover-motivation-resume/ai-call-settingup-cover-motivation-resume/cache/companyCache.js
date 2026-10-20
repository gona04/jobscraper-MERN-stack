const fs = require('node:fs').promises;

const { CACHE_FILE } = require('../config/paths');
const { log } = require('../utils/log');

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') log(`Cache load failed, starting fresh: ${err.message}`);
    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

module.exports = { loadCache, saveCache };
