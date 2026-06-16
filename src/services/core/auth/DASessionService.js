import axios from 'axios';
import context from '../../config/axios.url';
import { DAC_AUTH_SESSION } from '../../common/apiurl';
import { isD2AuthMode } from '../../config/authTransport.config';

const sessionClient = axios.create({
    baseURL: context.APP_CORE_URL
});

const normalizeUrl = (url) => url ? url.replace(/^\/+/, '') : url;

const normalizeSessionPayload = (payload) => (
    payload && payload.data ? payload.data : payload
);

const buildDisabledResponse = () => ({
    success: false,
    authenticated: false,
    d2Disabled: true,
    data: {
        authenticated: false
    }
});

const buildSessionResponse = (response) => {
    const payload = response.data || {};
    const data = normalizeSessionPayload(payload) || {};

    return {
        ...payload,
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        authenticated: Boolean(data.authenticated),
        data
    };
}

const buildErrorResponse = (error) => {
    const status = error.response ? error.response.status : 0;
    const payload = error.response && error.response.data ? error.response.data : {};
    const data = normalizeSessionPayload(payload) || { authenticated: false };

    return {
        ...payload,
        success: false,
        status,
        authenticated: false,
        unauthorized: status === 401,
        data: {
            ...data,
            authenticated: false
        },
        message: payload.message || 'No fue posible hidratar la sesion.'
    };
}

export default {
    async getSession() {
        if(!isD2AuthMode()) {
            return buildDisabledResponse();
        }

        try {
            const response = await sessionClient.get(normalizeUrl(DAC_AUTH_SESSION), {
                withCredentials: true
            });

            return buildSessionResponse(response);
        } catch (error) {
            return buildErrorResponse(error);
        }
    },

    async bootstrapSession() {
        return this.getSession();
    }
}
