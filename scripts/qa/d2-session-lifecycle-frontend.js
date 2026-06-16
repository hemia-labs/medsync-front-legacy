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
    router: 'src/router/index.js',
    authService: 'src/services/core/auth/DAAuthService.js',
    sessionService: 'src/services/core/auth/DASessionService.js',
    csrfService: 'src/services/core/auth/DACsrfService.js',
    d2AuthCleanup: 'src/utils/d2AuthCleanup.js',
    authStorageCleanup: 'src/utils/authStorageCleanup.js',
    rememberedIdentifier: 'src/utils/authRememberedIdentifier.js',
    medicalHistory: 'src/views/Patient/Sections/MedicalHistory.vue',
    documentsAndSignatures: 'src/views/Patient/Sections/DocumentsAndSignatures.vue',
    treatmentPlan: 'src/views/Patient/Sections/TreatmentPlan.vue'
};

const qaMetadata = {
    phase: 'D2-6 Frontend Session Lifecycle',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-session-lifecycle-frontend.js full',
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

const getBlock = (source, marker) => {
    const start = source.indexOf(marker);
    if (start < 0) {
        return '';
    }

    const braceStart = source.indexOf('{', start);
    if (braceStart < 0) {
        return '';
    }

    let depth = 0;
    for (let index = braceStart; index < source.length; index += 1) {
        if (source[index] === '{') {
            depth += 1;
        } else if (source[index] === '}') {
            depth -= 1;
            if (depth === 0) {
                return source.slice(start, index + 1);
            }
        }
    }

    return source.slice(start);
};

const getD2GuardBlock = (source, marker) => {
    const block = getBlock(source, marker);
    return getBlock(block, 'if(isD2AuthMode())') || getBlock(block, 'if (isD2AuthMode())');
};

const getFunctionSource = (source, functionName) => {
    const start = source.indexOf(`function ${functionName}`);
    if (start < 0) {
        return '';
    }

    const nextFunction = source.indexOf('\n  function ', start + 1);
    const nextRouterHook = source.indexOf('\n  router.beforeEach', start + 1);
    const candidates = [nextFunction, nextRouterHook].filter((index) => index > start);
    const end = candidates.length ? Math.min(...candidates) : source.length;
    return source.slice(start, end);
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

const ensureD2SessionSource = getFunctionSource(sources.router, 'ensureD2SessionHydrated');
const d2BeforeEachSource = getFunctionSource(sources.router, 'd2BeforeEach');
const logoutAction = getActionBlock(sources.authActions, 'logout');
const refreshAction = getActionBlock(sources.authActions, 'getRefreshtoken');
const d2LogoutBranch = getBlock(logoutAction, 'if(isD2AuthMode())') || getBlock(logoutAction, 'if (isD2AuthMode())');
const clinicalD2Blocks = [
    getD2GuardBlock(sources.medicalHistory, 'currentUser()'),
    getD2GuardBlock(sources.documentsAndSignatures, 'currentUser: function()'),
    getD2GuardBlock(sources.treatmentPlan, 'currentUser: function()'),
    getD2GuardBlock(sources.documentsAndSignatures, 'businessName: function()'),
    getD2GuardBlock(sources.treatmentPlan, 'businessName: function()')
].join('\n');

assertIncludesAll(
    'D2 reload uses /api/auth/session',
    `${d2BeforeEachSource}\n${ensureD2SessionSource}\n${sources.authActions}\n${sources.authService}\n${sources.sessionService}`,
    [
        'const shouldHydrate = requiredAuth || to.name === \'login\'',
        'await ensureD2SessionHydrated()',
        'store.dispatch(`${AUTH_NAMESPACE}/getToken`)',
        'const response = await DAAuthService.session()',
        'DASessionService.bootstrapSession()',
        'DAC_AUTH_SESSION',
        'withCredentials: true'
    ],
    'Protected route reload hydrates runtime auth from /api/auth/session with credentials.'
);

assertIncludesAll(
    'D2 new tab uses /api/auth/session',
    `${ensureD2SessionSource}\n${sources.authMutations}\n${sources.sessionService}`,
    [
        'if(isD2Authorized())',
        'await store.dispatch(`${AUTH_NAMESPACE}/getToken`)',
        'return isD2Authorized()',
        'SET_D2_AUTH_SESSION',
        'state.authenticated = true'
    ],
    'Empty runtime state in a new tab triggers session bootstrap, then Vuex runtime session.'
);

assertIncludesAll(
    'D2 without session redirects to auth',
    d2BeforeEachSource,
    [
        'requiredAuth && to.name !== \'login\' && !hasSession',
        'next({ name: \'auth\' })'
    ],
    'Protected D2 routes without a backend session redirect to auth.'
);

assertIncludesAll(
    'D2 401 clears runtime',
    sources.axiosHandleStatus,
    [
        'if(isD2AuthMode())',
        "store.commit(modules.AUTH+'/'+types.SET_D2_AUTH_SESSION, null, {root: true})",
        "store.commit(modules.AUTH+'/'+types.SET_AUTH_UNAUTHORIZED, true, {root: true})"
    ],
    'D2 401 clears Vuex runtime session and marks unauthorized.'
);

assertIncludesAll(
    'D2 401 clears CSRF runtime',
    `${sources.axiosHandleStatus}\n${sources.d2AuthCleanup}`,
    [
        'clearD2ClientAuthArtifacts()',
        'DACsrfService.clearCsrfToken()',
        'csrfCleared: true'
    ],
    'D2 401 cleanup clears CSRF runtime state.'
);

assertIncludesAll(
    'D2 401 clears legacy auth storage',
    `${sources.axiosHandleStatus}\n${sources.d2AuthCleanup}\n${sources.authStorageCleanup}`,
    [
        'clearLegacyAuthStorageForD2(session)',
        'LEGACY_AUTH_STORAGE_KEYS',
        'token',
        'refreshtoken',
        'business',
        'tenantOperational'
    ],
    'D2 401 cleanup removes legacy auth residue keys.'
);

assertIncludesAll(
    'D2 401 avoids login session csrf loops',
    `${sources.axiosHandleStatus}\n${sources.d2AuthCleanup}`,
    [
        'shouldSkipD2UnauthorizedRedirect(error)',
        'D2_UNAUTHORIZED_REDIRECT_SKIP_ENDPOINTS',
        'api/auth/login',
        'api/auth/session',
        'api/auth/csrf'
    ],
    'D2 401 redirect skips auth bootstrap endpoints.'
);

assertIncludesAll(
    'D2 logout normal cleans runtime storage and CSRF',
    `${d2LogoutBranch}\n${sources.d2AuthCleanup}\n${sources.authStorageCleanup}`,
    [
        'await DAAuthService.close()',
        'commit(types.SET_D2_AUTH_SESSION, null)',
        'commit(types.SET_AUTH_UNAUTHORIZED, false)',
        'clearD2ClientAuthArtifacts(Vue.prototype.$session)',
        'DACsrfService.clearCsrfToken()',
        'clearLegacyAuthStorageForD2(session)'
    ],
    'D2 logout closes backend then clears local runtime, CSRF and legacy storage.'
);

assertIncludesAll(
    'D2 logout failure still cleans local state',
    d2LogoutBranch,
    [
        'try {',
        'await DAAuthService.close()',
        '} finally {',
        'commit(types.SET_D2_AUTH_SESSION, null)',
        'clearD2ClientAuthArtifacts(Vue.prototype.$session)',
        'window.location.href = \'/auth/login\''
    ],
    'D2 logout local cleanup runs in finally even if backend close fails.'
);

assertIncludesAll(
    'D2 refresh does not send refresh token in body',
    `${refreshAction}\n${sources.authService}`,
    [
        'const response = await DAAuthService.refreshToken()',
        'if(isD2AuthMode())',
        'DACore.post(DAC_AUTH_REFRESH_TOKEN, {})'
    ],
    'D2 refresh calls backend with empty body and relies on HttpOnly refresh cookie.'
);

assertIncludesAll(
    'D2 refresh rehydrates /api/auth/session',
    `${refreshAction}\n${sources.authService}\n${sources.sessionService}`,
    [
        'commitD2Session(commit, response)',
        'DASessionService.bootstrapSession()',
        'DAC_AUTH_SESSION',
        'withCredentials: true'
    ],
    'D2 refresh bootstraps session after rotation.'
);

assertIncludesAll(
    'D2 does not use Authorization',
    sources.axiosHelper,
    [
        'if(isD2AuthMode())',
        'return {}',
        'removeAuthorizationHeader',
        'delete nextHeaders.Authorization',
        'delete nextHeaders.authorization'
    ],
    'D2 request config strips Authorization and token helper returns empty config.'
);

assertNoMatches(
    'D2 does not persist access or refresh token in storage',
    {
        authActions: sources.authActions,
        authMutations: sources.authMutations,
        authStorageCleanup: sources.authStorageCleanup,
        authService: sources.authService
    },
    [
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /localStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /localStorage\.setItem\s*\(\s*['"]refresh_token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refresh_token['"]/
    ],
    'No direct token/refreshtoken writes to localStorage/sessionStorage in D2 auth files.'
);

assertIncludesAll(
    'remembered identifier is preserved',
    `${sources.authStorageCleanup}\n${sources.rememberedIdentifier}`,
    [
        "REMEMBERED_IDENTIFIER_KEY = 'medsync.auth.rememberedIdentifier.v1'",
        'preservedKeys: [REMEMBERED_IDENTIFIER_KEY]',
        'key === REMEMBERED_IDENTIFIER_KEY'
    ],
    'D2 cleanup preserves remembered identifier.'
);

assertNoMatches(
    'clinical views still have no manual token in D2',
    { clinicalD2Blocks },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /\$session\.get\s*\(\s*['"]business['"]/,
        /Authorization\s*:/,
        /\btoken\b.*Service\./,
        /atob\s*\(/,
        /decode\s*\(/
    ],
    'Clinical D2 branches use runtime user/role/business and no manual token.'
);

assertIncludesAll(
    'legacy default remains intact',
    `${sources.authConfig}\n${sources.authActions}\n${sources.router}\n${sources.axiosHelper}`,
    [
        'DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY',
        'DEFAULT_BROWSER_AUTH_TRANSPORT = BROWSER_AUTH_TRANSPORTS.AUTHORIZATION',
        "Vue.prototype.$session.get('token')",
        "'Authorization': token",
        'legacyBeforeEach'
    ],
    'Legacy remains default and keeps current Authorization/session path outside D2.'
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
