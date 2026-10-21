import { notifyPulseWrite } from '../../domain/pulse/pulseWrites';
import axiosHelper from "./axios.helper";
import context from "./axios.config";
import httpstatus from "../../utils/common/httpstatus";
import { ResultData } from "../../models/global/resultdata.model";
import store from '../../store';
import { authorizationContext, isCurrentAuthorization, authorizationChangedError, isAuthControlRequest } from '../../security/authorizationContext';

const buildResponse = (result) => {
    if(result && result.status >= httpstatus.SUCESS && result.status < 300) {
        return {...result.data, success: true}
    }

    return new ResultData()
}

const buildErrorResponse = (error) => ({
    ...(error.response && error.response.data ? error.response.data : {}),
    success: false,
    message: error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : 'No fue posible completar la solicitud.'
})

const normalizeUrl = (url) => url ? url.replace(/^\/+/, '') : url;

const request = async (method, url, payload, requestConfig = {}) => {
    try {
        const endpoint = normalizeUrl(url);
        const authContext = isAuthControlRequest(endpoint) ? null : authorizationContext(store);
        const config = await axiosHelper.buildRequestConfig(method, requestConfig);
        if(!isCurrentAuthorization(authContext, store)) throw authorizationChangedError();
        config.authorizationContext = authContext;
        let result = null;

        if(method === 'get') {
            result = await context.core.get(endpoint, config);
        } else if(method === 'delete') {
            result = await context.core.delete(endpoint, {data: payload, ...config});
        } else {
            result = await context.core[method](endpoint, payload, config);
        }

        if(!isCurrentAuthorization(authContext, store)) throw authorizationChangedError();
        notifyPulseWrite(store,method,endpoint,result);
        return buildResponse(result)
    } catch (error) {
        return buildErrorResponse(error)
    }
}

export default {

     /**
     * Realiza una petición de tipo get a la url indicada
     * @param {String} url url 
     * @author Marco Antonio Saraos Hernandez
     * @author Cristian Eduardo Mendez Iglesias
     * @author Humberto Trinidad Dominguez
     * @returns Object
     */
    async get(url, requestConfig = {}) {
        return request('get', url, null, requestConfig)
    },

     /**
     * Realiza una petición de tipo post a la url indicando su carga util
     * @param {String} url url a enviar
     * @param {any} payload Carga Util
     * @author Marco Antonio Saraos Hernandez
     * @author Cristian Eduardo Mendez Iglesias
     * @author Humberto Trinidad Dominguez
     * @returns Object
     */
    async post(url, payload = {}, requestConfig = {}) {
        return request('post', url, payload, requestConfig)
    },

     /**
     * Realiza una petición de tipo put a la url indicando su carga util
     * @param {String} url url a enviar
     * @param {any} payload Carga Util
     * @author Marco Antonio Saraos Hernandez
     * @author Cristian Eduardo Mendez Iglesias
     * @author Humberto Trinidad Dominguez
     * @returns 
     */
    async put(url, payload = {}, requestConfig = {}) {
        return request('put', url, payload, requestConfig)
    },

    async patch(url, payload = {}, requestConfig = {}) {
        return request('patch', url, payload, requestConfig)
    },

    /**
     * Permite eliminar registros
     * @param {*} url url a enviar
     * @author Marco Antonio Saraos Hernandez
     * @author Cristian Eduardo Mendez Iglesias
     * @author Humberto Trinidad Dominguez
     */
    async delete(url, payload = {}, requestConfig = {}) {
        return request('delete', url, payload, requestConfig)
    }
}
