import { DAC_ADD_OTREATMENT, DAC_GET_OTREATMENT, DAC_DELETE_OTREATMENT,DAC_UPD_OTREATMENT, DAC_TRATAMENT_GET, DAC_TRATAMENT_SAVED, DAC_TREATMENT_PLAN_GET, DAC_TREATMENT_PLAN_CREATE, DAC_TREATMENT_PLAN_CLOSE, DAC_TREATMENT_PLAN_SAVE_TREATMENT, DAC_TREATMENT_PLAN_STATUS, DAC_TREATMENT_PLAN_DELETE_TREATMENT, DAC_TREATMENT_PLAN_CONSENT_SAVE} from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que guarda una Tratamiento [OTROS]
     * 
     * @returns 
     */
    async saveOTreatment(data) {
        return DACore.post(DAC_ADD_OTREATMENT,data);
    },

    /**
     * Función que edita una Tratamiento [OTROS]
     * 
     * @returns 
     */
        async editOTreatment(data) {
            return DACore.put(DAC_UPD_OTREATMENT,data);
        },

    /**
     * Función que obtiene los tratamientos [OTROS]
     * 
     * @returns 
     */
    async getOTreatment(data) {
        return DACore.get(DAC_GET_OTREATMENT + data);
    },

    /**
     * Función que elimina una tratamiento [OTROS]
     * 
     * @returns 
     */
    async deleteOTreatment(data) {
        return DACore.delete(DAC_DELETE_OTREATMENT,data);
    },

    /**
     * Función que permite obtener el tratamiento
     * @param {*} id ID del paciente
     * @returns 
     */
    async getTratament(id) {
        return DACore.get(DAC_TRATAMENT_GET + id);
    },
    /**
     * Función que permite actualizar los datos del tratamiento
     * @param {*} data Modelo del tratamiento
     * @returns 
     */
    async saveTratament(data) {
        return DACore.post(DAC_TRATAMENT_SAVED, data);
    },

    async getTreatmentPlan(idPerson) {
        return DACore.get(DAC_TREATMENT_PLAN_GET + idPerson);
    },

    async createTreatmentPlan(data) {
        return DACore.post(DAC_TREATMENT_PLAN_CREATE, data);
    },

    async closeTreatmentPlan(data) {
        return DACore.post(DAC_TREATMENT_PLAN_CLOSE, data);
    },

    async savePlanTreatment(data) {
        return DACore.post(DAC_TREATMENT_PLAN_SAVE_TREATMENT, data);
    },

    async changePlanTreatmentStatus(data) {
        return DACore.post(DAC_TREATMENT_PLAN_STATUS, data);
    },

    async deletePlanTreatment(data) {
        return DACore.delete(DAC_TREATMENT_PLAN_DELETE_TREATMENT, { data });
    },

    async saveTreatmentPlanConsent(data) {
        return DACore.post(DAC_TREATMENT_PLAN_CONSENT_SAVE, data);
    }

}
