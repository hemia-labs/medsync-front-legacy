import { DAC_ODONTOGRAM_GET_TOOTH, DAC_ODONTOGRAM_DETAIL_SAVE, DAC_ODONTOGRAM_UPDATE, DAC_ODONTOGRAM_TYPE_TOOTH, DAC_ODONTOGRAM_VALIDATE, DAC_ODONTOGRAM_PARENT_SAVE, DAC_ODONTOGRAM_DETAIL_GET, DAC_ODONTOGRAM_HISTORY_GET, DAC_ODONTOGRAM_STATUS, DAC_ODONTOGRAM_DELETE} from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite obtener el odontograma
     * 
     * @returns 
     */
    /**
     * Función que permite obtener los datos de un diente
     * @param {*} id  ID del diente
     * @param {*} id_person ID del PX
     * @returns 
     */
    async getTooth(id, id_person) {
        return DACore.get(DAC_ODONTOGRAM_GET_TOOTH + id_person + '/' + id);
    },

    /**
     * Función que permite guardar los datos y configuración de un diente
     * @param {*} data Modelo de los dientes
     * @returns 
     */
    async save(data) {
        return DACore.post(DAC_ODONTOGRAM_PARENT_SAVE, data);
    },

    async saveDetail(data) {
        return DACore.post(DAC_ODONTOGRAM_DETAIL_SAVE, data);
    },

    /**
     * Funcion que permite actualizar los datos de dien te y su config
     * @param {*} data  Modelo de los dientes
     * @returns 
     */
    async update(data) {
        return DACore.put(DAC_ODONTOGRAM_UPDATE, data);
    },

    /**
     * Función que permite obtener el catalogo de tipos de odontogramas
     * @returns 
     */
    async getTypeTooth() {
        return DACore.get(DAC_ODONTOGRAM_TYPE_TOOTH);
    },

    /**
     * Servicio que permite validar si un usuario cuenta o no con odontograma
     * @param {*} id 
     * @returns 
     */
    async validateOdontogram(id) {
        return DACore.get(DAC_ODONTOGRAM_VALIDATE + id);
    },

    /**
     * Servicio qe pemite obtener los detalle de odontogama
     * @param {*} id Identificador del px
     * @returns 
     */
    async getOdontogramDetail(id) {
        return DACore.get(DAC_ODONTOGRAM_DETAIL_GET + id);
    },

    /**
     * Servicio que permite obtener el historial de odontogramas
     * @param {*} id ID del px
     * @returns 
     */
    async getHistory(id) {
        return DACore.get(DAC_ODONTOGRAM_HISTORY_GET + id);
    },

    async status(data) {
        return DACore.put(DAC_ODONTOGRAM_STATUS, data);
    },

    async delete(data) {
        return DACore.delete(DAC_ODONTOGRAM_DELETE, data);
    },
}
