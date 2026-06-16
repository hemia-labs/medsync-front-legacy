import { DAC_ROL_LIST, DAC_ROL_PERMISSIONS } from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite listar los roles de usuario
     * @returns 
     */
    getRoles() {
        return DACore.get(DAC_ROL_LIST);
    },

    getPermissions(idRol) {
        return DACore.get(DAC_ROL_PERMISSIONS + idRol);
    },

    savePermissions(idRol, permissions) {
        return DACore.put(DAC_ROL_PERMISSIONS + idRol, { permissions });
    }
}
