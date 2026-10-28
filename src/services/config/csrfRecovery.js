import DACsrfService from '../core/auth/DACsrfService';
import { isCsrfEnabled, isD2AuthMode } from './authTransport.config';
import { authorizationChangedError } from '../../security/authorizationContext';

const RECOVERABLE = ['mismatch', 'expired', 'missing_cookie'];

export function canRecoverCsrf(error) {
    const config = error.config || {};
    const response = error.response || {};
    const payload = response.data || {};
    return isD2AuthMode() && isCsrfEnabled() && !config.csrfRetried && Boolean(config.csrfContext)
        && ['post', 'put', 'patch', 'delete'].includes(String(config.method).toLowerCase())
        && response.status === 403 && payload.code === 'CSRF_FORBIDDEN' && RECOVERABLE.includes(payload.reason);
}

export function readableCsrfError(error) {
    if (error.response && error.response.data && error.response.data.code === 'CSRF_FORBIDDEN') {
        error.response.data = { ...error.response.data,
            message: 'No fue posible validar la solicitud segura. Vuelve a intentar la acción.' };
    }
    return error;
}

export async function recoverCsrfRequest(error, send) {
    const config = error.config;
    const original = config.csrfContext;
    if (!DACsrfService.isCurrentContext(original)) throw authorizationChangedError();
    let token;
    try {
        token = await DACsrfService.ensureCsrfToken({ force: true });
    } catch (renewalError) {
        if (!DACsrfService.isCurrentContext(original)) throw authorizationChangedError();
        throw readableCsrfError(error);
    }
    // The opaque server identifier also catches a cookie/session change in
    // another tab. An older server without this contract is not replay-safe.
    if (!DACsrfService.isCurrentContext(original) || !original.contextId
        || !token || token.contextId !== original.contextId) throw authorizationChangedError();
    const headers = { ...config.headers };
    Object.keys(headers).forEach(key => {
        if ([original.headerName, token.headerName].some(name => name && key.toLowerCase() === name.toLowerCase())) delete headers[key];
    });
    headers[token.headerName] = token.csrfToken;
    // Reuse Axios' captured body (including FormData), URL, revision and key.
    return send({ ...config, headers, csrfRetried: true });
}
