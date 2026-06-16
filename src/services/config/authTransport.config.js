export const AUTH_COOKIE_MODES = Object.freeze({
    LEGACY: 'legacy',
    D2: 'd2'
});

export const BROWSER_AUTH_TRANSPORTS = Object.freeze({
    AUTHORIZATION: 'authorization',
    COOKIE: 'cookie'
});

export const DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY;
export const DEFAULT_BROWSER_AUTH_TRANSPORT = BROWSER_AUTH_TRANSPORTS.AUTHORIZATION;
export const DEFAULT_CSRF_ENABLED = false;

const normalizeValue = (value) => value ? String(value).trim().toLowerCase() : '';

export const parseBoolean = (value, defaultValue = false) => {
    if(value === undefined || value === null || value === '') {
        return defaultValue;
    }

    const normalized = normalizeValue(value);

    if(['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if(['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return defaultValue;
}

export const getAuthCookieMode = () => {
    const mode = normalizeValue(process.env.VUE_APP_AUTH_COOKIE_MODE) || DEFAULT_AUTH_COOKIE_MODE;
    return mode === AUTH_COOKIE_MODES.D2 ? AUTH_COOKIE_MODES.D2 : AUTH_COOKIE_MODES.LEGACY;
}

export const getBrowserAuthTransport = () => {
    const transport = normalizeValue(process.env.VUE_APP_BROWSER_AUTH_TRANSPORT) || DEFAULT_BROWSER_AUTH_TRANSPORT;
    return transport === BROWSER_AUTH_TRANSPORTS.COOKIE
        ? BROWSER_AUTH_TRANSPORTS.COOKIE
        : BROWSER_AUTH_TRANSPORTS.AUTHORIZATION;
}

export const isD2AuthMode = () => (
    getAuthCookieMode() === AUTH_COOKIE_MODES.D2
    && getBrowserAuthTransport() === BROWSER_AUTH_TRANSPORTS.COOKIE
);

export const isCsrfEnabled = () => (
    isD2AuthMode()
    && parseBoolean(process.env.VUE_APP_CSRF_ENABLED, DEFAULT_CSRF_ENABLED)
);

export const getSafeAuthClientConfigSummary = () => ({
    authCookieMode: getAuthCookieMode(),
    browserAuthTransport: getBrowserAuthTransport(),
    csrfEnabled: isCsrfEnabled()
});

export default {
    AUTH_COOKIE_MODES,
    BROWSER_AUTH_TRANSPORTS,
    DEFAULT_AUTH_COOKIE_MODE,
    DEFAULT_BROWSER_AUTH_TRANSPORT,
    DEFAULT_CSRF_ENABLED,
    getAuthCookieMode,
    getBrowserAuthTransport,
    getSafeAuthClientConfigSummary,
    isCsrfEnabled,
    isD2AuthMode,
    parseBoolean
}
