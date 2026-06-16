import context from '../../config/axios.config';
import {
    DAC_PUBLIC_DOCUMENT_SIGNATURE,
    DAC_PUBLIC_DOCUMENT_SIGNATURE_SIGN
} from '../../common/apiurl';

function buildResponse(result) {
    if (result && result.status >= 200 && result.status < 300) {
        return { ...result.data, success: result.data && result.data.success !== false };
    }

    return {
        success: false,
        data: null,
        message: 'No fue posible completar la solicitud.'
    };
}

function buildErrorResponse(error) {
    const payload = error && error.response && error.response.data ? error.response.data : {};
    return {
        ...payload,
        status: payload.status || (error && error.response ? error.response.status : null),
        success: false,
        data: payload.data || null,
        message: payload.message || 'No fue posible completar la solicitud.'
    };
}

function tokenPath(token) {
    return encodeURIComponent(String(token || '').trim());
}

export default {
    async getDocumentByToken(token) {
        try {
            const result = await context.core.get(DAC_PUBLIC_DOCUMENT_SIGNATURE + tokenPath(token));
            return buildResponse(result);
        } catch (error) {
            return buildErrorResponse(error);
        }
    },

    async signDocumentByToken(token, payload) {
        try {
            const result = await context.core.post(DAC_PUBLIC_DOCUMENT_SIGNATURE_SIGN(tokenPath(token)), payload || {});
            return buildResponse(result);
        } catch (error) {
            return buildErrorResponse(error);
        }
    }
};
