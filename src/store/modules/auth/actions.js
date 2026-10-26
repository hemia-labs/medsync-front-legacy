import Vue from 'vue';
import decode from 'jwt-decode';
import { DAAuthService } from '../../../services/context/core-proccess-context';
import DAAuthModel from '../../../models/auth/DAAuthModel';
import types from '../common/mutation-types';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import modules from '../common/module-types';
import DARefreshTokenModel from '../../../models/auth/DARefreshTokenModel';
import { isD2AuthMode } from '../../../services/config/authTransport.config';
import { clearLegacyAuthStorageForD2, clearClinicalContinuityCache } from '../../../utils/authStorageCleanup';
import { clearD2ClientAuthArtifacts, redirectToAuthIfNeeded } from '../../../utils/d2AuthCleanup';

let accessRefresh = null;

const getD2SessionPayload = (response) => {
    if(response && response.d2Session && response.d2Session.data) {
        return response.d2Session.data;
    }

    if(response && response.data && response.data.session) {
        return response.data.session;
    }

    if(response && response.data && response.data.authenticated !== undefined) {
        return response.data;
    }

    return null;
}

const commitD2Session = (commit, response) => {
    clearLegacyAuthStorageForD2(Vue.prototype.$session);
    commit(types.SET_D2_AUTH_SESSION, getD2SessionPayload(response));
}

const getSessionCode = response => response && response.data ? response.data.code : null;

const sessionFromLegacyRenewal = response => {
    if(!response || !response.success || !response.data || !response.data.token) return response;
    const data = response.data;
    const user = decode(data.token);
    return { success: true, data: {
        authenticated: true, user, role: user.rol || null, permissions: data.permisos || [],
        business: data.business || { id_business: user.id_business || null },
        tenantOperational: data.tenantOperational || null, sessionState: 'active',
        accessToken: data.token, refreshToken: data.refresh_token || null
    } };
};

const actions = {

    /**
     * Función que permite realizar el inicio de sesión en el sistema
     * @param {*} param0 
     * @param {*} credentials 
     */
    async login({commit, dispatch}, credentials) {

            const {pwd, param, refresh} = credentials;
            let authModel = new DAAuthModel()
            authModel.param = param
            authModel.pwd = pwd
            authModel.refresh = refresh

            let response = await DAAuthService.login(authModel);
            if(response.success) {
                if(isD2AuthMode()) {
                    commitD2Session(commit, response)
                    commit(types.SET_AUTH_LOGIN_EXCEPTION, new DAHasErrorModel() )
                    dispatch(modules.CORE+'/rollback', {}, {root: true})
                    return response
                }

                commit(types.SET_TOKEN, response.data.token)
                commit(types.SET_REFRESH_TOKEN, response.data.refresh_token)
                commit(types.SET_AUTH_PERMISSIONS, response.data.permisos)
                commit(types.SET_AUTH_TENANT_OPERATIONAL, response.data.tenantOperational || null)
                commit(types.SET_AUTH_LOGIN_EXCEPTION, new DAHasErrorModel() )
                dispatch(modules.CORE+'/rollback', {}, {root: true})
            }
            else {
                commit(types.SET_AUTH_LOGIN_EXCEPTION, new DAHasErrorModel(true, response.message) )
            }
            return response
    },

    /**
     * Función que permite mandar un código OTP
     * @param {*} data {PHONE: 961}
     */
    async sendOtp({commit},data) {
        let response = await DAAuthService.sendOtp(data);
        if(response.success) {
            commit(types.SET_AUTH_SENDOTP, response.data)
            commit(types.SET_AUTH_OTP_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_AUTH_SENDOTP,false)
            commit(types.SET_AUTH_OTP_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    /**
     * Función que permite validar un código OTP
     * @param {*} data {code: 12345, telephone: 96155555}
     */
    async validateOtp({commit},data) {
        let response = await DAAuthService.validateOtp(data);
        if(response.success) {
            commit(types.SET_AUTH_VALIDATEOTP, response.data)
            commit(types.SET_AUTH_VOTP_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_AUTH_VALIDATEOTP,false)
            commit(types.SET_AUTH_VOTP_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    /**
     * Función que permite actualizar la contraseña
     * @param {*} data {otp: 12345, telephone: 96155555, password: '123456'}
     */
    async updatePwd({commit},data) {
        let response = await DAAuthService.updatePwd(data);
        if(response.success) {
            commit(types.SET_AUTH_UPDATEPWD, response.data)
            commit(types.SET_AUTH_PWD_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_AUTH_UPDATEPWD,false)
            commit(types.SET_AUTH_PWD_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    /**
     * Función que permite recuperar el token de la sesión
     * @param {*} param0 
     */
    async getToken({commit, dispatch}) {
        if(isD2AuthMode()) {
            return dispatch('refreshAccess', { hydrate: true });
        }

        const token =  Vue.prototype.$session? Vue.prototype.$session.get('token') : null;
        const refreshtoken =  Vue.prototype.$session? Vue.prototype.$session.get('refreshtoken') : null;
        if(token) {
            commit(types.SET_TOKEN, token)
            commit(types.SET_REFRESH_TOKEN, refreshtoken)
            commit(types.SET_AUTH_PERMISSIONS, Vue.prototype.$session ? Vue.prototype.$session.get('permissions') : [])
            commit(types.SET_AUTH_TENANT_OPERATIONAL, Vue.prototype.$session ? Vue.prototype.$session.get('tenantOperational') : null)
            await dispatch('refreshAccess')
        }else {
            commit(types.SET_TOKEN, null)
            commit(types.SET_REFRESH_TOKEN, null)
            commit(types.SET_AUTH_PERMISSIONS, [])
            commit(types.SET_AUTH_TENANT_OPERATIONAL, null)
        }
    },
    async refreshAccess({state, commit}, options = {}) {
        if(!state.authenticated && !options.hydrate) return null;
        const revision = state.accessRevision;
        if(accessRefresh && accessRefresh.revision === revision) {
            accessRefresh.clearOnFailure = accessRefresh.clearOnFailure || options.clearOnFailure;
            return accessRefresh.promise;
        }
        const refresh = { revision, clearOnFailure: options.clearOnFailure, promise: null };
        refresh.promise = (async () => {
            try {
                let response = await DAAuthService.session();
                if(revision !== state.accessRevision) return response;
                // An expired access token is renewable; an invalid/revoked
                // session is terminal. This path never replays the denied action.
                if(getSessionCode(response) === 'AUTH_ACCESS_EXPIRED' && (isD2AuthMode() || state.refreshtoken)) {
                    const renewed = await DAAuthService.refreshToken(isD2AuthMode() ? undefined : new DARefreshTokenModel(state.refreshtoken));
                    if(revision !== state.accessRevision) return renewed;
                    response = isD2AuthMode()
                        ? (renewed && renewed.d2Session ? renewed.d2Session : renewed)
                        : sessionFromLegacyRenewal(renewed);
                }
                if(response && response.success && response.data && response.data.authenticated) {
                    if(isD2AuthMode()) commitD2Session(commit, response);
                    else commit(types.SET_AUTH_ACCESS_SESSION, response.data);
                } else if(response && (response.unauthorized || response.status === 401 || response.success)) {
                    commit(types.SET_AUTH_ACCESS_SESSION, null);
                    clearLegacyAuthStorageForD2(Vue.prototype.$session);
                    clearD2ClientAuthArtifacts(Vue.prototype.$session);
                    redirectToAuthIfNeeded();
                } else if(refresh.clearOnFailure) {
                    commit(types.SET_AUTH_PERMISSIONS, []);
                }
                return response;
            } finally { if(accessRefresh === refresh) accessRefresh = null; }
        })();
        accessRefresh = refresh;
        return refresh.promise;
    },
    /**
     * Función que permite actualizar el token de sesión
     * @param {*} param0 Datos de refresh token
     */
    async getRefreshtoken({state, commit, dispatch}) {
        if(state.isRefresingToken) {
            return;
        }
        commit(types.SET_AUTH_REFRESING_TOKEN, true)
        const revision = state.accessRevision;
        if(isD2AuthMode()) {
            const response = await DAAuthService.refreshToken();
            if(revision !== state.accessRevision) { commit(types.SET_AUTH_REFRESING_TOKEN, false); return response; }
            if(response && response.success) {
                commit(types.SET_AUTH_UNAUTHORIZED, false)
                commitD2Session(commit, response)
                dispatch(modules.CORE+'/rollback', {}, {root: true})
            } else {
                commit(types.SET_D2_AUTH_SESSION, null)
            }
            commit(types.SET_AUTH_REFRESING_TOKEN, false)
            return response;
        }

         if(!state.refreshtoken) {
            await dispatch('logout', null);
            commit(types.SET_AUTH_REFRESING_TOKEN, false)
            return;
         }
        let response = await DAAuthService.refreshToken(new DARefreshTokenModel(state.refreshtoken));
        if(revision !== state.accessRevision) { commit(types.SET_AUTH_REFRESING_TOKEN, false); return response; }
        if(response.success) {
            commit(types.SET_AUTH_UNAUTHORIZED, false)
            commit(types.SET_TOKEN, response.data.token)
            commit(types.SET_REFRESH_TOKEN, response.data.refresh_token)
            commit(types.SET_AUTH_PERMISSIONS, response.data.permisos)
            commit(types.SET_AUTH_TENANT_OPERATIONAL, response.data.tenantOperational || null)
            dispatch(modules.CORE+'/rollback', {}, {root: true})
        }else {
            commit(types.SET_TOKEN, null)
            commit(types.SET_REFRESH_TOKEN, null)
            commit(types.SET_AUTH_PERMISSIONS, [])
            commit(types.SET_AUTH_TENANT_OPERATIONAL, null)
            dispatch('logout', null);
            window.location.href = '/'
        }
        commit(types.SET_AUTH_REFRESING_TOKEN, false)
    },

    /**
     * Función que permite cerrar la sesión del usuario
     * @param {*} param0 
     */
    async logout({commit, state}) {
        clearClinicalContinuityCache();
        const hadSession = state.authenticated || state.token;
        const cookieMode = isD2AuthMode();
        const refreshToken = state.refreshtoken;
        // Clear views and in-flight results immediately, even if the network fails.
        // Storage/cookies are retained only until the close request is prepared.
        commit(types.SET_AUTH_ACCESS_SESSION, null);
        const closingRevision = state.accessRevision;
        try {
            if(hadSession) {
                const closed = await DAAuthService.close();
                if(getSessionCode(closed) === 'AUTH_ACCESS_EXPIRED'
                    && (cookieMode || refreshToken) && state.accessRevision === closingRevision) {
                    // Renew only to revoke the server session; never rehydrate
                    // protected views while the user is signing out.
                    const renewed = await DAAuthService.refreshToken(cookieMode ? undefined : new DARefreshTokenModel(refreshToken));
                    if(renewed && renewed.success && state.accessRevision === closingRevision) {
                        if(!cookieMode && renewed.data && renewed.data.token) {
                            Vue.prototype.$session.set('token', renewed.data.token);
                        }
                        await DAAuthService.close();
                    }
                }
            }
        } finally {
            commit(types.SET_AUTH_UNAUTHORIZED, false);
            clearLegacyAuthStorageForD2(Vue.prototype.$session);
            clearD2ClientAuthArtifacts(Vue.prototype.$session);
            window.location.href = '/auth/login';
        }
    }
}

export default actions
