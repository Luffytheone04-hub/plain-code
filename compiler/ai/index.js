// AI-assisted compilation layer (RFC-0020) — public entry point.
// Exposes file/source compilation and the introspection commands used by the
// CLI (`plain ai status|rules|cache`) and `plain doctor`.

const { compileFile, compileSource, translateSource } = require('./translator');
const { loadRules } = require('./resolver');
const { CACHE_DIR, list, clear } = require('./cache');
const { config } = require('./client');
const { HOSTED_URL } = require('./remote');
const { VERSION } = require('../version');

function aiStatus() {
  const cfg     = config();
  const rules   = loadRules();
  const entries = list();
  const size    = entries.reduce((sum, e) => sum + (e.size || 0), 0);
  return {
    enabled: Boolean(cfg.enabled),
    provider: cfg.enabled ? cfg.baseUrl : null,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    apiKey: cfg.enabled ? 'configured' : null,
    // When no local provider is configured, Plain compiles through the hosted
    // service at HOSTED_URL, which owns the provider credential (RFC-0020 §46).
    remote: !cfg.enabled,
    hosted: HOSTED_URL,
    compilerVersion: VERSION,
    ruleCount: rules.length,
    cacheEntries: entries.length,
    cacheSizeBytes: size,
  };
}

function aiRules() {
  return loadRules().map((r) => ({
    id: r._id,
    version: r.version,
    title: r.title,
    async: Boolean(r.async),
    dependencies: r.dependencies || [],
    file: r._file,
    error: r._error || null,
  }));
}

function aiCache() {
  return { entries: list(), dir: CACHE_DIR };
}

function aiClearCache() {
  const removed = list().length;
  clear();
  return { removed };
}

module.exports = {
  compileFile,
  compileSource,
  translateSource,
  aiStatus,
  aiRules,
  aiCache,
  aiClearCache,
};
