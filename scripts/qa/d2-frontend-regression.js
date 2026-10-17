#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const d2QaScripts = [
    'scripts/qa/d2-auth-client-foundation.js',
    'scripts/qa/d2-store-token-removal.js',
    'scripts/qa/d2-router-session-hydration.js',
    'scripts/qa/d2-logout-401-cleanup.js',
    'scripts/qa/d2-core-layouts-auth-views.js',
    'scripts/qa/d2-clinical-patient-views.js'
];

const files = {
    packageJson: 'package.json',
    authConfig: 'src/services/config/authTransport.config.js',
    axiosHelper: 'src/services/config/axios.helper.js',
    coreInstance: 'src/services/config/core.instance.js',
    csrfService: 'src/services/core/auth/DACsrfService.js',
    sessionService: 'src/services/core/auth/DASessionService.js',
    authService: 'src/services/core/auth/DAAuthService.js',
    apiUrl: 'src/services/common/apiurl.js',
    axiosHandleStatus: 'src/services/config/axios.handlestatus.js',
    authActions: 'src/store/modules/auth/actions.js',
    authMutations: 'src/store/modules/auth/mutations.js',
    authState: 'src/store/modules/auth/state.js',
    authGetters: 'src/store/modules/auth/getters.js',
    mutationTypes: 'src/store/modules/common/mutation-types.js',
    router: 'src/router/index.js',
    d2AuthCleanup: 'src/utils/d2AuthCleanup.js',
    authStorageCleanup: 'src/utils/authStorageCleanup.js',
    rememberedIdentifier: 'src/utils/authRememberedIdentifier.js',
    adminLayout: 'src/core/layouts/admin.vue',
    superAdminLayout: 'src/core/layouts/super-admin.vue',
    loginView: 'src/views/Auth/Login.vue',
    homeView: 'src/views/Home/Home.vue',
    tenantRestrictedView: 'src/views/error/TenantRestricted.vue',
    medicalHistory: 'src/views/Patient/Sections/MedicalHistory.vue',
    documentsAndSignatures: 'src/views/Patient/Sections/DocumentsAndSignatures.vue',
    treatmentPlan: 'src/views/Patient/Sections/TreatmentPlan.vue',
    appointmentStorage: 'src/domain/appointments/appointment.storage.js'
};

const qaMetadata = {
    phase: 'D2-5F Frontend QA / Regression',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-frontend-regression.js full',
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

const packageJson = JSON.parse(sources.packageJson);
const hasTestScript = Boolean(packageJson.scripts && packageJson.scripts.test);
const patientViewSources = readTreeSources('src/views/Patient');

const d2BeforeEachSource = getFunctionSource(sources.router, 'd2BeforeEach');
const ensureD2SessionSource = getFunctionSource(sources.router, 'ensureD2SessionHydrated');
const d2TenantSource = getFunctionSource(sources.router, 'getD2TenantOperationalState');
const d2SuperAdminSource = getFunctionSource(sources.router, 'isD2SuperAdminSession');
const d2RouterSources = {
    d2BeforeEachSource,
    ensureD2SessionSource,
    d2TenantSource,
    d2SuperAdminSource
};

const logoutAction = getActionBlock(sources.authActions, 'logout');
// S18 shares logout cleanup between transports and clears runtime before HTTP.
const d2LogoutBranch = logoutAction;

const adminSessionUserD2 = getD2GuardBlock(sources.adminLayout, 'sessionUser: function()');
const adminBusinessD2 = getD2GuardBlock(sources.adminLayout, 'businessName: function()');
const adminUnauthorizedD2 = getBlock(getBlock(sources.adminLayout, 'unauthorized: async function()'), 'if(isD2AuthMode())');
const superAdminUnauthorizedD2 = getBlock(getBlock(sources.superAdminLayout, 'unauthorized: async function()'), 'if(isD2AuthMode())');
const loginPostRouteD2 = getD2GuardBlock(sources.loginView, 'getPostLoginRoute: function()');
const homeSessionUserD2 = getD2GuardBlock(sources.homeView, 'sessionUser: function()');
const tenantOperationalD2 = getD2GuardBlock(sources.tenantRestrictedView, 'tenantOperational()');
const coreD2Blocks = [
    adminSessionUserD2,
    adminBusinessD2,
    adminUnauthorizedD2,
    superAdminUnauthorizedD2,
    loginPostRouteD2,
    homeSessionUserD2,
    tenantOperationalD2
].join('\n');

const medicalCurrentUserD2 = getD2GuardBlock(sources.medicalHistory, 'currentUser()');
const documentsCurrentUserD2 = getD2GuardBlock(sources.documentsAndSignatures, 'currentUser: function()');
const treatmentCurrentUserD2 = getD2GuardBlock(sources.treatmentPlan, 'currentUser: function()');
const documentsBusinessD2 = getD2GuardBlock(sources.documentsAndSignatures, 'businessName: function()');
const treatmentBusinessD2 = getD2GuardBlock(sources.treatmentPlan, 'businessName: function()');
const clinicalD2Blocks = [
    medicalCurrentUserD2,
    documentsCurrentUserD2,
    treatmentCurrentUserD2,
    documentsBusinessD2,
    treatmentBusinessD2
].join('\n');

const allFrontendFiles = {
    authConfig: sources.authConfig,
    axiosHelper: sources.axiosHelper,
    coreInstance: sources.coreInstance,
    csrfService: sources.csrfService,
    sessionService: sources.sessionService,
    authService: sources.authService,
    axiosHandleStatus: sources.axiosHandleStatus,
    authActions: sources.authActions,
    authMutations: sources.authMutations,
    authStorageCleanup: sources.authStorageCleanup,
    d2AuthCleanup: sources.d2AuthCleanup,
    rememberedIdentifier: sources.rememberedIdentifier,
    router: sources.router
};

addCheck(
    'all prior D2-5 QA scripts exist',
    d2QaScripts.every((relativePath) => fs.existsSync(path.join(rootDir, relativePath))),
    d2QaScripts.join(', ')
);

assertIncludesAll(
    'config default remains legacy',
    sources.authConfig,
    [
        'DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY',
        'DEFAULT_BROWSER_AUTH_TRANSPORT = BROWSER_AUTH_TRANSPORTS.AUTHORIZATION',
        'DEFAULT_CSRF_ENABLED = false'
    ],
    'D2 remains inactive by default.'
);

assertIncludesAll(
    'D2 config requires cookie transport flags',
    sources.authConfig,
    [
        'getAuthCookieMode() === AUTH_COOKIE_MODES.D2',
        'getBrowserAuthTransport() === BROWSER_AUTH_TRANSPORTS.COOKIE',
        'process.env.VUE_APP_AUTH_COOKIE_MODE',
        'process.env.VUE_APP_BROWSER_AUTH_TRANSPORT',
        'process.env.VUE_APP_CSRF_ENABLED'
    ],
    'D2 mode requires auth cookie mode plus cookie browser transport; CSRF uses env flag.'
);

assertIncludesAll(
    'axios D2 uses withCredentials',
    `${sources.axiosHelper}\n${sources.csrfService}\n${sources.sessionService}`,
    [
        'withCredentials: true'
    ],
    'D2 request, CSRF, and session clients use credentialed requests.'
);

assertIncludesAll(
    'axios D2 strips Authorization',
    sources.axiosHelper,
    [
        'if(isD2AuthMode())',
        'return {}',
        'removeAuthorizationHeader',
        'delete nextHeaders.Authorization',
        'delete nextHeaders.authorization'
    ],
    'D2 getToken returns empty config and D2 request config removes Authorization variants.'
);

assertIncludesAll(
    'axios D2 adds X-CSRF-Token on mutations',
    `${sources.axiosHelper}\n${sources.csrfService}`,
    [
        "const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];",
        'isCsrfEnabled() && isMutatingMethod(method)',
        'DACsrfService.getCsrfHeader()',
        "const DEFAULT_CSRF_HEADER = 'X-CSRF-Token'",
        'ensureCsrfToken'
    ],
    'Mutating D2 methods request CSRF header; GET is not in mutating methods.'
);

assertIncludesAll(
    'store D2 does not persist access token',
    `${sources.authActions}\n${sources.authMutations}`,
    [
        '[types.SET_TOKEN]',
        'if(isD2AuthMode())',
        'state.token = null',
        'commitD2Session(commit, response)',
        'clearLegacyAuthStorageForD2(Vue.prototype.$session)'
    ],
    'SET_TOKEN exits early in D2; login commits runtime session DTO.'
);

assertIncludesAll(
    'store D2 does not persist refresh token',
    `${sources.authActions}\n${sources.authMutations}\n${sources.authService}`,
    [
        '[types.SET_REFRESH_TOKEN]',
        'if(isD2AuthMode())',
        'state.refreshtoken = null',
        'DACore.post(DAC_AUTH_REFRESH_TOKEN, {})',
        'DASessionService.bootstrapSession()'
    ],
    'SET_REFRESH_TOKEN exits early in D2; refresh uses cookie and rehydrates session.'
);

assertNoMatches(
    'D2 store cleanup files add no token writes to web storage',
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
        /localStorage\.setItem\s*\(\s*['"]id_refresh_token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refresh_token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]id_refresh_token['"]/
    ],
    'No direct web storage writes for access/refresh tokens in D2 store/auth files.'
);

assertNoMatches(
    'router D2 does not decode JWT',
    d2RouterSources,
    [
        /atob\s*\(/,
        /jwtDecode/,
        /decode\s*\(/,
        /getLegacyTokenPayload/
    ],
    'D2 router functions use runtime store, not decoded JWT.'
);

assertNoMatches(
    'router D2 does not read session token',
    d2RouterSources,
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /Vue\.prototype\.\$session\.get\s*\(\s*['"]token['"]/
    ],
    'D2 router functions do not read $session token.'
);

assertIncludesAll(
    'logout D2 cleans runtime storage and CSRF',
    `${d2LogoutBranch}\n${sources.d2AuthCleanup}\n${sources.authStorageCleanup}`,
    [
        'commit(types.SET_AUTH_ACCESS_SESSION, null)',
        'commit(types.SET_AUTH_UNAUTHORIZED, false)',
        'clearD2ClientAuthArtifacts(Vue.prototype.$session)',
        'DACsrfService.clearCsrfToken()',
        'clearLegacyAuthStorageForD2(session)',
        'LEGACY_AUTH_STORAGE_KEYS'
    ],
    'D2 logout clears Vuex runtime, CSRF runtime, and legacy auth storage residue.'
);

assertIncludesAll(
    '401 D2 avoids login session csrf loops',
    `${sources.axiosHandleStatus}\n${sources.d2AuthCleanup}`,
    [
        'shouldSkipD2UnauthorizedRedirect(error)',
        'D2_UNAUTHORIZED_REDIRECT_SKIP_ENDPOINTS',
        'api/auth/login',
        'api/auth/session',
        'api/auth/csrf',
        'redirectToAuthIfNeeded()'
    ],
    'D2 401 cleanup skips redirects for auth bootstrap endpoints.'
);

assertNoMatches(
    'core layouts D2 do not read token or refresh token JS',
    { coreD2Blocks },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /\$session\.get\s*\(\s*['"]refreshtoken['"]/,
        /\$session\.get\s*\(\s*['"]refresh_token['"]/,
        /this\.refreshtoken/,
        /atob\s*\(/,
        /decode\s*\(/
    ],
    'Core D2 branches use runtime getters and avoid token/refreshtoken JS.'
);

assertNoMatches(
    'clinical views D2 do not read token or business from session',
    { clinicalD2Blocks },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /\$session\.get\s*\(\s*['"]business['"]/,
        /window\.atob\s*\(/,
        /\batob\s*\(/,
        /jwtDecode/,
        /decode\s*\(/
    ],
    'Clinical D2 branches use runtime user/role/business.'
);

assertNoMatches(
    'patient views do not construct Authorization',
    { patientViewSources },
    [
        /Authorization\s*:/,
        /['"]Authorization['"]/,
        /headers\s*:\s*\{[\s\S]*Authorization/
    ],
    'Patient views rely on shared axios transport, not manual Authorization.'
);

assertNoMatches(
    'patient views do not pass manual auth token to services',
    { patientViewSources },
    [
        /\.\w+\s*\([^)]*this\.\$session\.get\s*\(\s*['"]token['"]/,
        /\b[A-Z][A-Za-z0-9]*Service\.\w+\s*\([^)]*\btoken\b[^)]*\)/
    ],
    'Patient views do not pass manual auth tokens into service calls.'
);

assertIncludesAll(
    'remembered identifier is preserved',
    `${sources.authStorageCleanup}\n${sources.rememberedIdentifier}`,
    [
        "REMEMBERED_IDENTIFIER_KEY = 'medsync.auth.rememberedIdentifier.v1'",
        'preservedKeys: [REMEMBERED_IDENTIFIER_KEY]',
        'key === REMEMBERED_IDENTIFIER_KEY'
    ],
    'D2 storage cleanup preserves medsync.auth.rememberedIdentifier.v1.'
);

assertIncludesAll(
    'appointment storage is documented non-auth separate storage',
    sources.appointmentStorage,
    [
        "const CONFIG_KEY = 'da_appointment_config'",
        "const APPOINTMENTS_KEY = 'da_appointments'",
        'window.localStorage'
    ],
    'appointment.storage.js uses localStorage for appointment data and remains outside D2 auth scope.'
);

assertIncludesAll(
    'clinical doctor matching depends on runtime id_login or equivalent',
    `${sources.medicalHistory}\n${sources.documentsAndSignatures}\n${sources.treatmentPlan}`,
    [
        'authUser: fnTypes.getUser',
        'id_login',
        'id_user',
        'user_id',
        'doctor.id_login === this.currentUser.id_login',
        'doctor.id_login === currentId'
    ],
    'Static evidence: D2 runtime user is used; MedicalHistory has id_login/id_user/user_id fallback, Documents/Treatment still compare id_login.'
);

addCheck(
    'package.json has no npm test script',
    !hasTestScript,
    hasTestScript ? 'test script exists; run npm run test manually.' : 'No test script exists in package.json.'
);

addCheck(
    'backend not touched by D2-5F QA script scope',
    Object.values(files).every((relativePath) => relativePath.startsWith('src/') || relativePath.startsWith('scripts/qa/') || relativePath === 'package.json'),
    'Checked files are limited to frontend package.json, src, and scripts/qa.'
);

assertNoMatches(
    'D2 regression files do not print secrets',
    allFrontendFiles,
    [
        /console\.(log|info|warn|error)\s*\([^)]*(token|cookie|password|otp|csrf)/i
    ],
    'No console output of token/cookie/password/OTP/CSRF terms found in D2 regression source set.'
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
