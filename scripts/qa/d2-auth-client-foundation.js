#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const files = {
    authConfig: 'src/services/config/authTransport.config.js',
    axiosHelper: 'src/services/config/axios.helper.js',
    coreInstance: 'src/services/config/core.instance.js',
    csrfService: 'src/services/core/auth/DACsrfService.js',
    sessionService: 'src/services/core/auth/DASessionService.js',
    authService: 'src/services/core/auth/DAAuthService.js',
    apiUrl: 'src/services/common/apiurl.js'
};

const qaMetadata = {
    phase: 'D2-5A Frontend D2 Auth Client Foundation',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-auth-client-foundation.js full',
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

const checks = [];

const addCheck = (name, ok, evidence) => {
    checks.push({
        name,
        status: ok ? 'OK' : 'FAIL',
        evidence
    });
}

const includesAll = (source, needles) => needles.every((needle) => source.includes(needle));
const matches = (source, pattern) => pattern.test(source);

const assertIncludesAll = (name, source, needles, evidence) => {
    addCheck(name, includesAll(source, needles), evidence);
}

const assertMatches = (name, source, pattern, evidence) => {
    addCheck(name, matches(source, pattern), evidence);
}

const assertNoMatches = (name, sourceMap, patterns, evidence) => {
    const offenders = [];

    Object.entries(sourceMap).forEach(([fileKey, source]) => {
        patterns.forEach((pattern) => {
            if(pattern.test(source)) {
                offenders.push(`${fileKey}:${pattern}`);
            }
        });
    });

    addCheck(name, offenders.length === 0, offenders.length ? offenders.join(', ') : evidence);
}

const sourceFilesOnly = Object.values(files).every((relativePath) => (
    relativePath.startsWith('src/')
    || relativePath.startsWith('scripts/qa/')
));

assertIncludesAll(
    'legacy defaults remain inactive for D2',
    sources.authConfig,
    [
        'DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY',
        'DEFAULT_BROWSER_AUTH_TRANSPORT = BROWSER_AUTH_TRANSPORTS.AUTHORIZATION',
        'DEFAULT_CSRF_ENABLED = false'
    ],
    'Default client config remains legacy/authorization/CSRF off.'
);

assertIncludesAll(
    'legacy authorization header path is preserved',
    sources.axiosHelper,
    [
        "Vue.prototype.$session.get('token')",
        "'Authorization': token"
    ],
    'Legacy helper still reads the current token header only outside D2.'
);

assertIncludesAll(
    'D2 removes Authorization headers',
    sources.axiosHelper,
    [
        'if(isD2AuthMode())',
        'delete nextHeaders.Authorization',
        'delete nextHeaders.authorization',
        'return {};'
    ],
    'D2 path returns no legacy token config and strips Authorization casing variants.'
);

assertIncludesAll(
    'D2 uses credentialed requests',
    `${sources.axiosHelper}\n${sources.csrfService}\n${sources.sessionService}`,
    [
        'withCredentials: true'
    ],
    'D2 helper, CSRF client, and session client use credentialed requests.'
);

assertMatches(
    'CSRF header is attached only to mutating methods',
    sources.axiosHelper,
    /isCsrfEnabled\(\)\s*&&\s*isMutatingMethod\(method\)/,
    'CSRF header path is gated by POST/PUT/PATCH/DELETE helper.'
);

assertIncludesAll(
    'GET is not a CSRF mutating method',
    sources.axiosHelper,
    [
        "const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];"
    ],
    'GET is absent from MUTATING_METHODS.'
);

assertIncludesAll(
    'CSRF endpoint client exists',
    `${sources.apiUrl}\n${sources.csrfService}`,
    [
        "DAC_AUTH_CSRF          = 'api/auth/csrf'",
        'DAC_AUTH_CSRF',
        'csrfClient.get'
    ],
    'Client can bootstrap CSRF from /api/auth/csrf.'
);

assertIncludesAll(
    'session bootstrap client exists',
    `${sources.apiUrl}\n${sources.sessionService}\n${sources.authService}`,
    [
        "DAC_AUTH_SESSION       = 'api/auth/session'",
        'DAC_AUTH_SESSION',
        'bootstrapSession'
    ],
    'Client can hydrate runtime session from /api/auth/session.'
);

assertIncludesAll(
    'D2 login prepares CSRF and then bootstraps session',
    sources.authService,
    [
        'DACsrfService.ensureCsrfToken()',
        'DASessionService.bootstrapSession()',
        'd2Session'
    ],
    'D2 login integration is prepared without store/router migration.'
);

assertIncludesAll(
    'D2 refresh does not send refresh token body',
    sources.authService,
    [
        'if(isD2AuthMode())',
        'DACore.post(DAC_AUTH_REFRESH_TOKEN, {})'
    ],
    'D2 refresh is prepared for HttpOnly refresh cookie transport.'
);

assertNoMatches(
    'new D2 source does not persist readable auth tokens',
    sources,
    [
        /localStorage\.setItem\s*\(/,
        /sessionStorage\.setItem\s*\(/,
        /\$session\.set\s*\(\s*['"]token['"]/,
        /\$session\.set\s*\(\s*['"]refreshtoken['"]/,
        /\$session\.set\s*\(\s*['"]refresh_token['"]/
    ],
    'No localStorage/sessionStorage/$session token writes found in D2 foundation files.'
);

assertNoMatches(
    'new frontend source does not print secrets',
    sources,
    [
        /console\.(log|info|warn|error)\s*\(/
    ],
    'No console output found in D2 foundation source files.'
);

addCheck(
    'D2-5A file set is frontend only',
    sourceFilesOnly,
    'Checked files are limited to frontend src/services and scripts/qa.'
);

const failed = checks.filter((check) => check.status !== 'OK');
const command = process.argv[2] || 'status';
const allowedCommands = ['status', 'validate', 'full'];

if(!allowedCommands.includes(command)) {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write(`Usage: ${qaMetadata.command}\n`);
    process.exit(2);
}

const result = {
    ...qaMetadata,
    requestedCommand: command,
    summary: failed.length === 0 ? 'OK' : 'FAIL',
    checks
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if(failed.length > 0) {
    process.exit(1);
}
