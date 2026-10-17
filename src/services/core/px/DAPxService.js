import { DAC_PX_CREATE_MINIMAL, DAC_PX_SAVE, DAC_PX_BY_ID, DAC_PX_UPDATE, DAC_PX_DELETE, DAC_PX_SEARCH_FAST } from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    updateAllergies(data) { return DACore.put('api/px/allergies', data); },
    updateAdministrative(data) { return DACore.put('api/px/administrative', data); },
    restore(data) { return DACore.put('api/px/restore', data); },

    /**
     * Función que permite dar de alta un paciente
     * @returns 
     */
    async save(data) {
        return DACore.post(DAC_PX_SAVE, data);
    },
    async createMinimal(data) {
        return DACore.post(DAC_PX_CREATE_MINIMAL, data);
    },
    async searchFast(data, requestConfig = {}) {
        return DACore.post(DAC_PX_SEARCH_FAST, data, requestConfig);
    },
    /**
     * Función que permite actualizar los datos del paciente
     * @param {*} data Datos del paciente
     * @returns 
     */
    async update(data) {
        return DACore.put(DAC_PX_UPDATE, data);
    },


    /**
     * Función que permite recuperar el px por id
     * @param {*} id ID del px
     * @returns 
     */
    async getById(id) {
        return DACore.get(DAC_PX_BY_ID + id);
    },
    /**
     * Función que permite eliminar de forma logica al paciente(PX)
     * @param {*} data 
     * @returns 
     */
    async remove(data) {
        return DACore.delete(DAC_PX_DELETE, data);
    }


}
