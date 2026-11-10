import axios from 'axios';
import context from '../../config/axios.url';
import { DAC_AUTH_CSRF } from '../../common/apiurl';
import { isCsrfEnabled, isD2AuthMode } from '../../config/authTransport.config';
import store from '../../../store';
import { authorizationContext, isCurrentAuthorization, authorizationChangedError } from '../../../security/authorizationContext';

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
let generation = 0;
let owner = null;
let pending = null;

const clearState = () => {
    generation += 1;
    csrfState = {};
    pending = null;
    owner = null;
};

const synchronizeContext = () => {
    if (owner && !isCurrentAuthorization(owner, store)) clearState();
    if (!owner) owner = authorizationContext(store);
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
    const lifetimeMs = expiresAtMs - Date.parse(csrfState.fetchedAt);
    const skewMs = Math.min(EXPIRY_SKEW_MS, Math.max(0, lifetimeMs / 4));
    return Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now() + skewMs;
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
    contextId: csrfState.contextId,
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
        contextId: payload.contextId || null,
        fetchedAt: new Date().toISOString()
    };

    return getTokenState();
}

const fetchCsrfToken = async (startedGeneration, startedOwner) => {
    const response = await csrfClient.get(normalizeUrl(DAC_AUTH_CSRF), {
        withCredentials: true
    });
    const payload = normalizeCsrfPayload(response.data);

    if (startedGeneration !== generation || !isCurrentAuthorization(startedOwner, store)) {
        throw authorizationChangedError();
    }

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

        synchronizeContext();
        if (pending) return pending;

        if(!options.force && hasUsableToken()) {
            return getTokenState();
        }

        const flight = fetchCsrfToken(generation, owner);
        pending = flight;
        try {
            return await flight;
        } finally {
            if (pending === flight) pending = null;
        }
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
        clearState();
    },

    getRequestContext() {
        synchronizeContext();
        return { generation, owner, contextId: csrfState.contextId, headerName: csrfState.headerName || DEFAULT_CSRF_HEADER };
    },

    isCurrentContext(context) {
        return Boolean(context && context.generation === generation && isCurrentAuthorization(context.owner, store));
    },

    getCsrfState() {
        return getSafeState();
    }
}
