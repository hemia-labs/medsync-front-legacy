#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const files = {
    authConfig: 'src/services/config/authTransport.config.js',
    axiosHelper: 'src/services/config/axios.helper.js',
    authActions: 'src/store/modules/auth/actions.js',
    authMutations: 'src/store/modules/auth/mutations.js',
    authState: 'src/store/modules/auth/state.js',
    authGetters: 'src/store/modules/auth/getters.js',
    mutationTypes: 'src/store/modules/common/mutation-types.js',
    authStorageCleanup: 'src/utils/authStorageCleanup.js',
    rememberedIdentifier: 'src/utils/authRememberedIdentifier.js',
    authService: 'src/services/core/auth/DAAuthService.js'
};

const qaMetadata = {
    phase: 'D2-5B Frontend Store/Vuex Token Removal',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-store-token-removal.js full',
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

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.map((entry) => {
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

const checks = [];

const addCheck = (name, ok, evidence) => {
    checks.push({
        name,
        status: ok ? 'OK' : 'FAIL',
        evidence
    });
};

const includesAll = (source, needles) => needles.every((needle) => source.includes(needle));
const matches = (source, pattern) => pattern.test(source);

const assertIncludesAll = (name, source, needles, evidence) => {
    addCheck(name, includesAll(source, needles), evidence);
};

const assertMatches = (name, source, pattern, evidence) => {
    addCheck(name, matches(source, pattern), evidence);
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

const d2MutationSource = sources.authMutations;
const d2ActionSource = sources.authActions;
const patientViewSource = readTreeSources('src/views/Patient');

assertIncludesAll(
    'legacy default remains authorization transport',
    `${sources.authConfig}\n${sources.axiosHelper}`,
    [
        'DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY',
        'DEFAULT_BROWSER_AUTH_TRANSPORT = BROWSER_AUTH_TRANSPORTS.AUTHORIZATION',
        "'Authorization': token"
    ],
    'Legacy defaults and Authorization helper remain present.'
);

assertIncludesAll(
    'legacy default can still use vue-session',
    `${sources.authState}\n${sources.authMutations}\n${sources.authActions}`,
    [
        "session.get('token')",
        "Vue.prototype.$session.set('token', payload)",
        "Vue.prototype.$session.set('refreshtoken', payload)"
    ],
    'Legacy $session read/write path remains present outside D2.'
);

assertIncludesAll(
    'D2 SET_TOKEN branch does not persist token',
    d2MutationSource,
    [
        '[types.SET_TOKEN]',
        'if(isD2AuthMode())',
        'state.token = null',
        'return'
    ],
    'SET_TOKEN exits early in D2 before legacy $session token write.'
);

assertIncludesAll(
    'D2 SET_REFRESH_TOKEN branch does not persist refresh token',
    d2MutationSource,
    [
        '[types.SET_REFRESH_TOKEN]',
        'if(isD2AuthMode())',
        'state.refreshtoken = null',
        'return'
    ],
    'SET_REFRESH_TOKEN exits early in D2 before legacy refresh token write.'
);

assertNoMatches(
    'no refresh_token or id_refresh_token is persisted to vue-session',
    {
        authActions: sources.authActions,
        authMutations: sources.authMutations,
        authState: sources.authState
    },
    [
        /\$session\.set\s*\(\s*['"]refresh_token['"]/,
        /\$session\.set\s*\(\s*['"]id_refresh_token['"]/,
        /session\.set\s*\(\s*['"]refresh_token['"]/,
        /session\.set\s*\(\s*['"]id_refresh_token['"]/
    ],
    'No direct vue-session writes for refresh_token or id_refresh_token.'
);

assertIncludesAll(
    'D2 permissions remain runtime only',
    d2MutationSource,
    [
        'state.permissions = normalizePermissions(payload)',
        'if(!isD2AuthMode())',
        'setSessionPermissions(Vue.prototype.$session, state.permissions)'
    ],
    'Permission persistence is guarded to legacy mode.'
);

assertMatches(
    'D2 business remains runtime only',
    d2MutationSource,
    /SET_AUTH_BUSINESS[\s\S]*?if\(isD2AuthMode\(\)\)\s*\{[\s\S]*?return[\s\S]*?Vue\.prototype\.\$session\.set\('business'/,
    'Business mutation returns in D2 before vue-session persistence.'
);

assertMatches(
    'D2 tenantOperational remains runtime only',
    d2MutationSource,
    /SET_AUTH_TENANT_OPERATIONAL[\s\S]*?if\(isD2AuthMode\(\)\)\s*\{[\s\S]*?return[\s\S]*?Vue\.prototype\.\$session\.set\('tenantOperational'/,
    'Tenant operational mutation returns in D2 before vue-session persistence.'
);

assertIncludesAll(
    'D2 runtime store can receive session DTO',
    `${sources.mutationTypes}\n${sources.authMutations}\n${sources.authGetters}`,
    [
        'SET_D2_AUTH_SESSION',
        'state.authenticated = true',
        'state.user = sessionPayload.user || null',
        'state.role = getRoleCode(sessionPayload)',
        'state.permissions = normalizePermissions(sessionPayload.permissions)',
        'state.business = sessionPayload.business || null',
        'state.tenantOperational = sessionPayload.tenantOperational || null',
        'state.accessExpiresAt = sessionPayload.accessExpiresAt || null',
        'state.sessionState = sessionPayload.sessionState || null'
    ],
    'D2 session DTO fields populate Vuex runtime state.'
);

assertIncludesAll(
    'D2 login uses runtime session commit',
    d2ActionSource,
    [
        'if(isD2AuthMode())',
        'commitD2Session(commit, response)',
        'clearLegacyAuthStorageForD2(Vue.prototype.$session)'
    ],
    'D2 login path commits session DTO without SET_TOKEN/SET_REFRESH_TOKEN.'
);

assertIncludesAll(
    'D2 bootstrap uses auth session endpoint',
    d2ActionSource,
    [
        'const response = await DAAuthService.session()',
        'commitD2Session(commit, response && response.success ? response : null)'
    ],
    'D2 getToken action hydrates runtime session from /api/auth/session service.'
);

assertIncludesAll(
    'D2 refresh uses HttpOnly cookie and rehydrates session',
    `${sources.authActions}\n${sources.authService}`,
    [
        'const response = await DAAuthService.refreshToken()',
        'DACore.post(DAC_AUTH_REFRESH_TOKEN, {})',
        'DASessionService.bootstrapSession()'
    ],
    'D2 refresh sends empty body and then bootstraps session.'
);

assertIncludesAll(
    'remembered identifier is preserved',
    `${sources.authStorageCleanup}\n${sources.rememberedIdentifier}`,
    [
        "REMEMBERED_IDENTIFIER_KEY = 'medsync.auth.rememberedIdentifier.v1'",
        'preservedKeys: [REMEMBERED_IDENTIFIER_KEY]',
        'key === REMEMBERED_IDENTIFIER_KEY'
    ],
    'Cleanup helper preserves medsync.auth.rememberedIdentifier.v1.'
);

assertNoMatches(
    'no new localStorage token writes in D2 store files',
    {
        authActions: sources.authActions,
        authMutations: sources.authMutations,
        authState: sources.authState,
        authStorageCleanup: sources.authStorageCleanup,
        authService: sources.authService
    },
    [
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /localStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /localStorage\.setItem\s*\(\s*['"]refresh_token['"]/,
        /localStorage\.setItem\s*\(\s*['"]id_refresh_token['"]/
    ],
    'No localStorage writes for access or refresh tokens in D2-5B files.'
);

assertNoMatches(
    'no new sessionStorage token writes in D2 store files',
    {
        authActions: sources.authActions,
        authMutations: sources.authMutations,
        authState: sources.authState,
        authStorageCleanup: sources.authStorageCleanup,
        authService: sources.authService
    },
    [
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refresh_token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]id_refresh_token['"]/
    ],
    'No sessionStorage writes for access or refresh tokens in D2-5B files.'
);

assertNoMatches(
    'patient views add no token writes after D2-5E migrations',
    { patientViewSource },
    [
        /\$session\.set\s*\(\s*['"]token['"]/,
        /\$session\.set\s*\(\s*['"]refreshtoken['"]/,
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/
    ],
    'No token/refreshtoken writes found in patient views.'
);

const sourceFilesOnly = Object.values(files).every((relativePath) => (
    relativePath.startsWith('src/')
    || relativePath.startsWith('scripts/qa/')
));

addCheck(
    'D2-5B file set is frontend only',
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
