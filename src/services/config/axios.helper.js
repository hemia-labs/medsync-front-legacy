import Vue from 'vue';
import DACsrfService from '../core/auth/DACsrfService';
import { getSafeAuthClientConfigSummary, isCsrfEnabled, isD2AuthMode } from './authTransport.config';

const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

const isMutatingMethod = (method) => MUTATING_METHODS.includes(String(method).toLowerCase());

const getLegacyAuthorizationConfig = () => {
    const token = Vue.prototype.$session ? Vue.prototype.$session.get('token') : null;
    return token ? {headers: {'Authorization': token}} : {}
}

const removeAuthorizationHeader = (headers = {}) => {
    const nextHeaders = {...headers};

    delete nextHeaders.Authorization;
    delete nextHeaders.authorization;

    return nextHeaders;
}

const mergeHeaders = (baseHeaders = {}, extraHeaders = {}) => ({
    ...baseHeaders,
    ...extraHeaders
});

const hasHeaders = (headers = {}) => Object.keys(headers).length > 0;

const buildLegacyConfig = (baseConfig = {}) => {
    const legacyConfig = getLegacyAuthorizationConfig();
    const headers = mergeHeaders(baseConfig.headers, legacyConfig.headers);
    const config = {
        ...baseConfig,
        ...legacyConfig,
        headers
    };

    if(!hasHeaders(config.headers)) {
        delete config.headers;
    }

    return config;
}

const buildD2Config = async (method, baseConfig = {}) => {
    const config = {
        ...baseConfig,
        withCredentials: true,
        headers: removeAuthorizationHeader(baseConfig.headers)
    };

    if(isCsrfEnabled() && isMutatingMethod(method)) {
        config.headers = mergeHeaders(config.headers, await DACsrfService.getCsrfHeader());
    }

    if(!hasHeaders(config.headers)) {
        delete config.headers;
    }

    return config;
}

export default {

    /**
     * Permite obtener el token del storage
     * @returns 
     */
    getToken() {
        if(isD2AuthMode()) {
            return {};
        }

        return getLegacyAuthorizationConfig();
    },

    async buildRequestConfig(method, baseConfig = {}) {
        return isD2AuthMode()
            ? buildD2Config(method, baseConfig)
            : buildLegacyConfig(baseConfig);
    },

    getAuthClientModeSummary() {
        return getSafeAuthClientConfigSummary();
    },

    isMutatingMethod(method) {
        return isMutatingMethod(method);
    }
}
