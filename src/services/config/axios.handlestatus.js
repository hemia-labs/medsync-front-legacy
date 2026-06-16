
import store from '../../store/index';
import types from '../../store/modules/common/mutation-types';
import modules from '../../store/modules/common/module-types';
import { isD2AuthMode } from './authTransport.config';
import { clearD2ClientAuthArtifacts, redirectToAuthIfNeeded, shouldSkipD2UnauthorizedRedirect } from '../../utils/d2AuthCleanup';
 
export const actions = {
    unauthorized: async (error) => {
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

    403: (error) => {
        const payload = error && error.response ? error.response.data : null;
        const data = payload && payload.data ? payload.data : payload;
        const code = data && data.code ? data.code : (payload && payload.code ? payload.code : '');

        if(code === 'TENANT_NOT_OPERATIONAL') {
            return actions.tenantNotOperational(error);
        }

        return actions.default(error);
    },

    500: actions.error,

    'default': actions.default
}
