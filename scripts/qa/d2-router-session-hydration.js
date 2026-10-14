#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const files = {
    router: 'src/router/index.js',
    authActions: 'src/store/modules/auth/actions.js',
    authMutations: 'src/store/modules/auth/mutations.js',
    authGetters: 'src/store/modules/auth/getters.js',
    authService: 'src/services/core/auth/DAAuthService.js',
    sessionService: 'src/services/core/auth/DASessionService.js',
    authConfig: 'src/services/config/authTransport.config.js'
};

const qaMetadata = {
    phase: 'D2-5C Frontend Router Session Hydration',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-router-session-hydration.js full',
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

const d2BeforeEachSource = getFunctionSource(sources.router, 'd2BeforeEach');
const ensureD2SessionSource = getFunctionSource(sources.router, 'ensureD2SessionHydrated');
const d2TenantSource = getFunctionSource(sources.router, 'getD2TenantOperationalState');
const d2SuperAdminSource = getFunctionSource(sources.router, 'isD2SuperAdminSession');
const patientViewSources = readTreeSources('src/views/Patient');

assertIncludesAll(
    'legacy default still uses current router flow',
    `${sources.authConfig}\n${sources.router}`,
    [
        'DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY',
        'function legacyBeforeEach',
        "Vue.prototype.$session.get('token')",
        'getSessionPermissions(Vue.prototype.$session)',
        'getLegacyTokenPayload()'
    ],
    'Legacy branch keeps token, permissions, role, and tenant checks from vue-session.'
);

assertIncludesAll(
    'D2 router branch is selected by feature flags',
    sources.router,
    [
        'isD2AuthMode()',
        'd2BeforeEach(to, next, requiredAuth)',
        'legacyBeforeEach(to, next, requiredAuth)'
    ],
    'Router bifurcates D2 and legacy paths.'
);

assertNoMatches(
    'D2 router does not read token from vue-session',
    { d2BeforeEachSource, ensureD2SessionSource, d2TenantSource, d2SuperAdminSource },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /Vue\.prototype\.\$session\.get\s*\(\s*['"]token['"]/
    ],
    'D2 router functions do not read $session token.'
);

assertNoMatches(
    'D2 router does not decode JWT',
    { d2BeforeEachSource, ensureD2SessionSource, d2TenantSource, d2SuperAdminSource },
    [
        /atob\s*\(/,
        /jwtDecode/,
        /decode\s*\(/,
        /getLegacyTokenPayload/
    ],
    'D2 router functions do not decode JWT or call legacy token payload.'
);

assertIncludesAll(
    'D2 router hydrates with auth session action',
    `${sources.router}\n${sources.authActions}\n${sources.authService}\n${sources.sessionService}`,
    [
        'ensureD2SessionHydrated',
        'store.dispatch(`${AUTH_NAMESPACE}/getToken`)',
        'DAAuthService.session()',
        'DASessionService.bootstrapSession()',
        'DAC_AUTH_SESSION'
    ],
    'D2 hydration path reaches /api/auth/session through existing service.'
);

assertIncludesAll(
    'D2 router avoids unnecessary session calls when runtime exists',
    ensureD2SessionSource,
    [
        'if(isD2Authorized())',
        'return true',
        'store.dispatch(`${AUTH_NAMESPACE}/getToken`)'
    ],
    'D2 router skips bootstrap when Vuex runtime is already authenticated.'
);

assertIncludesAll(
    'D2 router covers reload and new tab protected routes',
    d2BeforeEachSource,
    [
        'const shouldHydrate = requiredAuth || to.name === \'login\'',
        'const hasSession = shouldHydrate ? await ensureD2SessionHydrated() : isD2Authorized()'
    ],
    'Protected route navigation hydrates from backend when runtime starts empty.'
);

assertIncludesAll(
    'D2 no-session redirects to login safely',
    d2BeforeEachSource,
    [
        'requiredAuth && to.name !== \'login\' && !hasSession',
        'next({ name: \'auth\' })'
    ],
    'Missing or invalid D2 session redirects to auth route.'
);

assertIncludesAll(
    'D2 401 or invalid session has basic safe handling',
    `${ensureD2SessionSource}\n${sources.authActions}\n${sources.authMutations}`,
    [
        'catch {',
        'return false',
        'commit(types.SET_AUTH_ACCESS_SESSION, null)',
        'response.unauthorized || response.status === 401 || response.success',
        'setAnonymousRuntimeState(state)',
        'state.unauthorized = true'
    ],
    'Hydration failure leaves runtime anonymous and denies protected routes.'
);

assertIncludesAll(
    'D2 permissions come from runtime session DTO',
    d2BeforeEachSource,
    [
        'store.getters[`${AUTH_NAMESPACE}/getPermissions`]',
        'hasAnyPermission(runtimePermissions, requiredPermissionOptions)',
        'hasPermission(runtimePermissions, requiredPermission)'
    ],
    'D2 router uses Vuex runtime permissions, not vue-session permissions.'
);

assertIncludesAll(
    'D2 role comes from runtime session DTO',
    `${d2BeforeEachSource}\n${d2SuperAdminSource}`,
    [
        'store.getters[`${AUTH_NAMESPACE}/getRole`]',
        'runtimeRole !== requiredRole',
        'store.getters[`${AUTH_NAMESPACE}/isSuperAdmin`]'
    ],
    'D2 router uses Vuex runtime role for role guard and default route.'
);

assertIncludesAll(
    'D2 tenantOperational comes from runtime session DTO',
    `${d2BeforeEachSource}\n${d2TenantSource}`,
    [
        'store.getters[`${AUTH_NAMESPACE}/getTenantOperational`]',
        'isD2TenantRestrictedSession()',
        'next({ name: \'tenantRestricted\' })'
    ],
    'D2 tenant restriction uses Vuex runtime tenantOperational.'
);

assertNoMatches(
    'D2-5C files add no token writes to vue-session',
    { router: sources.router },
    [
        /\$session\.set\s*\(\s*['"]token['"]/,
        /\$session\.set\s*\(\s*['"]refreshtoken['"]/,
        /\$session\.set\s*\(\s*['"]refresh_token['"]/
    ],
    'Router adds no token writes to vue-session.'
);

assertNoMatches(
    'D2-5C files add no token writes to web storage',
    { router: sources.router },
    [
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /localStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refreshtoken['"]/
    ],
    'Router adds no localStorage/sessionStorage token writes.'
);

assertNoMatches(
    'patient views add no router/session hydration internals after D2-5E migrations',
    { patientViewSources },
    [
        /ensureD2SessionHydrated/,
        /DASessionService/,
        /SET_D2_AUTH_SESSION/
    ],
    'Patient views do not own router hydration or session DTO mutation.'
);

assertIncludesAll(
    'D2 runtime store can receive hydrated session',
    `${sources.authMutations}\n${sources.authGetters}`,
    [
        'SET_D2_AUTH_SESSION',
        'state.authenticated = true',
        'state.permissions = normalizePermissions(sessionPayload.permissions)',
        'getTenantOperational',
        'getRole'
    ],
    'D2 router hydration has runtime Vuex target fields.'
);

const sourceFilesOnly = Object.values(files).every((relativePath) => (
    relativePath.startsWith('src/')
    || relativePath.startsWith('scripts/qa/')
));

addCheck(
    'D2-5C file set is frontend only',
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
