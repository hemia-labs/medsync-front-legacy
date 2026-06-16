/* eslint-disable no-console */
const path = require('path');
const { chromium } = require('@playwright/test');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..');
const BACKEND_ENV = path.join(WORKSPACE_ROOT, 'hemia-assistance-back-legacy', 'src', 'config', 'env');

if (!process.env.QA_AUTH_PASSWORD) {
  try {
    require(BACKEND_ENV);
  } catch (_) {
    // The explicit env var is still validated below.
  }
}

const FRONTEND_URL = (process.env.D2_BROWSER_FRONTEND_URL || 'http://127.0.0.1:8098').replace(/\/+$/, '');
const API_URL = (process.env.D2_BROWSER_API_URL || process.env.VUE_APP_CORE_URL_API || 'http://127.0.0.1:3018').replace(/\/+$/, '');
const QA_PASSWORD = process.env.QA_AUTH_PASSWORD;
const ACCESS_COOKIE_NAME = process.env.D2_BROWSER_AUTH_ACCESS_COOKIE_NAME || process.env.AUTH_COOKIE_ACCESS_NAME || 'medsync_at_dev';
const REFRESH_COOKIE_NAME = process.env.D2_BROWSER_AUTH_REFRESH_COOKIE_NAME || process.env.AUTH_COOKIE_REFRESH_NAME || 'medsync_rt_dev';
const CSRF_COOKIE_NAME = process.env.D2_BROWSER_CSRF_COOKIE_NAME || process.env.AUTH_CSRF_COOKIE_NAME || process.env.CSRF_COOKIE_NAME || 'medsync_csrf_dev';
const EXPECT_SECURE_COOKIES = String(process.env.D2_BROWSER_EXPECT_SECURE_COOKIE || API_URL.startsWith('https:')).toLowerCase() === 'true';

const USERS = Object.freeze({
  doctor: { phone: '9994000002', id: 'QA_D2_BROWSER_DOCTOR_USER' },
  assistant: { phone: '9994000003', id: 'QA_D2_BROWSER_ASSISTANT_USER' },
  restricted: { phone: '9994000091', id: 'QA_D2_BROWSER_RESTRICTED_ADMIN_USER' },
  inactive: { phone: '9994000092', id: 'QA_D2_BROWSER_INACTIVE_USER' },
  superAdmin: { phone: '9994000099', id: 'QA_D2_BROWSER_SUPER_ADMIN_USER' }
});

const FORBIDDEN_RESPONSE_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'refreshtoken',
  'id_refresh_token',
  'authorization'
]);
const FORBIDDEN_STORAGE_PATTERNS = [
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /refreshtoken/i,
  /\bjwt\b/i,
  /authorization/i,
  /permissions/i,
  /business/i,
  /tenantoperational/i
];
const ALLOWED_STORAGE_KEYS = new Set(['medsync.auth.rememberedIdentifier.v1']);

function normalizeApiPath(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search || ''}`;
  } catch (_) {
    return url;
  }
}

function hasForbiddenResponseKey(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasForbiddenResponseKey);
  }

  return Object.keys(value).some((key) => {
    if (FORBIDDEN_RESPONSE_KEYS.has(String(key).toLowerCase())) {
      return true;
    }

    return hasForbiddenResponseKey(value[key]);
  });
}

function safeJsonParse(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch (_) {
    return null;
  }
}

function getBodySummary(postData) {
  const parsed = safeJsonParse(postData || '');
  const keys = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? Object.keys(parsed).sort()
    : [];

  return {
    bodyKeys: keys,
    hasPasswordField: keys.includes('pwd') || keys.includes('password'),
    hasRefreshTokenField: keys.some((key) => /refresh/i.test(key) || key === 'id_refresh_token')
  };
}

function cookieSummary(cookie, baseline = null) {
  return {
    name: cookie.name,
    exists: true,
    httpOnly: Boolean(cookie.httpOnly),
    sameSite: cookie.sameSite || null,
    path: cookie.path || null,
    secure: Boolean(cookie.secure),
    domain: cookie.domain || null,
    valueChanged: baseline ? baseline.value !== cookie.value : null
  };
}

function findCookie(cookies, name) {
  return cookies.find((cookie) => cookie.name === name) || null;
}

function tokenlessSummary(json) {
  return {
    bodyKeys: json && typeof json === 'object' && !Array.isArray(json) ? Object.keys(json).sort() : [],
    tokenless: !hasForbiddenResponseKey(json)
  };
}

function createEvidence() {
  const checks = [];
  const bugs = [];
  const apiRequests = [];
  const apiResponses = [];
  const pending = [];

  function check(name, ok, evidence, mandatory = true) {
    checks.push({ name, ok: Boolean(ok), mandatory, evidence });
    if (mandatory && !ok) {
      bugs.push({ name, evidence });
    }
  }

  function attachNetwork(page, label) {
    page.on('request', (request) => {
      const url = request.url();

      if (!url.startsWith(API_URL)) {
        return;
      }

      const headers = request.headers();
      apiRequests.push({
        label,
        method: request.method(),
        path: normalizeApiPath(url),
        hasAuthorization: Boolean(headers.authorization),
        hasCsrfHeader: Boolean(headers['x-csrf-token']),
        ...getBodySummary(request.postData())
      });
    });

    page.on('response', (response) => {
      const url = response.url();

      if (!url.startsWith(API_URL)) {
        return;
      }

      const task = (async () => {
        const text = await response.text().catch(() => '');
        const json = safeJsonParse(text);
        apiResponses.push({
          label,
          method: response.request().method(),
          path: normalizeApiPath(url),
          status: response.status(),
          ...tokenlessSummary(json)
        });
      })();

      pending.push(task);
    });
  }

  async function flushNetwork() {
    await Promise.allSettled(pending.splice(0, pending.length));
  }

  return {
    checks,
    bugs,
    apiRequests,
    apiResponses,
    check,
    attachNetwork,
    flushNetwork
  };
}

async function waitForSessionCall(page) {
  return page.waitForResponse(
    (response) => response.url().startsWith(API_URL)
      && response.url().includes('/api/auth/session')
      && response.request().method() === 'GET',
    { timeout: 20000 }
  ).catch(() => null);
}

async function loginViaUi(page, phone) {
  await page.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(phone);
  await page.locator('input[autocomplete="current-password"]').fill(QA_PASSWORD);

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().startsWith(API_URL)
      && response.url().includes('/api/auth/login')
      && response.request().method() === 'POST',
    { timeout: 30000 }
  );
  const sessionResponsePromise = waitForSessionCall(page);

  await page.locator('button.auth-submit').click();
  const loginResponse = await loginResponsePromise;
  const sessionResponse = await sessionResponsePromise;
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  return {
    loginStatus: loginResponse.status(),
    sessionStatus: sessionResponse ? sessionResponse.status() : null,
    finalUrl: page.url()
  };
}

async function fetchWithCsrf(page, method, pathName, body = {}) {
  return page.evaluate(async ({ apiUrl, methodName, targetPath, payload }) => {
    const tokenless = (value) => {
      const forbidden = ['token', 'access_token', 'refresh_token', 'refreshtoken', 'id_refresh_token', 'authorization'];
      const scan = (node) => {
        if (!node || typeof node !== 'object') return false;
        if (Array.isArray(node)) return node.some(scan);
        return Object.keys(node).some((key) => forbidden.includes(String(key).toLowerCase()) || scan(node[key]));
      };
      return !scan(value);
    };
    const parse = async (response) => {
      const text = await response.text();
      try { return text ? JSON.parse(text) : null; } catch (_) { return null; }
    };
    const csrfResponse = await fetch(`${apiUrl}/api/auth/csrf`, { credentials: 'include' });
    const csrfJson = await parse(csrfResponse);
    const csrfToken = csrfJson && (csrfJson.csrfToken || csrfJson.data && csrfJson.data.csrfToken);
    const response = await fetch(`${apiUrl}${targetPath}`, {
      method: methodName,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || ''
      },
      body: JSON.stringify(payload)
    });
    const json = await parse(response);
    return {
      csrfStatus: csrfResponse.status,
      csrfTokenPresent: Boolean(csrfToken),
      status: response.status,
      bodyKeys: json && typeof json === 'object' && !Array.isArray(json) ? Object.keys(json).sort() : [],
      tokenless: tokenless(json)
    };
  }, { apiUrl: API_URL, methodName: method, targetPath: pathName, payload: body });
}

async function fetchWithoutCsrf(page, method, pathName) {
  return page.evaluate(async ({ apiUrl, methodName, targetPath }) => {
    const response = await fetch(`${apiUrl}${targetPath}`, {
      method: methodName,
      credentials: 'include'
    });
    return { status: response.status };
  }, { apiUrl: API_URL, methodName: method, targetPath: pathName });
}

async function loginViaBrowserFetch(page, phone) {
  return page.evaluate(async ({ apiUrl, loginPhone, password }) => {
    const parse = async (response) => {
      const text = await response.text();
      try { return text ? JSON.parse(text) : null; } catch (_) { return null; }
    };
    const csrfResponse = await fetch(`${apiUrl}/api/auth/csrf`, { credentials: 'include' });
    const csrfJson = await parse(csrfResponse);
    const csrfToken = csrfJson && (csrfJson.csrfToken || csrfJson.data && csrfJson.data.csrfToken);
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || ''
      },
      body: JSON.stringify({ param: loginPhone, pwd: password })
    });
    const json = await parse(response);
    return {
      csrfStatus: csrfResponse.status,
      csrfTokenPresent: Boolean(csrfToken),
      status: response.status,
      bodyKeys: json && typeof json === 'object' && !Array.isArray(json) ? Object.keys(json).sort() : []
    };
  }, { apiUrl: API_URL, loginPhone: phone, password: QA_PASSWORD });
}

async function inspectStorage(page) {
  return page.evaluate(({ forbiddenSources, allowedKeys }) => {
    const forbidden = forbiddenSources.map((source) => new RegExp(source, 'i'));
    const allowed = new Set(allowedKeys);
    const scan = (storage) => {
      const keys = [];
      const forbiddenMatches = [];

      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        const value = storage.getItem(key) || '';
        keys.push(key);

        if (allowed.has(key)) {
          continue;
        }

        const hasForbidden = forbidden.some((pattern) => pattern.test(key) || pattern.test(value));
        if (hasForbidden) {
          forbiddenMatches.push(key);
        }
      }

      return { keys: keys.sort(), forbiddenMatches: forbiddenMatches.sort() };
    };

    return {
      localStorage: scan(window.localStorage),
      sessionStorage: scan(window.sessionStorage)
    };
  }, {
    forbiddenSources: FORBIDDEN_STORAGE_PATTERNS.map((pattern) => pattern.source),
    allowedKeys: Array.from(ALLOWED_STORAGE_KEYS)
  });
}

async function inspectDocumentCookie(page) {
  return page.evaluate((cookieNames) => {
    const names = document.cookie
      .split(';')
      .map((part) => part.trim().split('=')[0])
      .filter(Boolean)
      .sort();

    return {
      names,
      hasAccessCookie: names.includes(cookieNames.access),
      hasRefreshCookie: names.includes(cookieNames.refresh),
      hasCsrfCookie: names.includes(cookieNames.csrf)
    };
  }, {
    access: ACCESS_COOKIE_NAME,
    refresh: REFRESH_COOKIE_NAME,
    csrf: CSRF_COOKIE_NAME
  });
}

async function tryLogoutViaUi(page) {
  await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  const logoutButton = page.locator('button.session-action', { hasText: 'Salir' }).first();

  if (await logoutButton.count() === 0) {
    return { attempted: false, status: null, method: 'not-found' };
  }

  const closeResponsePromise = page.waitForResponse(
    (response) => response.url().startsWith(API_URL)
      && response.url().includes('/api/auth/close')
      && response.request().method() === 'PUT',
    { timeout: 20000 }
  ).catch(() => null);

  await logoutButton.click();
  const closeResponse = await closeResponsePromise;
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  return {
    attempted: true,
    status: closeResponse ? closeResponse.status() : null,
    method: 'ui'
  };
}

async function main() {
  if (!QA_PASSWORD) {
    throw new Error('QA_AUTH_PASSWORD is required but was not found.');
  }

  const evidence = createEvidence();
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false'
  });

  try {
    const context = await browser.newContext({
      baseURL: FRONTEND_URL,
      ignoreHTTPSErrors: true,
      viewport: { width: 1366, height: 900 }
    });
    const page = await context.newPage();
    evidence.attachNetwork(page, 'doctor-ui');

    const login = await loginViaUi(page, USERS.doctor.phone);
    await evidence.flushNetwork();
    const loginResponse = evidence.apiResponses.find((response) => response.path === '/api/auth/login' && response.method === 'POST');
    const sessionAfterLogin = evidence.apiResponses.find((response) => response.path === '/api/auth/session' && response.method === 'GET');

    evidence.check('doctor login via UI succeeds', login.loginStatus === 200, {
      loginStatus: login.loginStatus,
      sessionStatus: login.sessionStatus,
      finalPath: normalizeApiPath(login.finalUrl)
    });
    evidence.check('login response is tokenless', Boolean(loginResponse && loginResponse.tokenless), {
      status: loginResponse ? loginResponse.status : null,
      bodyKeys: loginResponse ? loginResponse.bodyKeys : []
    });
    evidence.check('/api/auth/session called after login', Boolean(sessionAfterLogin && sessionAfterLogin.status === 200), {
      status: sessionAfterLogin ? sessionAfterLogin.status : null
    });

    const cookiesAfterLogin = await context.cookies(API_URL);
    const accessCookie = findCookie(cookiesAfterLogin, ACCESS_COOKIE_NAME);
    const refreshCookie = findCookie(cookiesAfterLogin, REFRESH_COOKIE_NAME);
    const csrfCookie = findCookie(cookiesAfterLogin, CSRF_COOKIE_NAME);
    evidence.check('auth cookies have expected browser flags', Boolean(
      accessCookie && accessCookie.httpOnly && accessCookie.sameSite === 'Lax' && accessCookie.path === '/' && accessCookie.secure === EXPECT_SECURE_COOKIES
      && refreshCookie && refreshCookie.httpOnly && refreshCookie.sameSite === 'Lax' && refreshCookie.path === '/' && refreshCookie.secure === EXPECT_SECURE_COOKIES
      && csrfCookie && !csrfCookie.httpOnly && csrfCookie.sameSite === 'Lax' && csrfCookie.path === '/' && csrfCookie.secure === EXPECT_SECURE_COOKIES
    ), {
      expectedSecure: EXPECT_SECURE_COOKIES,
      cookies: [accessCookie, refreshCookie, csrfCookie].filter(Boolean).map((cookie) => cookieSummary(cookie))
    });

    const documentCookie = await inspectDocumentCookie(page);
    evidence.check('document.cookie hides access and refresh cookies', !documentCookie.hasAccessCookie && !documentCookie.hasRefreshCookie, documentCookie);

    const storage = await inspectStorage(page);
    evidence.check('storage has no persisted auth secrets or context', storage.localStorage.forbiddenMatches.length === 0 && storage.sessionStorage.forbiddenMatches.length === 0, storage);

    const reloadSessionWait = waitForSessionCall(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadSessionResponse = await reloadSessionWait;
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
    evidence.check('reload rehydrates session', Boolean(reloadSessionResponse && reloadSessionResponse.status() === 200), {
      status: reloadSessionResponse ? reloadSessionResponse.status() : null,
      finalPath: normalizeApiPath(page.url())
    });

    const newPage = await context.newPage();
    evidence.attachNetwork(newPage, 'new-tab');
    const newTabSessionWait = waitForSessionCall(newPage);
    await newPage.goto(`${FRONTEND_URL}/`, { waitUntil: 'domcontentloaded' });
    const newTabSessionResponse = await newTabSessionWait;
    await newPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
    evidence.check('new tab rehydrates session with shared cookies', Boolean(newTabSessionResponse && newTabSessionResponse.status() === 200), {
      status: newTabSessionResponse ? newTabSessionResponse.status() : null,
      finalPath: normalizeApiPath(newPage.url())
    });
    await newPage.close();

    const cookiesBeforeRefresh = await context.cookies(API_URL);
    const refreshBefore = {
      access: findCookie(cookiesBeforeRefresh, ACCESS_COOKIE_NAME),
      refresh: findCookie(cookiesBeforeRefresh, REFRESH_COOKIE_NAME)
    };
    const refreshResult = await fetchWithCsrf(page, 'POST', '/api/auth/refreshToken', {});
    await evidence.flushNetwork();
    const cookiesAfterRefresh = await context.cookies(API_URL);
    const refreshAfter = {
      access: findCookie(cookiesAfterRefresh, ACCESS_COOKIE_NAME),
      refresh: findCookie(cookiesAfterRefresh, REFRESH_COOKIE_NAME)
    };
    const refreshRequest = evidence.apiRequests.find((request) => request.path === '/api/auth/refreshToken' && request.method === 'POST');
    evidence.check('refresh cookie-only succeeds with empty body', refreshResult.status === 200 && refreshResult.tokenless && refreshRequest && refreshRequest.bodyKeys.length === 0 && !refreshRequest.hasRefreshTokenField, {
      status: refreshResult.status,
      csrfStatus: refreshResult.csrfStatus,
      csrfTokenPresent: refreshResult.csrfTokenPresent,
      responseBodyKeys: refreshResult.bodyKeys,
      requestBodyKeys: refreshRequest ? refreshRequest.bodyKeys : [],
      hasRefreshTokenField: refreshRequest ? refreshRequest.hasRefreshTokenField : null
    });
    evidence.check('refresh rotates auth cookies', Boolean(
      refreshBefore.access && refreshAfter.access && refreshBefore.access.value !== refreshAfter.access.value
      && refreshBefore.refresh && refreshAfter.refresh && refreshBefore.refresh.value !== refreshAfter.refresh.value
    ), {
      cookies: [refreshAfter.access, refreshAfter.refresh].filter(Boolean).map((cookie) => cookieSummary(cookie, refreshBefore[cookie.name === ACCESS_COOKIE_NAME ? 'access' : 'refresh']))
    });

    const clinicalStartIndex = evidence.apiResponses.length;
    await page.goto(`${FRONTEND_URL}/px/history/QA_D2_BROWSER_PATIENT`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => null);
    await evidence.flushNetwork();
    const clinicalResponses = evidence.apiResponses.slice(clinicalStartIndex);
    const clinicalApiErrors = clinicalResponses.filter((response) => response.status >= 400);
    evidence.check('clinical patient route loads without auth redirect', !page.url().includes('/auth/login'), {
      finalPath: normalizeApiPath(page.url()),
      apiErrorCount: clinicalApiErrors.length,
      apiErrors: clinicalApiErrors.slice(0, 5).map((response) => ({ path: response.path, status: response.status }))
    }, false);

    const logoutResult = await tryLogoutViaUi(page);
    let logoutMethod = logoutResult.method;
    let logoutStatus = logoutResult.status;

    if (logoutStatus !== 200) {
      const fallback = await fetchWithCsrf(page, 'PUT', '/api/auth/close', {});
      logoutMethod = 'browser-fetch-fallback';
      logoutStatus = fallback.status;
    }

    await evidence.flushNetwork();
    const cookiesAfterLogout = await context.cookies(API_URL);
    evidence.check('logout clears auth cookies and redirects/cleans runtime', logoutStatus === 200
      && !findCookie(cookiesAfterLogout, ACCESS_COOKIE_NAME)
      && !findCookie(cookiesAfterLogout, REFRESH_COOKIE_NAME), {
      method: logoutMethod,
      status: logoutStatus,
      remainingCookieNames: cookiesAfterLogout.map((cookie) => cookie.name).sort(),
      finalPath: normalizeApiPath(page.url())
    });

    await context.close();

    const assistantContext = await browser.newContext({ baseURL: FRONTEND_URL, ignoreHTTPSErrors: true });
    const assistantPage = await assistantContext.newPage();
    evidence.attachNetwork(assistantPage, 'assistant');
    await assistantPage.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    const assistantLogin = await loginViaBrowserFetch(assistantPage, USERS.assistant.phone);
    evidence.check('assistant login for super admin close setup succeeds', assistantLogin.status === 200, {
      status: assistantLogin.status,
      csrfStatus: assistantLogin.csrfStatus
    });

    const superContext = await browser.newContext({ baseURL: FRONTEND_URL, ignoreHTTPSErrors: true });
    const superPage = await superContext.newPage();
    evidence.attachNetwork(superPage, 'super-admin');
    await superPage.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    const superLogin = await loginViaBrowserFetch(superPage, USERS.superAdmin.phone);
    const closeUserSessions = await fetchWithCsrf(superPage, 'PATCH', `/api/super-admin/users/${USERS.assistant.id}/close-sessions`, {});
    const assistantSessionAfterClose = await fetchWithoutCsrf(assistantPage, 'GET', '/api/auth/session');
    const assistantProtectedAfterClose = await fetchWithoutCsrf(assistantPage, 'GET', '/api/super-admin/sessions');
    await assistantPage.goto(`${FRONTEND_URL}/`, { waitUntil: 'domcontentloaded' });
    await assistantPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
    evidence.check('super admin closes assistant sessions and old assistant access gets 401', superLogin.status === 200
      && closeUserSessions.status === 200
      && assistantSessionAfterClose.status === 401, {
      superLoginStatus: superLogin.status,
      closeUserSessionsStatus: closeUserSessions.status,
      assistantSessionStatus: assistantSessionAfterClose.status,
      assistantProtectedStatus: assistantProtectedAfterClose.status,
      assistantFinalPath: normalizeApiPath(assistantPage.url())
    });
    await assistantContext.close();
    await superContext.close();

    const tenantContext = await browser.newContext({ baseURL: FRONTEND_URL, ignoreHTTPSErrors: true });
    const tenantPage = await tenantContext.newPage();
    evidence.attachNetwork(tenantPage, 'tenant-user-state');
    await tenantPage.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    const restrictedLogin = await loginViaBrowserFetch(tenantPage, USERS.restricted.phone);
    const restrictedCookies = await tenantContext.cookies(API_URL);
    const inactiveLogin = await loginViaBrowserFetch(tenantPage, USERS.inactive.phone);
    const inactiveCookies = await tenantContext.cookies(API_URL);
    evidence.check('tenant restricted and inactive users do not get usable auth cookies', restrictedLogin.status === 404
      && inactiveLogin.status === 404
      && !findCookie(restrictedCookies, ACCESS_COOKIE_NAME)
      && !findCookie(restrictedCookies, REFRESH_COOKIE_NAME)
      && !findCookie(inactiveCookies, ACCESS_COOKIE_NAME)
      && !findCookie(inactiveCookies, REFRESH_COOKIE_NAME), {
      restrictedStatus: restrictedLogin.status,
      inactiveStatus: inactiveLogin.status,
      behavior: 'hard-block without auth cookies'
    });
    await tenantContext.close();

    await evidence.flushNetwork();

    const authorizationRequests = evidence.apiRequests.filter((request) => request.hasAuthorization);
    const mutatingWithoutCsrf = evidence.apiRequests.filter((request) => (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
      && request.path !== '/api/auth/csrf'
      && !request.hasCsrfHeader
    ));
    evidence.check('network sends no Authorization header for browser D2 auth', authorizationRequests.length === 0, {
      authorizationRequestCount: authorizationRequests.length
    });
    evidence.check('mutating browser requests include CSRF header', mutatingWithoutCsrf.length === 0, {
      mutatingWithoutCsrfCount: mutatingWithoutCsrf.length,
      samples: mutatingWithoutCsrf.slice(0, 5).map((request) => ({ method: request.method, path: request.path }))
    });

    const safeOutput = !JSON.stringify({
      checks: evidence.checks,
      requestPaths: evidence.apiRequests.map((request) => request.path)
    }).toLowerCase().includes(QA_PASSWORD.toLowerCase());
    evidence.check('safe output excludes QA password', safeOutput, { passwordPrinted: false });

    const summary = evidence.checks.every((item) => item.ok || !item.mandatory) ? 'OK' : 'FAIL';
    const result = {
      phase: 'D2-7C Browser Real Security Evidence with Playwright',
      repo: 'hemia-assistance-front-legacy',
      browser: 'Playwright Chromium',
      frontend: FRONTEND_URL,
      api: API_URL,
      cookieNames: {
        access: ACCESS_COOKIE_NAME,
        refresh: REFRESH_COOKIE_NAME,
        csrf: CSRF_COOKIE_NAME
      },
      credentials: 'QA_AUTH_PASSWORD used from local env/config, value not printed',
      summary,
      checks: evidence.checks,
      networkSummary: {
        apiRequestCount: evidence.apiRequests.length,
        apiResponseCount: evidence.apiResponses.length,
        authorizationRequestCount: authorizationRequests.length,
        mutatingWithoutCsrfCount: mutatingWithoutCsrf.length,
        requestSamples: evidence.apiRequests.slice(0, 20).map((request) => ({
          label: request.label,
          method: request.method,
          path: request.path,
          hasCsrfHeader: request.hasCsrfHeader,
          hasAuthorization: request.hasAuthorization,
          bodyKeys: request.bodyKeys,
          hasPasswordField: request.hasPasswordField,
          hasRefreshTokenField: request.hasRefreshTokenField
        }))
      },
      bugs: evidence.bugs,
      resetPasswordInvalidation: 'pending human/SMTP/OTP; not executed in this browser QA',
      safeOutput: {
        passwordsPrinted: false,
        otpPrinted: false,
        accessTokensPrinted: false,
        refreshTokensPrinted: false,
        cookieValuesPrinted: false,
        csrfValuesPrinted: false
      }
    };

    console.log(JSON.stringify(result, null, 2));

    if (summary !== 'OK') {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
