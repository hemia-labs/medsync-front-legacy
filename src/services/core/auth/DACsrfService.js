import axios from 'axios';
import context from '../../config/axios.url';
import { DAC_AUTH_CSRF } from '../../common/apiurl';
import { isCsrfEnabled, isD2AuthMode } from '../../config/authTransport.config';

const DEFAULT_CSRF_HEADER = 'X-CSRF-Token';
const EXPIRY_SKEW_MS = 30000;

const csrfClient = axios.create({
    baseURL: context.APP_CORE_URL
});

let csrfState = {
    csrfToken: null,
    headerName: DEFAULT_CSRF_HEADER,
    expiresAt: null,
    contextType: null,
    fetchedAt: null
};

const normalizeUrl = (url) => url ? url.replace(/^\/+/, '') : url;

const normalizeCsrfPayload = (payload) => (
    payload && payload.data ? payload.data : payload
);

const isExpired = (expiresAt) => {
    if(!expiresAt) {
        return false;
    }

    const expiresAtMs = new Date(expiresAt).getTime();
    return Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now() + EXPIRY_SKEW_MS;
}

const hasUsableToken = () => (
    Boolean(csrfState.csrfToken)
    && !isExpired(csrfState.expiresAt)
);

const getTokenState = () => ({
    csrfToken: csrfState.csrfToken,
    headerName: csrfState.headerName || DEFAULT_CSRF_HEADER,
    expiresAt: csrfState.expiresAt,
    contextType: csrfState.contextType,
    fetchedAt: csrfState.fetchedAt
});

const getSafeState = () => ({
    hasToken: Boolean(csrfState.csrfToken),
    headerName: csrfState.headerName || DEFAULT_CSRF_HEADER,
    expiresAt: csrfState.expiresAt,
    contextType: csrfState.contextType,
    fetchedAt: csrfState.fetchedAt
});

const setTokenState = (payload) => {
    csrfState = {
        csrfToken: payload.csrfToken,
        headerName: payload.headerName || DEFAULT_CSRF_HEADER,
        expiresAt: payload.expiresAt || null,
        contextType: payload.contextType || null,
        fetchedAt: new Date().toISOString()
    };

    return getTokenState();
}

const fetchCsrfToken = async () => {
    const response = await csrfClient.get(normalizeUrl(DAC_AUTH_CSRF), {
        withCredentials: true
    });
    const payload = normalizeCsrfPayload(response.data);

    if(!payload || !payload.csrfToken) {
        throw new Error('CSRF token was not returned.');
    }

    return setTokenState(payload);
}

export default {
    async ensureCsrfToken(options = {}) {
        if(!isD2AuthMode() || !isCsrfEnabled()) {
            return null;
        }

        if(!options.force && hasUsableToken()) {
            return getTokenState();
        }

        return fetchCsrfToken();
    },

    async getCsrfHeader(options = {}) {
        const tokenState = await this.ensureCsrfToken(options);

        if(!tokenState || !tokenState.csrfToken) {
            return {};
        }

        return {
            [tokenState.headerName || DEFAULT_CSRF_HEADER]: tokenState.csrfToken
        };
    },

    clearCsrfToken() {
        csrfState = {
            csrfToken: null,
            headerName: DEFAULT_CSRF_HEADER,
            expiresAt: null,
            contextType: null,
            fetchedAt: null
        };
    },

    getCsrfState() {
        return getSafeState();
    }
}
