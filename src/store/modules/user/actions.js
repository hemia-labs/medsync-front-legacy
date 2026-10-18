import { DAUserService } from '../../../services/context/core-proccess-context';
import types from '../common/mutation-types';

const actions = {

    /**
     *  Función que permite listar los usuarios
     * @param {*} param0 
     */
    async getUsers({commit}) {
            let response = await DAUserService.getUsers();
            if(response.success) {
                commit(types.SET_USERS, response.data)
            }
            return response
    },

    /**
     * Función que permite recuperar unh usuario
     * @param {*} param0 
     * @param {*} id ID del usuario
     */
    async getUser({commit}, id) {
            commit(types.SET_USER, null)
            let response = await DAUserService.getUser(id);
            if(response.success) {
                commit(types.SET_USER, response.data)
            }
            return response
    },

    /**
     * Función para realizar el alta de usuarios o personal
     * @param {*} data Modelo de datos de usuario
     * @returns 
     */
    async save({commit}, data) {
            commit(types.SET_RESPONSE_SAVE, false)
            commit(types.SET_ERROR_SERVICE, false)
            commit(types.SET_ERROR_SERVICE_MESSAGE, '')
            commit(types.SET_ERROR_SERVICE_DETAILS, null)
            let response = await DAUserService.save(data);
            if(response.success) {
                commit(types.SET_RESPONSE_SAVE, true)
            }else {
                commit(types.SET_ERROR_SERVICE, true)
                commit(types.SET_ERROR_SERVICE_MESSAGE, response && response.message
                    ? response.message
                    : 'No fue posible guardar el usuario.')
                commit(types.SET_ERROR_SERVICE_DETAILS, response && response.data ? response.data : null)
            }
            return response
    },
    /**
     * Función que permite actualizar los datos del usuario
     * @param {*} id ID del usuario
     * @param {*} data Modelo de datos del usuario
     * @returns 
     */
    async update({dispatch, commit},  {data: data, id: id}) {
            commit(types.SET_ERROR_SERVICE, false)
            commit(types.SET_ERROR_SERVICE_MESSAGE, '')
            commit(types.SET_ERROR_SERVICE_DETAILS, null)
            let response = await DAUserService.update(id, data);
            if(response.success) {
                dispatch('getUsers')
            }else {
                commit(types.SET_ERROR_SERVICE, true)
                commit(types.SET_ERROR_SERVICE_MESSAGE, response && response.message
                    ? response.message
                    : 'No fue posible actualizar el usuario.')
                commit(types.SET_ERROR_SERVICE_DETAILS, response && response.data ? response.data : null)
            }
            return response
    }

}

export default actions
