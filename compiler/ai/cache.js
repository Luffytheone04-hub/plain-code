// Local translation cache (RFC-0020 §15).
//
// Successful AI translations are cached on disk so repeat compiles are fast and
// free. The cache key must include enough information to prevent stale
// semantics: rule version, compiler version, model, and normalized source.

const fs     = require('fs');
const crypto = require('crypto');
const os     = require('os');
const path   = require('path');

const CACHE_DIR = process.env.PLAIN_AI_CACHE_DIR
  || path.join(os.homedir(), '.plain', 'ai-cache');

// Fold all cache-relevant inputs into a single stable key.
function computeKey(parts) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(parts))
    .digest('hex');
}

function cachePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function get(key) {
  try {
    const file = cachePath(key);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function set(key, value) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(key), JSON.stringify(value, null, 2), 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

function clear() {
  try {
    if (fs.existsSync(CACHE_DIR)) fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    return true;
  } catch (_) {
    return false;
  }
}

function list() {
  try {
    if (!fs.existsSync(CACHE_DIR)) return [];
    return fs.readdirSync(CACHE_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const file = path.join(CACHE_DIR, f);
        let meta = null;
        try { meta = JSON.parse(fs.readFileSync(file, 'utf8')).meta; } catch (_) {}
        return {
          key: f.replace(/\.json$/, ''),
          file,
          size: fs.statSync(file).size,
          mtime: fs.statSync(file).mtime.toISOString(),
          rule: meta && meta.rule,
          ruleVersion: meta && meta.ruleVersion,
          compilerVersion: meta && meta.compilerVersion,
          model: meta && meta.model,
        };
      });
  } catch (_) {
    return [];
  }
}

module.exports = { CACHE_DIR, computeKey, get, set, clear, list };
