import {
    DAC_USER_SAVE,
    DAC_USER_LIST,
    DAC_USER_UPDATE,
    DAC_USER_GET,
    DAC_USER_PROFESSIONAL_PROFILE,
    DAC_USER_PROFESSIONAL_PROFILE_ME
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite listar los usuarios
     * @returns 
     */
    getUsers() {
        return DACore.get(DAC_USER_LIST);
    },
    /**
     * Función que recupera los datos de un usuario
     * @param {*} id 
     * @returns 
     */
    getUser(id) {
        return DACore.get(DAC_USER_GET + id);
    },

    /**
     * Función para realizar el alta de usuarios o personal
     * @param {*} data Modelo de datos de usuario
     * @returns 
     */
    save(data) {
        return DACore.post(DAC_USER_SAVE, data);
    },
    /**
     * Función que permite actualizar los datos del usuario
     * @param {*} id ID del usuario
     * @param {*} data Modelo de datos del usuario
     * @returns 
     */
    update(id, data) {
        return DACore.put(DAC_USER_UPDATE + id, data);
    },

    getProfessionalProfile(id) {
        return DACore.get(DAC_USER_PROFESSIONAL_PROFILE + id);
    },

    getMyProfessionalProfile() {
        return DACore.get(DAC_USER_PROFESSIONAL_PROFILE_ME);
    },

    saveProfessionalProfile(id, data) {
        return DACore.post(DAC_USER_PROFESSIONAL_PROFILE + id, data);
    }
}
