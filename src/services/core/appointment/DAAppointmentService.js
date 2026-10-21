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
    async doctors() {
        return DACore.get(DAC_APPOINTMENT_CONFIG_GET.replace(/\/config$/, '/doctors'));
    },

    async getConfig(doctorProfileId) {
        try {
            const query = doctorProfileId ? `?doctor_profile_id=${encodeURIComponent(doctorProfileId)}` : '';
            return await DACore.get(`${DAC_APPOINTMENT_CONFIG_GET}${query}`);
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

    async saveTimezone(timezone, revision) {
        try {
            return await DACore.post(`${DAC_APPOINTMENT_CONFIG_GET}/timezone`, { timezone, revision });
        } catch (error) {
            return error.response && error.response.data ? error.response.data : { success: false, message: 'No se pudo guardar la zona horaria. Reintenta.' };
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

    async save(appointment, options = {}) {
        try {
            return DACore.post(DAC_APPOINTMENT_SAVE, {
                appointment,
                ...(options.requestId || appointment.requestId ? { request_id: options.requestId || appointment.requestId } : {}),
                ...(options.syncFollowUp ? { sync_follow_up: true } : {}),
                ...(options.explicitNewFollowUp ? { explicit_new_follow_up: true } : {})
            });
        } catch (error) {
            return error.response.data;
        }
    },

    async reschedule(appointment, requestId) {
        return DACore.post(DAC_APPOINTMENT_SAVE.replace(/\/save$/, '/reschedule'), { appointment, request_id: requestId });
    },
    async get(id) {
        return DACore.get(DAC_APPOINTMENT_SAVE.replace(/\/save$/, '/' + encodeURIComponent(id)));
    },
    async audit(id, before) {
        return DACore.get(DAC_APPOINTMENT_SAVE.replace(/\/save$/, '/' + encodeURIComponent(id) + '/audit') + (before ? '?before=' + encodeURIComponent(before) : ''));
    },
    async configImpact(config) {
        return DACore.post(DAC_APPOINTMENT_CONFIG_GET + '/impact', { config });
    },
    async delete(idAppointment, revision) {
        try {
            return DACore.delete(DAC_APPOINTMENT_DELETE, { id_appointment: idAppointment, revision });
        } catch (error) {
            return error.response.data;
        }
    }
}
