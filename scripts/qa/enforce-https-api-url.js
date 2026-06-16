'use strict';

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..', '..');
const PRODUCTION_LIKE_MODES = ['production', 'prod', 'staging', 'stage'];

function parseEnvFile(filePath) {
  const values = {};

  if (!fs.existsSync(filePath)) {
    return values;
  }

  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed[0] === '#') {
      return;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      return;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value[0] === '"' && value[value.length - 1] === '"') ||
      (value[0] === '\'' && value[value.length - 1] === '\'')) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  });

  return values;
}

function loadEffectiveEnv(mode) {
  const env = {};
  [
    '.env',
    '.env.local',
    `.env.${mode}`,
    `.env.${mode}.local`
  ].forEach((fileName) => {
    Object.assign(env, parseEnvFile(path.join(FRONTEND_ROOT, fileName)));
  });

  Object.keys(process.env).forEach((key) => {
    if (key.indexOf('VUE_APP_') === 0) {
      env[key] = process.env[key];
    }
  });

  return env;
}

function safeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch (error) {
    return value || '<empty>';
  }
}

function validateApiUrl(mode) {
  const normalizedMode = String(mode || 'production').trim().toLowerCase();
  const env = loadEffectiveEnv(normalizedMode);
  const apiUrl = env.VUE_APP_CORE_URL_API || '';
  const productionLike = PRODUCTION_LIKE_MODES.indexOf(normalizedMode) >= 0;

  if (!productionLike) {
    return {
      ok: true,
      mode: normalizedMode,
      productionLike,
      apiOrigin: safeOrigin(apiUrl),
      skipped: true
    };
  }

  if (!apiUrl) {
    return {
      ok: false,
      mode: normalizedMode,
      productionLike,
      apiOrigin: '<empty>',
      error: 'VUE_APP_CORE_URL_API is required for production-like builds.'
    };
  }

  if (/^http:\/\//i.test(apiUrl)) {
    return {
      ok: false,
      mode: normalizedMode,
      productionLike,
      apiOrigin: safeOrigin(apiUrl),
      error: 'VUE_APP_CORE_URL_API must use https:// for production-like builds.'
    };
  }

  if (!/^https:\/\//i.test(apiUrl)) {
    return {
      ok: false,
      mode: normalizedMode,
      productionLike,
      apiOrigin: safeOrigin(apiUrl),
      error: 'VUE_APP_CORE_URL_API must be an absolute https:// URL for production-like builds.'
    };
  }

  return {
    ok: true,
    mode: normalizedMode,
    productionLike,
    apiOrigin: safeOrigin(apiUrl),
    skipped: false
  };
}

if (require.main === module) {
  const mode = process.argv[2] || process.env.NODE_ENV || 'production';
  const result = validateApiUrl(mode);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

module.exports = {
  validateApiUrl,
  loadEffectiveEnv
};
