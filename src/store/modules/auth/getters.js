import { isD2AuthMode } from '../../../services/config/authTransport.config';

const getters = {
    isAuthorized:   state => isD2AuthMode() ? Boolean(state.authenticated) : Boolean(state.token),
    getUser:        state => state.user,
    getBusiness:    state => state.business,
    getTenantOperational: state => state.tenantOperational,
    isSuperAdmin:   state => state.role === 'super_admin' || (state.user && state.user.rol === 'super_admin'),
    getPermissions: state => state.permissions,
    getRole:        state => state.role,
    getAccessExpiresAt: state => state.accessExpiresAt,
    getSessionState: state => state.sessionState,
    getAccessRevision: state => state.accessRevision || 0,
    hasPermission:  state => permission => !permission || state.permissions.includes(permission),
    hasError:       state => state.hasError,
    hasErrorOTP:    state => state.hasErrorOTP,
    hasErrorVOTP:   state => state.hasErrorVOTP,
    hasErrorPWD:    state => state.hasErrorPWD,
    unauthorized:   state => state.unauthorized,
    sendOtp:        state => state.isOtpSend,
    validateOtp:    state => state.isValidateOtp, 
    updatePwd:      state => state.isPwdUpdated, 
    refreshtoken:      state => state.refreshtoken, 
    isRefresingToken:      state => state.isRefresingToken, 
    
}

export default getters
