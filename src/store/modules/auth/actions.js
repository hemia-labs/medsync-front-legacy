import Vue from 'vue';
import { DAAuthService } from '../../../services/context/core-proccess-context';
import { toSHA256 } from '../../../libs/crypto';
import { getTimestamp } from '../../../libs/time';
import DAAuthModel from '../../../models/auth/DAAuthModel';
import types from '../common/mutation-types';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import modules from '../common/module-types';
import DARefreshTokenModel from '../../../models/auth/DARefreshTokenModel';
import { isD2AuthMode } from '../../../services/config/authTransport.config';
import { clearLegacyAuthStorageForD2 } from '../../../utils/authStorageCleanup';
import { clearD2ClientAuthArtifacts } from '../../../utils/d2AuthCleanup';

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
            authModel.secretkey = process.env.VUE_APP_SECRET_KEY
            authModel.timestamp = getTimestamp()
            authModel.signature = toSHA256(authModel.secretkey+authModel.timestamp);
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
    async getToken({commit}) {
        if(isD2AuthMode()) {
            const response = await DAAuthService.session();
            commitD2Session(commit, response && response.success ? response : null)
            return response
        }

        const token =  Vue.prototype.$session? Vue.prototype.$session.get('token') : null;
        const refreshtoken =  Vue.prototype.$session? Vue.prototype.$session.get('refreshtoken') : null;
        if(token) {
            commit(types.SET_TOKEN, token)
            commit(types.SET_REFRESH_TOKEN, refreshtoken)
            commit(types.SET_AUTH_PERMISSIONS, Vue.prototype.$session ? Vue.prototype.$session.get('permissions') : [])
            commit(types.SET_AUTH_TENANT_OPERATIONAL, Vue.prototype.$session ? Vue.prototype.$session.get('tenantOperational') : null)
        }else {
            commit(types.SET_TOKEN, null)
            commit(types.SET_REFRESH_TOKEN, null)
            commit(types.SET_AUTH_PERMISSIONS, [])
            commit(types.SET_AUTH_TENANT_OPERATIONAL, null)
        }
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
        if(isD2AuthMode()) {
            const response = await DAAuthService.refreshToken();
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
        if(isD2AuthMode()) {
            try {
                await DAAuthService.close();
            } finally {
                commit(types.SET_D2_AUTH_SESSION, null)
                commit(types.SET_AUTH_UNAUTHORIZED, false)
                clearD2ClientAuthArtifacts(Vue.prototype.$session)
                window.location.href = '/auth/login'
            }
            return;
        }

        if(state.token) {
            await DAAuthService.close();
        }
        Vue.prototype.$session.destroy();
        commit(types.SET_TOKEN, null)
        commit(types.SET_REFRESH_TOKEN, null)
        commit(types.SET_AUTH_PERMISSIONS, [])
        commit(types.SET_AUTH_BUSINESS, null)
        commit(types.SET_AUTH_TENANT_OPERATIONAL, null)
        window.location.href = '/'
    }
}

export default actions
