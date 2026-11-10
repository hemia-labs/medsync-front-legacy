import Vue from 'vue';
import { canAccessPulse } from '../security/pulseAccess';
import VueRouter from 'vue-router';
import dashboard from './routes/dashboard';
import superAdmin from './routes/super-admin';
import admin from './routes/admin';
import auth from './routes/auth';
import patient from './routes/patient';
import error from './routes/error';
import legal from './routes/legal';
import business from './routes/business';
import prescription from './routes/prescription';
import publicSignature from './routes/public-signature';
import licensingDemo from './routes/licensing-demo';
import help from './routes/help';
import { isPendingActivation } from '../utils/registration';
import { getSessionPermissions, hasAnyPermission, hasPermission } from '../security/permissions';
import { canAccessSettings } from '../security/settingsAccess';
import store from '../store';
import { isD2AuthMode } from '../services/config/authTransport.config';
import { trackPageView } from '../plugins/analytics';

Vue.use(VueRouter)

const AUTH_NAMESPACE = 'CORE/AUTH';

function getLegacyTokenPayload() {
    const current = store.getters[`${AUTH_NAMESPACE}/getUser`];
    if(current) return { ...current, rol: store.getters[`${AUTH_NAMESPACE}/getRole`] || current.rol };
    const token = Vue.prototype.$session ? Vue.prototype.$session.get('token') : null;
    if(!token) {
        return null;
    }

    try {
        return JSON.parse(atob(token.split('.')[1]));
    }
    catch(error) {
        return null;
    }
}

function isLegacySuperAdminSession() {
    const payload = getLegacyTokenPayload();
    return Boolean(payload && payload.rol === 'super_admin');
}

function isD2SuperAdminSession() {
    return store.getters[`${AUTH_NAMESPACE}/getRole`] === 'super_admin'
        || store.getters[`${AUTH_NAMESPACE}/isSuperAdmin`];
}

function getDefaultAuthenticatedRoute() {
    if(isPendingAccountSession()) return { name: 'accountActivation' };
    if(isD2AuthMode()) {
        return isD2SuperAdminSession() ? { name: 'superAdminDashboard' } : { name: 'home' };
    }

    return isLegacySuperAdminSession() ? { name: 'superAdminDashboard' } : { name: 'home' };
}

function getLegacyTenantOperationalState() {
    return Vue.prototype.$session ? Vue.prototype.$session.get('tenantOperational') : null;
}

function isPendingAccountSession() {
    if(isD2AuthMode()) return !isD2SuperAdminSession() && isPendingActivation(getD2TenantOperationalState(), store.getters[`${AUTH_NAMESPACE}/getBusiness`]);
    return !isLegacySuperAdminSession() && isPendingActivation(getLegacyTenantOperationalState());
}

function getD2TenantOperationalState() {
    return store.getters[`${AUTH_NAMESPACE}/getTenantOperational`] || null;
}

function isLegacyTenantRestrictedSession() {
    const tenantOperational = getLegacyTenantOperationalState();
    return Boolean(
        tenantOperational
        && tenantOperational.allowed === false
        && tenantOperational.code === 'TENANT_NOT_OPERATIONAL'
    );
}

function isD2TenantRestrictedSession() {
    const tenantOperational = getD2TenantOperationalState();
    return Boolean(
        tenantOperational
        && tenantOperational.allowed === false
        && tenantOperational.code === 'TENANT_NOT_OPERATIONAL'
    );
}

function canRouteInTenantRestrictedMode(to) {
    if (to.name === 'admin' && to.query && to.query.section === 'account-legal') {
        return true;
    }
    if (to.matched.some(record => record.meta.allowTenantRestricted)) {
        return true;
    }

    return ['AllPatients', 'ShowPx'].includes(to.name);
}

const routes = [
        {
            path: '/',
            name: 'root',
            redirect: () => getDefaultAuthenticatedRoute(),
        },
        ...auth,
        ...superAdmin,
        ...dashboard,
        ...admin,
        ...patient,
        ...error,
        ...legal,
        ...publicSignature,
        ...licensingDemo,
        ...help,
        ...business,
        ...prescription,
        { path: "*", component: () => import('@/views/error/404.vue') }

]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
  })

  function isLegacyAuthorized() {
    let session = Vue.prototype.$session.get('token');
    return session == undefined || !session ? false : true;
  }

  function isD2Authorized() {
    return Boolean(store.getters[`${AUTH_NAMESPACE}/isAuthorized`]);
  }

  async function ensureD2SessionHydrated() {
    if(isD2Authorized()) {
        return true;
    }

    try {
        await store.dispatch(`${AUTH_NAMESPACE}/getToken`);
        return isD2Authorized();
    } catch {
        return false;
    }
  }

  async function d2BeforeEach(to, next, requiredAuth) {
    const shouldHydrate = requiredAuth || ['login', 'register', 'forgotPassword'].includes(to.name);
    const hasSession = shouldHydrate ? await ensureD2SessionHydrated() : isD2Authorized();

    if (requiredAuth && to.name !== 'login' && !hasSession){
        next({ name: 'auth' })
        return;
    }

    if(['login', 'register', 'forgotPassword'].includes(to.name) && hasSession){
        next(getDefaultAuthenticatedRoute())
        return;
    }

    if(!requiredAuth) {
        next();
        return;
    }

    // Pending accounts cannot mount the clinical layout, including read-only routes.
    if(isPendingAccountSession() && to.name !== 'accountActivation') {
        next({ name: 'accountActivation' }); return;
    }
    const welcomePending = Boolean((store.getters[`${AUTH_NAMESPACE}/getBusiness`] || {}).registrationWelcomePending);
    if(to.name === 'accountActivation' && !isPendingAccountSession() && !welcomePending) {
        next(getDefaultAuthenticatedRoute()); return;
    }

    if(['dashboard', 'home'].includes(to.name) && isD2SuperAdminSession()){
        next({ name: 'superAdminDashboard' })
        return;
    }

    if(isD2TenantRestrictedSession() && !isD2SuperAdminSession() && !canRouteInTenantRestrictedMode(to)) {
        next({ name: 'tenantRestricted' })
        return;
    }

    if(welcomePending && !isPendingAccountSession() && !isD2SuperAdminSession()
        && !isD2TenantRestrictedSession() && ['home', 'dashboard'].includes(to.name)) {
        next({ name: 'accountActivation' }); return;
    }

    if(to.matched.some(r=>r.meta.pulseAccess) && !canAccessPulse(store.state.CORE.AUTH.permissions,store.state.CORE.AUTH.role)) { next({name:'home'});return; }
    let runtimePermissions = store.getters[`${AUTH_NAMESPACE}/getPermissions`] || [];
    // A failed background access refresh can leave a still-authenticated client
    // without rights. Revalidate before rejecting entry to a patient record.
    if(to.name === 'ShowPx' && !hasPermission(runtimePermissions, 'px.all')) {
        let response;
        try { response = await store.dispatch(`${AUTH_NAMESPACE}/refreshAccess`, { clearOnFailure: true }); }
        catch { response = null; }
        if(!isD2Authorized()) { next({ name: 'auth' }); return; }
        runtimePermissions = store.getters[`${AUTH_NAMESPACE}/getPermissions`] || [];
        if(!response || !response.success || !hasPermission(runtimePermissions, 'px.all')) {
            next(false);
            Vue.prototype.$swal.fire({
                icon: 'warning', title: 'No se pudo abrir el expediente',
                text: response && response.success
                    ? 'Tu acceso al expediente cambió. Solicita al administrador que revise tus permisos.'
                    : 'No se pudo verificar tu acceso. Intenta abrir al paciente nuevamente.'
            });
            return;
        }
    }
    if(to.matched.some(record=>record.meta.settingsAccess) && !canAccessSettings(store.getters[`${AUTH_NAMESPACE}/getRole`], permission=>hasPermission(runtimePermissions,permission))) {
        next({name:'home'});return;
    }
    const requiredPermission = to.matched.map(record => record.meta.permission).find(permission => permission);
    const requiredPermissionOptions = to.matched.map(record => record.meta.permissionsAny).find(permissions => Array.isArray(permissions) && permissions.length);

    if (requiredPermissionOptions && !hasAnyPermission(runtimePermissions, requiredPermissionOptions)) {
        next({ name: 'home' })
        return;
    }

    if (requiredPermission && !hasPermission(runtimePermissions, requiredPermission)) {
        next({ name: 'home' })
        return;

    }

    const requiredRole = to.matched.map(record => record.meta.role).find(role => role);
    if (requiredRole) {
      const runtimeRole = store.getters[`${AUTH_NAMESPACE}/getRole`];
      if(runtimeRole !== requiredRole) {
        next(getDefaultAuthenticatedRoute())
        return;
      }
    }

    next();
  }

  function legacyBeforeEach(to, next, requiredAuth) {
     if (requiredAuth && to.name !== 'login' && !isLegacyAuthorized()){
          next({ name: 'auth' })
          return;
      }

    if(['login', 'register', 'forgotPassword'].includes(to.name) && isLegacyAuthorized()){
        next(getDefaultAuthenticatedRoute())
        return;
    }

    if(requiredAuth && ['dashboard', 'home'].includes(to.name) && isLegacySuperAdminSession()){
        next({ name: 'superAdminDashboard' })
        return;
    }

    if(requiredAuth && isPendingAccountSession() && to.name !== 'accountActivation') {
        next({ name: 'accountActivation' }); return;
    }
    if(requiredAuth && to.name === 'accountActivation' && !isPendingAccountSession()) {
        next(getDefaultAuthenticatedRoute()); return;
    }

    if(requiredAuth && isLegacyTenantRestrictedSession() && !isLegacySuperAdminSession() && !canRouteInTenantRestrictedMode(to)) {
        next({ name: 'tenantRestricted' })
        return;
    }

    if(requiredAuth && to.matched.some(r=>r.meta.pulseAccess) && !canAccessPulse(getSessionPermissions(Vue.prototype.$session),(getLegacyTokenPayload()||{}).rol)) { next({name:'home'});return; }
    const sessionPermissions = getSessionPermissions(Vue.prototype.$session);
    if(requiredAuth && to.matched.some(record=>record.meta.settingsAccess) && !canAccessSettings((getLegacyTokenPayload() || {}).rol, permission=>hasPermission(sessionPermissions,permission))) {
        next({name:'home'});return;
    }
    const requiredPermission = to.matched.map(record => record.meta.permission).find(permission => permission);
    const requiredPermissionOptions = to.matched.map(record => record.meta.permissionsAny).find(permissions => Array.isArray(permissions) && permissions.length);

    if (requiredAuth && requiredPermissionOptions && !hasAnyPermission(sessionPermissions, requiredPermissionOptions)) {
        next({ name: 'home' })
        return;
    }

    if (requiredAuth && requiredPermission && !hasPermission(sessionPermissions, requiredPermission)) {
        next({ name: 'home' })
        return;

    }

    const requiredRole = to.matched.map(record => record.meta.role).find(role => role);
    if (requiredAuth && requiredRole) {
      const payload = getLegacyTokenPayload();
      if(!payload || payload.rol !== requiredRole) {
        next(getDefaultAuthenticatedRoute())
        return;
      }
    }

    next();
  }


  router.beforeEach((to, from, next) => {
     const requiredAuth  = to.matched.some(record => record.meta.requireAuth);

     if(isD2AuthMode()) {
        d2BeforeEach(to, next, requiredAuth).catch(() => next({ name: 'auth' }));
        return;
     }

     legacyBeforeEach(to, next, requiredAuth);
  });


const DEFAULT_TITLE = 'medsync';
router.afterEach((to) => {
  Vue.nextTick(() => {
    document.title = to.meta.title || DEFAULT_TITLE;
  })
  trackPageView(to);
})

export default router
