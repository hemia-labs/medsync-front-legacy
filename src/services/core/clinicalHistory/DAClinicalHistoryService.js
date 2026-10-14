import {
    DAC_CLINICAL_HISTORY_PATIENT,
    DAC_CLINICAL_HISTORY_GET,
    DAC_CLINICAL_HISTORY_DRAFT,
    DAC_CLINICAL_HISTORY_FINALIZE,
    DAC_CLINICAL_HISTORY_CANCEL
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getIntake(idPerson) {
        return DACore.get(`${DAC_CLINICAL_HISTORY_PATIENT}${idPerson}/intake`);
    },
    saveIntake(idPerson, data) {
        return DACore.put(`${DAC_CLINICAL_HISTORY_PATIENT}${idPerson}/intake`, data);
    },
    getByPatient(idPerson) {
        return DACore.get(DAC_CLINICAL_HISTORY_PATIENT + idPerson);
    },
    getVersionsByPatient(idPerson) {
        return DACore.get(`${DAC_CLINICAL_HISTORY_PATIENT}${idPerson}/versions`);
    },
    getById(idClinicalHistory) {
        return DACore.get(DAC_CLINICAL_HISTORY_GET + idClinicalHistory);
    },
    createDraft(data) {
        return DACore.post(DAC_CLINICAL_HISTORY_DRAFT, data);
    },
    updateDraft(idClinicalHistory, data) {
        return DACore.put(`${DAC_CLINICAL_HISTORY_GET}${idClinicalHistory}/draft`, data);
    },
    finalize(idClinicalHistory, expectedRevision) {
        return DACore.post(`${DAC_CLINICAL_HISTORY_FINALIZE}${idClinicalHistory}/finalize`, { expected_revision: expectedRevision });
    },
    markPrinted(idClinicalHistory) {
        return DACore.post(`${DAC_CLINICAL_HISTORY_GET}${idClinicalHistory}/printed`);
    },
    cancel(idClinicalHistory, data = {}) {
        return DACore.post(`${DAC_CLINICAL_HISTORY_CANCEL}${idClinicalHistory}/cancel`, data);
    }
};
