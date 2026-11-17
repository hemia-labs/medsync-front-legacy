
import { options } from './axios.handlestatus'
import store from '../../store';
import { isCurrentAuthorization, authorizationChangedError } from '../../security/authorizationContext';
import { canRecoverCsrf, recoverCsrfRequest, readableCsrfError } from './csrfRecovery';

// A response is applied only while the authorization that sent it is current: business requests carry
// authorizationContext; auth controls carry authOwner (NC1-AUTH-401-AMB R1).
const isCurrentRequest = config => isCurrentAuthorization(config && config.authorizationContext, store)
    && isCurrentAuthorization(config && config.authOwner, store);

export const handleSuccess = response => isCurrentRequest(response.config)
    ? response : Promise.reject(authorizationChangedError());

export const handleError = (error, send) => {
    if(!isCurrentRequest(error.config)) {
        return Promise.reject(authorizationChangedError());
    }

    if (send && canRecoverCsrf(error)) return recoverCsrfRequest(error, send);
    readableCsrfError(error);

    const status = error.response ? error.response.status : 'default';
    return options[status] ? options[status](error) : options['default'](error)
}
