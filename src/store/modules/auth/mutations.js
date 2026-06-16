import types from '../common/mutation-types';
import Vue from 'vue';
import decode from 'jwt-decode';
import { setSessionPermissions, normalizePermissions } from '../../../security/permissions';
import { isD2AuthMode } from '../../../services/config/authTransport.config';

const getSessionPayload = (payload) => payload && payload.data ? payload.data : payload;

const getRoleCode = (sessionPayload) => {
    if(!sessionPayload) {
        return null;
    }

    if(typeof sessionPayload.role === 'string') {
        return sessionPayload.role;
    }

    if(sessionPayload.role && sessionPayload.role.code) {
        return sessionPayload.role.code;
    }

    return sessionPayload.user && sessionPayload.user.rol ? sessionPayload.user.rol : null;
}

const setAnonymousRuntimeState = (state) => {
    state.token = null
    state.refreshtoken = null
    state.authenticated = false
    state.user = null
    state.role = null
    state.permissions = []
    state.business = null
    state.tenantOperational = null
    state.accessExpiresAt = null
    state.sessionState = null
}

const mutations = {
    [types.SET_TOKEN] (state, payload) {
        if(isD2AuthMode()) {
            state.token = null
            state.authenticated = false
            return
        }

        if(payload) {
            state.token = payload
            state.user = decode(payload)
            state.role = state.user.rol || null
            state.authenticated = true
            state.business = {
                id_business: state.user.id_business || null,
                name: state.user.business_name || '',
                slug: state.user.business_slug || '',
                status: state.user.business_status || ''
            }
            state.unauthorized = false
            Vue.prototype.$session.set('token', payload)
            Vue.prototype.$session.set('business', state.business)
        }else {
            state.user = null
            state.role = null
            state.business = null
            state.token = null
            state.authenticated = false
        }
    },
    [types.SET_REFRESH_TOKEN] (state, payload) {
        if(isD2AuthMode()) {
            state.refreshtoken = null
            return
        }

        if(payload) {
            state.refreshtoken = payload
            Vue.prototype.$session.set('refreshtoken', payload)
        }else {
            state.refreshtoken = null
        }
    },
    [types.SET_AUTH_PERMISSIONS] (state, payload) {
        state.permissions = normalizePermissions(payload)
        if(!isD2AuthMode()) {
            setSessionPermissions(Vue.prototype.$session, state.permissions)
        }
    },
    [types.SET_AUTH_BUSINESS] (state, payload) {
        state.business = payload || null
        if(isD2AuthMode()) {
            return
        }

        if(payload) {
            Vue.prototype.$session.set('business', payload)
        }
    },
    [types.SET_AUTH_TENANT_OPERATIONAL] (state, payload) {
        state.tenantOperational = payload || null
        if(isD2AuthMode()) {
            return
        }

        if(payload) {
            Vue.prototype.$session.set('tenantOperational', payload)
        } else if(Vue.prototype.$session) {
            if(typeof Vue.prototype.$session.remove === 'function') {
                Vue.prototype.$session.remove('tenantOperational')
            } else {
                Vue.prototype.$session.set('tenantOperational', null)
            }
        }
    },
    [types.SET_D2_AUTH_SESSION] (state, payload) {
        const sessionPayload = getSessionPayload(payload)
        const authenticated = Boolean(sessionPayload && sessionPayload.authenticated)

        if(!authenticated) {
            setAnonymousRuntimeState(state)
            state.unauthorized = true
            return
        }

        state.token = null
        state.refreshtoken = null
        state.authenticated = true
        state.user = sessionPayload.user || null
        state.role = getRoleCode(sessionPayload)
        state.permissions = normalizePermissions(sessionPayload.permissions)
        state.business = sessionPayload.business || null
        state.tenantOperational = sessionPayload.tenantOperational || null
        state.accessExpiresAt = sessionPayload.accessExpiresAt || null
        state.sessionState = sessionPayload.sessionState || null
        state.unauthorized = false
    },
    [types.SET_AUTH_LOGIN_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasError = payload
        }else {
            state.hasError.error = false
        }
    },
    [types.SET_AUTH_UNAUTHORIZED] (state, payload) {
        if(payload) {
            state.unauthorized = payload
        }else {
            state.unauthorized = false
        }
    },
    [types.SET_AUTH_SENDOTP] (state, payload) {
        state.isOtpSend = payload ? payload : false
    },
    [types.SET_AUTH_VALIDATEOTP] (state, payload) {
        state.isValidateOtp = payload ? payload : false
    },
    [types.SET_AUTH_UPDATEPWD] (state, payload) {
        state.isPwdUpdated = payload ? payload : false
    },
    [types.SET_AUTH_OTP_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorOTP = payload
        }else {
            state.hasErrorOTP.error = false
        }
    },
    [types.SET_AUTH_VOTP_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorVOTP = payload
        }else {
            state.hasErrorVOTP.error = false
        }
    },
    [types.SET_AUTH_PWD_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorPWD = payload
        }else {
            state.hasErrorPWD.error = false
        }
    },
    [types.SET_AUTH_REFRESING_TOKEN] (state, payload) {
        state.isRefresingToken = payload
    },
}

export default mutations
