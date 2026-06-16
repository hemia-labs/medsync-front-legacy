import axios from 'axios';
import context from './axios.url';
import { handleSuccess, handleError } from './axios.interceptor'

let core = axios.create({baseURL: context.APP_CORE_URL});
core.interceptors.response.use(handleSuccess, handleError)

export default {
    core
}