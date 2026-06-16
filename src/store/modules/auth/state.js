import Vue from 'vue';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import { getSessionPermissions } from '../../../security/permissions';
import { isD2AuthMode } from '../../../services/config/authTransport.config';

const state = () => {
    const d2Mode = isD2AuthMode();
    const session = Vue.prototype.$session;
    const token = !d2Mode && session ? session.get('token') : '';

    return {
        token,
        refreshtoken: !d2Mode && session ? session.get('refreshtoken') : '',
        authenticated: Boolean(token),
        role:           null,
        permissions: !d2Mode && session ? getSessionPermissions(session): [],
        business: !d2Mode && session ? session.get('business') : null,
        tenantOperational: !d2Mode && session ? session.get('tenantOperational') : null,
        accessExpiresAt: null,
        sessionState:   null,
        user:           null,
        security:       null,
        hasError:       new DAHasErrorModel(),
        hasErrorOTP:    new DAHasErrorModel(),
        hasErrorVOTP:   new DAHasErrorModel(),
        hasErrorPWD:    new DAHasErrorModel(),
        unauthorized:   false,
        isOtpSend:      {},
        isValidateOtp:  {},
        isPwdUpdated:   {},
        isRefresingToken: false
    }
}

export default state
