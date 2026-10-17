
import { options } from './axios.handlestatus'
import store from '../../store';
import { isCurrentAuthorization, authorizationChangedError } from '../../security/authorizationContext';

export const handleSuccess = response => isCurrentAuthorization(response.config && response.config.authorizationContext, store)
    ? response : Promise.reject(authorizationChangedError());

export const handleError = (error) => {
    if(!isCurrentAuthorization(error.config && error.config.authorizationContext, store)) {
        return Promise.reject(authorizationChangedError());
    }

    const status = error.response ? error.response.status : 'default';
    return options[status] ? options[status](error) : options['default'](error)
}
