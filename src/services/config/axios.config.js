import axios from 'axios';
import context from './axios.url';
import { handleSuccess, handleError } from './axios.interceptor'

let core = axios.create({baseURL: context.APP_CORE_URL});
core.interceptors.response.use(handleSuccess, error => handleError(error, config => core.request(config)))

export default {
    core
}
