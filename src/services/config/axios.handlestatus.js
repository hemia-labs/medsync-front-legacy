
import store from '../../store/index';
import types from '../../store/modules/common/mutation-types';
import modules from '../../store/modules/common/module-types';
import { isD2AuthMode } from './authTransport.config';
import { clearD2ClientAuthArtifacts, redirectToAuthIfNeeded, shouldSkipD2UnauthorizedRedirect } from '../../utils/d2AuthCleanup';
import { isAuthControlRequest } from '../../security/authorizationContext';
import { clearLegacyAuthStorageForD2 } from '../../utils/authStorageCleanup';
 
export const actions = {
    unauthorized: async (error) => {
        const payload = error.response && error.response.data;
        const code = payload && (payload.code || payload.data && payload.data.code);
        if(code === 'AUTH_ACCESS_EXPIRED') {
            await store.dispatch(modules.AUTH + '/refreshAccess');
            return Promise.reject(error);
        }
        if(code === 'AUTH_SESSION_INVALID' || code === 'AUTH_ACCESS_INVALID') {
            store.commit(modules.AUTH+'/'+types.SET_AUTH_ACCESS_SESSION, null);
            clearLegacyAuthStorageForD2();
            clearD2ClientAuthArtifacts();
            redirectToAuthIfNeeded();
            return Promise.reject(error);
        }
        // The refresh action owns a failed renewal. Do not trigger another
        // renewal through the legacy unauthorized watcher.
        if(/\/auth\/refreshToken(?:\?|$)/i.test(String(error.config && error.config.url || ''))) {
            return Promise.reject(error);
        }
        if(isD2AuthMode()) {
            store.commit(modules.AUTH+'/'+types.SET_D2_AUTH_SESSION, null, {root: true})
            store.commit(modules.AUTH+'/'+types.SET_AUTH_UNAUTHORIZED, true, {root: true})
            clearD2ClientAuthArtifacts()

            if(!shouldSkipD2UnauthorizedRedirect(error)) {
                redirectToAuthIfNeeded()
            }

            return Promise.reject(error)
        }

        store.commit(modules.AUTH+'/'+types.SET_AUTH_UNAUTHORIZED, true, {root: true})
        return Promise.reject(error);
    },
    tenantNotOperational: (error) => {
        const payload = error && error.response ? error.response.data : null;
        const data = payload && payload.data ? payload.data : payload;
        store.commit(modules.AUTH+'/'+types.SET_AUTH_TENANT_OPERATIONAL, {
            allowed: false,
            code: 'TENANT_NOT_OPERATIONAL',
            reasonCode: data && data.reasonCode ? data.reasonCode : null,
            tenantStatus: data && (data.tenantStatus || data.status) ? (data.tenantStatus || data.status) : null,
            status: data && (data.tenantStatus || data.status) ? (data.tenantStatus || data.status) : null
        }, {root: true});

        if(window.location.pathname !== '/tenant-restricted') {
            window.location.href = '/tenant-restricted';
        }

        return Promise.reject(error);
    },
    error: (error) => {
        return Promise.reject(error)
    },
    notFound: () => {
        window.location.href = '/404'
    },
    default: (error) => {
        return Promise.reject(error)
    }
}

export const options = {

    401: actions.unauthorized,

    403: async (error) => {
        const payload = error && error.response ? error.response.data : null;
        const data = payload && payload.data ? payload.data : payload;
        const code = data && data.code ? data.code : (payload && payload.code ? payload.code : '');

        if(code === 'TENANT_NOT_OPERATIONAL') {
            return actions.tenantNotOperational(error);
        }

        if(!isAuthControlRequest(error.config && error.config.url) && !/^(CSRF_|PLAN_|LICENSE_)/.test(code)) {
            // Session mutations invalidate only a real identity/permission change.
            // An ordinary resource denial must not discard unrelated 200 responses.
            await store.dispatch(modules.AUTH + '/refreshAccess', { clearOnFailure: true });
        }

        return actions.default(error);
    },

    500: actions.error,

    'default': actions.default
}
