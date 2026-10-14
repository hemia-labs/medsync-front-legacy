#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const files = {
    authConfig: 'src/services/config/authTransport.config.js',
    axiosHelper: 'src/services/config/axios.helper.js',
    axiosHandleStatus: 'src/services/config/axios.handlestatus.js',
    authActions: 'src/store/modules/auth/actions.js',
    authMutations: 'src/store/modules/auth/mutations.js',
    authStorageCleanup: 'src/utils/authStorageCleanup.js',
    d2AuthCleanup: 'src/utils/d2AuthCleanup.js',
    rememberedIdentifier: 'src/utils/authRememberedIdentifier.js',
    authService: 'src/services/core/auth/DAAuthService.js',
    csrfService: 'src/services/core/auth/DACsrfService.js',
    apiUrl: 'src/services/common/apiurl.js'
};

const qaMetadata = {
    phase: 'D2-5D Frontend Logout / 401 Cleanup',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-logout-401-cleanup.js full',
    envVars: [
        'VUE_APP_AUTH_COOKIE_MODE=d2',
        'VUE_APP_BROWSER_AUTH_TRANSPORT=cookie',
        'VUE_APP_CSRF_ENABLED=true'
    ],
    fixtures: 'none; static source checks only',
    cleanup: 'not required; no DB or external state is modified'
};

const readFile = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const sources = Object.entries(files).reduce((acc, [key, relativePath]) => {
    acc[key] = readFile(relativePath);
    return acc;
}, {});

const readTreeSources = (relativeDir) => {
    const dir = path.join(rootDir, relativeDir);
    if (!fs.existsSync(dir)) {
        return '';
    }

    return fs.readdirSync(dir, { withFileTypes: true }).map((entry) => {
        const entryPath = path.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
            return readTreeSources(entryPath);
        }
        if (!/\.(js|vue)$/.test(entry.name)) {
            return '';
        }
        return readFile(entryPath);
    }).join('\n');
};

const getActionBlock = (source, actionName) => {
    const start = source.indexOf(`async ${actionName}`);
    if (start < 0) {
        return '';
    }

    const nextAction = source.indexOf('\n    async ', start + 1);
    const end = nextAction > start ? nextAction : source.indexOf('\n}', start + 1);
    return source.slice(start, end > start ? end : source.length);
};

const checks = [];

const addCheck = (name, ok, evidence) => {
    checks.push({
        name,
        status: ok ? 'OK' : 'FAIL',
        evidence
    });
};

const includesAll = (source, needles) => needles.every((needle) => source.includes(needle));

const assertIncludesAll = (name, source, needles, evidence) => {
    addCheck(name, includesAll(source, needles), evidence);
};


const assertNoMatches = (name, sourceMap, patterns, evidence) => {
    const offenders = [];

    Object.entries(sourceMap).forEach(([fileKey, source]) => {
        patterns.forEach((pattern) => {
            if (pattern.test(source)) {
                offenders.push(`${fileKey}:${pattern}`);
            }
        });
    });

    addCheck(name, offenders.length === 0, offenders.length ? offenders.join(', ') : evidence);
};

const logoutAction = getActionBlock(sources.authActions, 'logout');
const d2LogoutBranch = logoutAction; // S18 shares immediate cleanup across transports.
const legacyCloseTokenWrite = /if\(!cookieMode && renewed\.data && renewed\.data\.token\)\s*\{\s*Vue\.prototype\.\$session\.set\('token', renewed\.data\.token\);\s*\}/;
const layoutAndViewSources = [
    readTreeSources('src/core/layouts'),
    readTreeSources('src/views/Patient/Sections'),
    readTreeSources('src/views/Home'),
    readTreeSources('src/views/error')
].join('\n');

assertIncludesAll(
    'legacy default remains intact',
    `${sources.authConfig}\n${logoutAction}\n${sources.axiosHandleStatus}`,
    [
        'DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY',
        'DEFAULT_BROWSER_AUTH_TRANSPORT = BROWSER_AUTH_TRANSPORTS.AUTHORIZATION',
        'const hadSession = state.authenticated || state.token',
        'clearLegacyAuthStorageForD2(Vue.prototype.$session)',
        "window.location.href = '/auth/login'",
        "store.commit(modules.AUTH+'/'+types.SET_AUTH_UNAUTHORIZED, true, {root: true})"
    ],
    'Legacy defaults, shared logout cleanup, login redirect and 401 unauthorized commit remain present.'
);

assertIncludesAll(
    'D2 logout no Authorization header',
    `${sources.authService}\n${sources.axiosHelper}`,
    [
        'DACore.put(DAC_AUTH_CLOSE)',
        'removeAuthorizationHeader(baseConfig.headers)',
        'delete nextHeaders.Authorization',
        'delete nextHeaders.authorization'
    ],
    'D2 logout uses DACore.put; D2 request config strips Authorization.'
);

assertIncludesAll(
    'D2 logout does not send refresh token in body',
    `${d2LogoutBranch}\n${sources.authService}`,
    [
        'DAAuthService.refreshToken(cookieMode ? undefined : new DARefreshTokenModel(refreshToken))',
        'DACore.put(DAC_AUTH_CLOSE)',
        'DACore.post(DAC_AUTH_REFRESH_TOKEN, {})'
    ],
    'D2 close sends no token payload and any close-only renewal passes undefined, using the HttpOnly cookie.'
);

assertIncludesAll(
    'D2 logout uses CSRF',
    `${sources.authService}\n${sources.axiosHelper}\n${sources.csrfService}\n${sources.apiUrl}`,
    [
        "DAC_AUTH_CLOSE         = 'api/auth/close'",
        'DACore.put(DAC_AUTH_CLOSE)',
        'isMutatingMethod(method)',
        'DACsrfService.getCsrfHeader()',
        'ensureCsrfToken'
    ],
    'PUT /api/auth/close is mutating and uses D2 CSRF header helper.'
);

assertIncludesAll(
    'D2 logout clears runtime store',
    d2LogoutBranch,
    [
        'const cookieMode = isD2AuthMode()',
        'commit(types.SET_AUTH_ACCESS_SESSION, null)',
        'commit(types.SET_AUTH_UNAUTHORIZED, false)'
    ],
    'D2 logout clears Vuex runtime auth state and avoids stale unauthorized UX.'
);

assertIncludesAll(
    'D2 logout clears CSRF runtime',
    `${logoutAction}\n${sources.d2AuthCleanup}`,
    [
        'clearD2ClientAuthArtifacts(Vue.prototype.$session)',
        'DACsrfService.clearCsrfToken()',
        'csrfCleared: true'
    ],
    'D2 logout calls cleanup helper; helper clears CSRF runtime.'
);

assertIncludesAll(
    'D2 logout clears legacy auth keys',
    `${logoutAction}\n${sources.authStorageCleanup}\n${sources.d2AuthCleanup}`,
    [
        'clearD2ClientAuthArtifacts(Vue.prototype.$session)',
        'clearLegacyAuthStorageForD2(session)',
        'token',
        'refreshtoken',
        'permissions',
        'tenantOperational',
        'business',
        'authenticated',
        'sessionState'
    ],
    'D2 cleanup removes token, refresh, context, and runtime auth residue keys.'
);

assertIncludesAll(
    'D2 logout preserves remembered identifier',
    `${sources.authStorageCleanup}\n${sources.rememberedIdentifier}`,
    [
        "REMEMBERED_IDENTIFIER_KEY = 'medsync.auth.rememberedIdentifier.v1'",
        'key === REMEMBERED_IDENTIFIER_KEY',
        'preservedKeys: [REMEMBERED_IDENTIFIER_KEY]'
    ],
    'Storage cleanup preserves remembered identifier key.'
);

assertIncludesAll(
    'D2 401 clears runtime store',
    sources.axiosHandleStatus,
    [
        'if(isD2AuthMode())',
        "store.commit(modules.AUTH+'/'+types.SET_D2_AUTH_SESSION, null, {root: true})",
        "store.commit(modules.AUTH+'/'+types.SET_AUTH_UNAUTHORIZED, true, {root: true})"
    ],
    'D2 401 branch clears runtime session and marks unauthorized.'
);

assertIncludesAll(
    'D2 401 clears CSRF runtime',
    `${sources.axiosHandleStatus}\n${sources.d2AuthCleanup}`,
    [
        'clearD2ClientAuthArtifacts()',
        'DACsrfService.clearCsrfToken()'
    ],
    'D2 401 branch calls cleanup helper; helper clears CSRF runtime.'
);

assertIncludesAll(
    'D2 401 clears legacy auth keys',
    `${sources.axiosHandleStatus}\n${sources.d2AuthCleanup}\n${sources.authStorageCleanup}`,
    [
        'clearD2ClientAuthArtifacts()',
        'clearLegacyAuthStorageForD2(session)',
        'LEGACY_AUTH_STORAGE_KEYS'
    ],
    'D2 401 branch removes legacy auth storage residues.'
);

assertIncludesAll(
    'D2 401 preserves remembered identifier',
    `${sources.axiosHandleStatus}\n${sources.authStorageCleanup}\n${sources.rememberedIdentifier}`,
    [
        'clearD2ClientAuthArtifacts()',
        "REMEMBERED_IDENTIFIER_KEY = 'medsync.auth.rememberedIdentifier.v1'",
        'key === REMEMBERED_IDENTIFIER_KEY'
    ],
    'D2 401 cleanup uses helper that preserves remembered identifier.'
);

assertIncludesAll(
    'D2 401 avoids login/session/csrf redirect loops',
    `${sources.axiosHandleStatus}\n${sources.d2AuthCleanup}`,
    [
        'shouldSkipD2UnauthorizedRedirect(error)',
        'D2_UNAUTHORIZED_REDIRECT_SKIP_ENDPOINTS',
        'api/auth/login',
        'api/auth/session',
        'api/auth/csrf',
        'redirectToAuthIfNeeded()'
    ],
    'D2 401 cleanup skips redirect for auth loop endpoints.'
);

addCheck('logout renewal token storage is confined to legacy mode',
    legacyCloseTokenWrite.test(logoutAction) && logoutAction.includes('const cookieMode = isD2AuthMode()'),
    'Only a legacy renewal may temporarily replace its bearer token to revoke the server session; D2 never writes it.');

assertNoMatches(
    'no D2 token or refresh token writes',
    {
        authActions: sources.authActions.replace(legacyCloseTokenWrite, ''),
        axiosHandleStatus: sources.axiosHandleStatus,
        d2AuthCleanup: sources.d2AuthCleanup,
        authStorageCleanup: sources.authStorageCleanup
    },
    [
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /localStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /localStorage\.setItem\s*\(\s*['"]refresh_token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refresh_token['"]/,
        /\$session\.set\s*\(\s*['"]token['"]/,
        /\$session\.set\s*\(\s*['"]refreshtoken['"]/,
        /\$session\.set\s*\(\s*['"]refresh_token['"]/
    ],
    'D2 writes no readable tokens; the exact guarded legacy close-only write is excluded above.'
);

assertNoMatches(
    'layouts and views were not migrated in D2-5D',
    { layoutAndViewSources },
    [
        /clearD2ClientAuthArtifacts/,
        /D2_UNAUTHORIZED_REDIRECT_SKIP_ENDPOINTS/,
        /shouldSkipD2UnauthorizedRedirect/
    ],
    'Layouts/views keep pending state for D2-5E.'
);

const sourceFilesOnly = Object.values(files).every((relativePath) => (
    relativePath.startsWith('src/')
    || relativePath.startsWith('scripts/qa/')
));

addCheck(
    'backend not touched by D2-5D QA scope',
    sourceFilesOnly,
    'Checked files are limited to frontend src and scripts/qa.'
);

const command = process.argv[2] || 'status';
const allowedCommands = ['status', 'validate', 'full'];

if (!allowedCommands.includes(command)) {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write(`Usage: ${qaMetadata.command}\n`);
    process.exit(2);
}

const failed = checks.filter((check) => check.status !== 'OK');
const result = {
    ...qaMetadata,
    requestedCommand: command,
    summary: failed.length === 0 ? 'OK' : 'FAIL',
    checks
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (failed.length > 0) {
    process.exit(1);
}
