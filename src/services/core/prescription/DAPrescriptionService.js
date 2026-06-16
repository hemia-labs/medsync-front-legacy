import {
    DAC_PRESCRIPTION_CONFIG_GET,
    DAC_PRESCRIPTION_CONFIG_SAVE,
    DAC_PRESCRIPTION_LIST,
    DAC_PRESCRIPTION_PATIENT,
    DAC_PRESCRIPTION_DOCTORS,
    DAC_PRESCRIPTION_GET,
    DAC_PRESCRIPTION_SAVE,
    DAC_PRESCRIPTION_ISSUE,
    DAC_PRESCRIPTION_CANCEL,
    DAC_PRESCRIPTION_DELETE_DRAFT,
    DAC_PRESCRIPTION_AUDIT_ACTION
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

const buildQuery = (params) => {
    const query = new URLSearchParams(params || {}).toString();
    return query ? `?${query}` : '';
};

export default {
    getConfig() {
        return DACore.get(DAC_PRESCRIPTION_CONFIG_GET);
    },

    saveConfig(config) {
        return DACore.post(DAC_PRESCRIPTION_CONFIG_SAVE, config);
    },

    list(params) {
        return DACore.get(`${DAC_PRESCRIPTION_LIST}${buildQuery(params)}`);
    },

    listByPatient(idPerson, params) {
        return DACore.get(`${DAC_PRESCRIPTION_PATIENT}${idPerson}${buildQuery(params)}`);
    },

    doctors() {
        return DACore.get(DAC_PRESCRIPTION_DOCTORS);
    },

    getById(idPrescription) {
        return DACore.get(`${DAC_PRESCRIPTION_GET}${idPrescription}`);
    },

    save(prescription) {
        return DACore.post(DAC_PRESCRIPTION_SAVE, { prescription });
    },

    issue(idPrescription) {
        return DACore.post(DAC_PRESCRIPTION_ISSUE, { id_prescription: idPrescription });
    },

    cancel(idPrescription, reason) {
        return DACore.post(DAC_PRESCRIPTION_CANCEL, {
            id_prescription: idPrescription,
            reason
        });
    },

    auditAction(idPrescription, action, metadata = null) {
        return DACore.post(DAC_PRESCRIPTION_AUDIT_ACTION, {
            id_prescription: idPrescription,
            action,
            metadata
        });
    },

    deleteDraft(idPrescription) {
        return DACore.delete(DAC_PRESCRIPTION_DELETE_DRAFT, {
            data: {
                id_prescription: idPrescription
            }
        });
    }
};
