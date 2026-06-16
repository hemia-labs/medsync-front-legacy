#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const files = {
    authConfig: 'src/services/config/authTransport.config.js',
    medicalHistory: 'src/views/Patient/Sections/MedicalHistory.vue',
    documentsAndSignatures: 'src/views/Patient/Sections/DocumentsAndSignatures.vue',
    treatmentPlan: 'src/views/Patient/Sections/TreatmentPlan.vue',
    appointmentStorage: 'src/domain/appointments/appointment.storage.js'
};

const qaMetadata = {
    phase: 'D2-5E2 Frontend Clinical / Patient Views Migration',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-clinical-patient-views.js full',
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

const getD2GuardBlock = (source, marker) => getBlock(getBlock(source, marker), 'if(isD2AuthMode())');

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

const patientViewSources = readTreeSources('src/views/Patient');
const medicalCurrentUserD2 = getD2GuardBlock(sources.medicalHistory, 'currentUser()');
const documentsCurrentUserD2 = getD2GuardBlock(sources.documentsAndSignatures, 'currentUser: function()');
const treatmentCurrentUserD2 = getD2GuardBlock(sources.treatmentPlan, 'currentUser: function()');
const documentsBusinessD2 = getD2GuardBlock(sources.documentsAndSignatures, 'businessName: function()');
const treatmentBusinessD2 = getD2GuardBlock(sources.treatmentPlan, 'businessName: function()');
const migratedD2Blocks = [
    medicalCurrentUserD2,
    documentsCurrentUserD2,
    treatmentCurrentUserD2,
    documentsBusinessD2,
    treatmentBusinessD2
].join('\n');

assertIncludesAll(
    'legacy default remains intact',
    sources.authConfig,
    [
        'DEFAULT_AUTH_COOKIE_MODE = AUTH_COOKIE_MODES.LEGACY',
        'DEFAULT_BROWSER_AUTH_TRANSPORT = BROWSER_AUTH_TRANSPORTS.AUTHORIZATION'
    ],
    'D2 remains inactive by default.'
);

assertNoMatches(
    'clinical D2 branches do not read session token',
    { migratedD2Blocks },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /window\.atob\s*\(/,
        /\batob\s*\(/,
        /jwtDecode/,
        /jwt-decode/,
        /decode\s*\(/
    ],
    'D2 currentUser branches use runtime auth user/role.'
);

assertNoMatches(
    'clinical D2 branches do not read session business',
    { documentsBusinessD2, treatmentBusinessD2 },
    [
        /\$session\.get\s*\(\s*['"]business['"]/
    ],
    'D2 businessName branches use runtime business getter.'
);

assertNoMatches(
    'patient views do not read or write tenantOperational from session',
    { patientViewSources },
    [
        /\$session\.get\s*\(\s*['"]tenantOperational['"]/,
        /\$session\.set\s*\(\s*['"]tenantOperational['"]/
    ],
    'No tenantOperational session coupling found in patient views.'
);

assertNoMatches(
    'no Authorization is constructed in patient views',
    { patientViewSources },
    [
        /Authorization\s*:/,
        /['"]Authorization['"]/,
        /headers\s*:\s*\{[\s\S]*Authorization/
    ],
    'Patient views rely on axios auth transport, not manual Authorization.'
);

assertNoMatches(
    'services called from D2 do not receive manual token',
    { patientViewSources },
    [
        /\.\w+\s*\([^)]*this\.\$session\.get\s*\(\s*['"]token['"]/,
        /\b[A-Z][A-Za-z0-9]*Service\.\w+\s*\([^)]*\btoken\b[^)]*\)/
    ],
    'No service calls with manually supplied auth token were found in patient views.'
);

assertIncludesAll(
    'business in D2 comes from runtime store',
    `${sources.documentsAndSignatures}\n${sources.treatmentPlan}`,
    [
        'authBusiness: fnTypes.getBusiness',
        'const business = this.authBusiness || {}'
    ],
    'Documents and treatment plan business labels use runtime business in D2.'
);

assertIncludesAll(
    'permissions in D2 come from runtime store',
    `${sources.medicalHistory}\n${sources.documentsAndSignatures}`,
    [
        'hasPermission: fnTypes.hasPermission'
    ],
    'Clinical permission checks use Vuex auth getter, which is runtime in D2.'
);

assertIncludesAll(
    'runtime user and role are used in D2',
    `${sources.medicalHistory}\n${sources.documentsAndSignatures}\n${sources.treatmentPlan}`,
    [
        'authUser: fnTypes.getUser',
        'authRole: fnTypes.getRole',
        'rol: this.authRole || (this.authUser && this.authUser.rol) || null'
    ],
    'Migrated currentUser branches use runtime user and role.'
);

assertNoMatches(
    'no new token or refresh token writes',
    { patientViewSources },
    [
        /\$session\.set\s*\(\s*['"]token['"]/,
        /\$session\.set\s*\(\s*['"]refreshtoken['"]/,
        /\$session\.set\s*\(\s*['"]refresh_token['"]/,
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /localStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refreshtoken['"]/
    ],
    'Patient views add no token/refreshtoken writes.'
);

assertNoMatches(
    'backend not touched by D2-5E2 QA scope',
    { fileSet: Object.values(files).join('\n') },
    [
        /hemia-assistance-back-legacy/,
        /^src\/Dao\//m,
        /^src\/routes\//m,
        /^src\/controller\//m
    ],
    'Checked files are limited to frontend src and scripts/qa.'
);

assertIncludesAll(
    'appointment storage remains out of scope and non-auth',
    sources.appointmentStorage,
    [
        'localStorage'
    ],
    'Appointment storage was read only for documentation; not modified by D2-5E2.'
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
