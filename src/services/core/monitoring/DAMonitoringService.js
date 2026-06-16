import { DAC_ADD_MONITORING, DAC_GET_MONITORING, DAC_DELETE_MONITORING, DAC_GET_ALL_MONITORING,DAC_GET_PX_TREATMENT,DAC_UPD_MONITORING} from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que guarda una proxima cíta
     * 
     * @returns 
     */
    async saveTracing(data) {
        try {
            return DACore.post(DAC_ADD_MONITORING,data);
        } catch (error) {
            return error.response.data;
        }
    },

    /**
     * Función que EDITA una proxima cíta
     * 
     * @returns 
     */
        async updTracing(data) {
            try {
                return DACore.put(DAC_UPD_MONITORING,data);
            } catch (error) {
                return error.response.data;
            }
        },

    /**
     * Función que guarda una proxima cíta
     * 
     * @returns 
     */
    async getTracing(data) {
        try {
            return DACore.get(DAC_GET_MONITORING + data);
        } catch (error) {
            return error.response.data;
        }
    },

    /**
     * Función que elimina una proxima cíta
     * 
     * @returns 
     */
    async deleteTracing(data) {
        try {
            return DACore.delete(DAC_DELETE_MONITORING,data);
        } catch (error) {
            return error.response.data;
        }
    },

    /**
     * Función que lista las proximas citas
     * 
     * @returns 
     */
    async getAllTracing() {
        try {
            return DACore.get(DAC_GET_ALL_MONITORING);
        } catch (error) {
            return error.response.data;
        }
    },

    
    /**
     * Función que lista el tratamiento de la proxima cita
     * 
     * @returns 
     */
    async getAllPxTreatment(data) {
        try {
            return DACore.get(DAC_GET_PX_TREATMENT + data);
        } catch (error) {
            return error.response.data;
        }
    },

}