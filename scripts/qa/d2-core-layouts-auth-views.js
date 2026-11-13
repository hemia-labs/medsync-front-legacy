#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const files = {
    authConfig: 'src/services/config/authTransport.config.js',
    adminLayout: 'src/core/layouts/admin.vue',
    loginView: 'src/views/Auth/Login.vue',
    homeView: 'src/views/Home/Home.vue',
    tenantRestrictedView: 'src/views/error/TenantRestricted.vue'
};

const qaMetadata = {
    phase: 'D2-5E1 Frontend Core Layouts / Auth Views Migration',
    repo: 'hemia-assistance-front-legacy',
    command: 'node scripts/qa/d2-core-layouts-auth-views.js full',
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
const getD2GuardBlockWithSpace = (source, marker) => {
    const block = getBlock(source, marker);
    return getBlock(block, 'if (isD2AuthMode())') || getBlock(block, 'if(isD2AuthMode())');
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

const adminSessionUserD2 = getD2GuardBlock(sources.adminLayout, 'sessionUser: function()');
const adminBusinessD2 = getD2GuardBlock(sources.adminLayout, 'businessName: function()');
const adminTenantD2 = getD2GuardBlock(sources.adminLayout, 'isTenantRestrictedMode: function()');
const adminUnauthorizedWatcher = getBlock(sources.adminLayout, 'unauthorized: async function()');
const adminUnauthorizedD2 = getBlock(adminUnauthorizedWatcher, 'if(isD2AuthMode())');
const loginPostRouteD2 = getD2GuardBlockWithSpace(sources.loginView, 'getPostLoginRoute: function()');
const homeSessionUserD2 = getD2GuardBlock(sources.homeView, 'sessionUser: function()');
const tenantOperationalD2 = getD2GuardBlock(sources.tenantRestrictedView, 'tenantOperational()');
const tenantBusinessSource = getBlock(sources.tenantRestrictedView, 'businessName()');
const tenantRefreshSource = getBlock(sources.tenantRestrictedView, 'refreshStatus: async function()');
const clinicalViewSources = readTreeSources('src/views/Patient/Sections');

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
    'admin.vue D2 branch does not read session token',
    { adminSessionUserD2 },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /decode\s*\(/,
        /atob\s*\(/
    ],
    'D2 admin session user comes from Vuex runtime user.'
);

assertNoMatches(
    'admin.vue D2 branch does not read session refresh token',
    { adminUnauthorizedD2 },
    [
        /this\.refreshtoken/
    ],
    'D2 admin unauthorized watcher returns before refresh token UX.'
);

assertIncludesAll(
    'admin.vue D2 branch uses runtime store/getters',
    `${sources.adminLayout}\n${adminSessionUserD2}\n${adminBusinessD2}\n${adminTenantD2}`,
    [
        'business: fnTypes.getBusiness',
        'role: fnTypes.getRole',
        'tenantOperational: fnTypes.getTenantOperational',
        'return this.user || null',
        'const business = this.business || {}',
        '? this.tenantOperational'
    ],
    'D2 admin layout uses runtime user/business/role/tenantOperational getters.'
);


assertNoMatches(
    'Login.vue D2 branch does not depend on session token',
    { loginPostRouteD2 },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /atob\s*\(/,
        /JSON\.parse\s*\(/
    ],
    'D2 login post-route uses runtime role and tenantOperational.'
);

assertNoMatches(
    'Home.vue D2 branch does not decode JWT',
    { homeSessionUserD2 },
    [
        /\$session\.get\s*\(\s*['"]token['"]/,
        /decode\s*\(/,
        /atob\s*\(/
    ],
    'D2 home session user comes from Vuex runtime user.'
);

assertIncludesAll(
    'TenantRestricted.vue D2 uses runtime tenantOperational/business',
    `${sources.tenantRestrictedView}\n${tenantOperationalD2}\n${tenantBusinessSource}`,
    [
        'runtimeTenantOperational: fnTypes.getTenantOperational',
        'runtimeBusiness: fnTypes.getBusiness',
        'return this.refreshedTenantOperational || this.runtimeTenantOperational || null',
        'isD2AuthMode() ? this.runtimeBusiness'
    ],
    'D2 tenant restricted view uses runtime tenant and business getters.'
);

assertNoMatches(
    'TenantRestricted.vue D2 does not write tenantOperational to vue-session',
    { tenantRefreshSource },
    [
        /if\(isD2AuthMode\(\)\)[\s\S]*?\$session\.set\s*\(\s*['"]tenantOperational['"]/
    ],
    'Tenant status write to vue-session is guarded to legacy mode.'
);

assertNoMatches(
    'no new token or refresh token writes',
    {
        adminLayout: sources.adminLayout,
        loginView: sources.loginView,
        homeView: sources.homeView,
        tenantRestrictedView: sources.tenantRestrictedView
    },
    [
        /\$session\.set\s*\(\s*['"]token['"]/,
        /\$session\.set\s*\(\s*['"]refreshtoken['"]/,
        /\$session\.set\s*\(\s*['"]refresh_token['"]/,
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /localStorage\.setItem\s*\(\s*['"]refreshtoken['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]refreshtoken['"]/
    ],
    'D2-5E1 files add no token/refreshtoken writes.'
);

assertNoMatches(
    'backend not touched by D2-5E1 QA scope',
    { fileSet: Object.values(files).join('\n') },
    [
        /hemia-assistance-back-legacy/,
        /^src\/Dao\//m,
        /^src\/routes\//m,
        /^src\/controller\//m
    ],
    'Checked files are limited to frontend src and scripts/qa.'
);

assertNoMatches(
    'clinical views add no token writes after D2-5E2',
    { clinicalViewSources },
    [
        /\$session\.set\s*\(\s*['"]token['"]/,
        /\$session\.set\s*\(\s*['"]refreshtoken['"]/,
        /localStorage\.setItem\s*\(\s*['"]token['"]/,
        /sessionStorage\.setItem\s*\(\s*['"]token['"]/
    ],
    'Clinical patient views do not add token/refreshtoken writes.'
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
