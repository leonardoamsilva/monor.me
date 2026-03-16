const USER_SCOPE_PREFIX = 'monor:user:';

let currentScope = 'device';

function safeScope(scope) {
  const value = String(scope ?? '').trim();
  return value || 'device';
}

function getScopedPrefix() {
  if (currentScope === 'device') return '';
  return `${USER_SCOPE_PREFIX}${currentScope}:`;
}

function toScopedKey(baseKey) {
  const prefix = getScopedPrefix();
  return `${prefix}${baseKey}`;
}

function isUserScopedStorageKey(key) {
  return String(key ?? '').startsWith(USER_SCOPE_PREFIX);
}

export function setStorageScope(scope) {
  currentScope = safeScope(scope);
}

export function getStorageScope() {
  return currentScope;
}

export function getItem(baseKey, options = {}) {
  const { fallbackToDevice = false } = options;
  const scopedKey = toScopedKey(baseKey);
  const value = localStorage.getItem(scopedKey);

  if (value !== null) return value;
  if (currentScope === 'device') return null;
  if (!fallbackToDevice) return null;

  return localStorage.getItem(baseKey);
}

export function setItem(baseKey, value) {
  localStorage.setItem(toScopedKey(baseKey), value);
}

export function removeItem(baseKey) {
  localStorage.removeItem(toScopedKey(baseKey));
}

export function listKeys(basePrefix = '') {
  const prefix = getScopedPrefix();
  const keys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    if (currentScope === 'device') {
      if (isUserScopedStorageKey(key)) continue;
      if (!key.startsWith(basePrefix)) continue;
      keys.push(key);
      continue;
    }

    if (!key.startsWith(prefix)) continue;

    const baseKey = key.slice(prefix.length);
    if (!baseKey.startsWith(basePrefix)) continue;
    keys.push(baseKey);
  }

  return keys;
}

export function readJson(baseKey, fallbackValue, options = {}) {
  const raw = getItem(baseKey, options);
  if (!raw) return fallbackValue;

  try {
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

export function writeJson(baseKey, value) {
  setItem(baseKey, JSON.stringify(value));
}

export function migrateDeviceKeyToCurrentScope(baseKey) {
  if (currentScope === 'device') return false;

  const scopedKey = toScopedKey(baseKey);
  const alreadyMigrated = localStorage.getItem(scopedKey) !== null;
  if (alreadyMigrated) return false;

  const deviceValue = localStorage.getItem(baseKey);
  if (deviceValue === null) return false;

  localStorage.setItem(scopedKey, deviceValue);
  return true;
}
