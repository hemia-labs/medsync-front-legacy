import {
    DAC_APPOINTMENT_CONFIG_GET,
    DAC_APPOINTMENT_CONFIG_SAVE,
    DAC_APPOINTMENT_LIST,
    DAC_APPOINTMENT_PATIENT_HISTORY,
    DAC_APPOINTMENT_SAVE,
    DAC_APPOINTMENT_DELETE
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    async getConfig() {
        try {
            return DACore.get(DAC_APPOINTMENT_CONFIG_GET);
        } catch (error) {
            return error.response.data;
        }
    },

    async saveConfig(config) {
        try {
            return DACore.post(DAC_APPOINTMENT_CONFIG_SAVE, { config });
        } catch (error) {
            return error.response.data;
        }
    },

    async list(params) {
        try {
            const query = new URLSearchParams(params || {}).toString();
            return DACore.get(query ? `${DAC_APPOINTMENT_LIST}?${query}` : DAC_APPOINTMENT_LIST);
        } catch (error) {
            return error.response.data;
        }
    },

    async patientHistory(patientId, params) {
        try {
            const query = new URLSearchParams(params || {}).toString();
            const url = DAC_APPOINTMENT_PATIENT_HISTORY(patientId);
            return DACore.get(query ? `${url}?${query}` : url);
        } catch (error) {
            return error.response.data;
        }
    },

    async save(appointment) {
        try {
            return DACore.post(DAC_APPOINTMENT_SAVE, { appointment });
        } catch (error) {
            return error.response.data;
        }
    },

    async delete(idAppointment) {
        try {
            return DACore.delete(DAC_APPOINTMENT_DELETE, { id_appointment: idAppointment });
        } catch (error) {
            return error.response.data;
        }
    }
}
