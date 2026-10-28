
import { options } from './axios.handlestatus'
import store from '../../store';
import { isCurrentAuthorization, authorizationChangedError } from '../../security/authorizationContext';
import { canRecoverCsrf, recoverCsrfRequest, readableCsrfError } from './csrfRecovery';

export const handleSuccess = response => isCurrentAuthorization(response.config && response.config.authorizationContext, store)
    ? response : Promise.reject(authorizationChangedError());

export const handleError = (error, send) => {
    if(!isCurrentAuthorization(error.config && error.config.authorizationContext, store)) {
        return Promise.reject(authorizationChangedError());
    }

    if (send && canRecoverCsrf(error)) return recoverCsrfRequest(error, send);
    readableCsrfError(error);

    const status = error.response ? error.response.status : 'default';
    return options[status] ? options[status](error) : options['default'](error)
}
