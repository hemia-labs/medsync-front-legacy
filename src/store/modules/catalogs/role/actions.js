import { DARolService } from '../../../../services/context/core-proccess-context';
import types from '../../common/mutation-types';

const actions = {

    /**
     *  Función que permite listar los roles de usuario
     * @param {*} param0 
     */
    async getRoles({commit}) {
        let response = await DARolService.getRoles();
        if(response.success) {
            commit(types.SET_ROLES, response.data)
        }
    },

    async getRolePermissions({commit}, idRol) {
        let response = await DARolService.getPermissions(idRol);
        if(response.success) {
            commit(types.SET_ROLE_PERMISSIONS, response.data)
        }
        else {
            commit(types.SET_ROLE_PERMISSIONS, [])
        }
    },

    async saveRolePermissions({commit}, payload) {
        let response = await DARolService.savePermissions(payload.idRol, payload.permissions);
        if(response.success) {
            commit(types.SET_SAVE_ROLE_PERMISSIONS, response.data)
            commit(types.SET_ROLE_PERMISSIONS, response.data)
        }
    }

}

export default actions
