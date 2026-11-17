const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const VueRouter = require('vue-router');
const routes = vm.runInNewContext(fs.readFileSync('src/router/routes/auth.js', 'utf8').replace('export default', ''));
const router = new VueRouter({ mode: 'abstract', routes });
for (const [path, name] of [['/login', 'login'], ['/register', 'register'], ['/forgot-password', 'forgotPassword']]) {
  const route = router.match(path);
  assert.equal(route.name, name);
  assert.equal(route.meta.requireAuth, false);
  assert.equal(router.match({ name }).path, path);
}
for (const [oldPath, path] of [['/auth', '/login'], ['/auth/login', '/login'], ['/auth/registro', '/register']]) {
  const route = router.match(`${oldPath}?from=qa#form`);
  assert.equal(route.path, path);
  assert.equal(route.query.from, 'qa');
  assert.equal(route.hash, '#form');
}
const source = fs.readFileSync('src/utils/d2AuthCleanup.js', 'utf8')
  .replace(/^import .*;$/gm, '').replace(/export default \{[\s\S]*?\};/, '').replace(/export /g, '');
const helperContext = {
  legalRoutes: vm.runInNewContext(fs.readFileSync('src/router/routes/legal.js', 'utf8').replace('export default', '')),
  signatureRoutes: vm.runInNewContext(fs.readFileSync('src/router/routes/public-signature.js', 'utf8').replace('export default', '')),
  process: { env: {} }
};
vm.runInNewContext(fs.readFileSync('src/utils/publicAuthRoute.js', 'utf8').replace(/^import .*;$/gm, '').replace(/export /g, '') + '\nthis.check = isPublicAuthPath;', helperContext);
const checkout = { URL, URLSearchParams, process: { env: {} } };
vm.runInNewContext(fs.readFileSync('src/domain/billing/checkout.js', 'utf8').replace(/export /g, '') + '\nthis.loginPath = checkoutLoginPath;', checkout);
const context = { checkoutLoginPath: checkout.loginPath, isPublicAuthPath: helperContext.check, window: { location: { pathname: '', href: '' } } };
vm.runInNewContext(source + '\nthis.redirect = redirectToAuthIfNeeded;', context);
for (const path of ['/login', '/login/', '/register', '/forgot-password', '/auth/login', '/auth/registro']) {
  context.window.location.pathname = path;
  context.window.location.href = '';
  assert.equal(context.redirect(), false, path);
  assert.equal(context.window.location.href, '');
}
context.window.location.pathname = '/inicio';
assert.equal(context.redirect(), true);
assert.equal(context.window.location.href, '/login');
context.window.location.pathname = '/cuenta/planes';
context.window.location.search = '?attempt_id=11111111-1111-4111-8111-111111111111&token=discard-me&result=approved';
assert.equal(context.redirect(), true);
assert.equal(context.window.location.href, '/login?checkout_attempt=11111111-1111-4111-8111-111111111111');
context.window.location.pathname = '/cuenta/cambiar-plan';
assert.equal(context.redirect(), true);
assert.equal(context.window.location.href, '/login?checkout_attempt=11111111-1111-4111-8111-111111111111&checkout_operation=change_plan');
const changeRoute = router.match('/cuenta/cambiar-plan?attempt_id=11111111-1111-4111-8111-111111111111');
assert.equal(changeRoute.name, 'accountPlanChange'); assert.equal(changeRoute.meta.requireAuth, true); assert.equal(changeRoute.meta.paymentsAccess, true);
console.log('PASS public auth routes, legacy redirects, query/hash preservation and expired-session redirects');
