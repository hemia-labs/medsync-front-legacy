import { DAPrescriptionService } from '../../../services/context/core-proccess-context';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import types from '../common/mutation-types';

const setResponseError = (commit, response) => {
    commit(types.SET_PRESCRIPTION_ERROR, response && response.success
        ? new DAHasErrorModel()
        : new DAHasErrorModel(true, response ? response.message : 'No fue posible completar la solicitud.')
    );
};

const actions = {
    async getPrescriptionConfig({commit}) {
        const response = await DAPrescriptionService.getConfig();
        if(response.success) {
            commit(types.SET_PRESCRIPTION_CONFIG, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async savePrescriptionConfig({commit}, data) {
        const response = await DAPrescriptionService.saveConfig(data);
        if(response.success) {
            commit(types.SET_PRESCRIPTION_CONFIG, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async getPrescriptions({commit}, params) {
        const response = await DAPrescriptionService.list(params);
        if(response.success) {
            commit(types.SET_PRESCRIPTIONS, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async getPatientPrescriptions({commit}, idPerson) {
        const response = await DAPrescriptionService.listByPatient(idPerson);
        if(response.success) {
            commit(types.SET_PRESCRIPTIONS, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async getPrescription({commit}, idPrescription) {
        const response = await DAPrescriptionService.getById(idPrescription);
        if(response.success) {
            commit(types.SET_PRESCRIPTION, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async savePrescription({commit}, data) {
        const response = await DAPrescriptionService.save(data);
        if(response.success) {
            commit(types.SET_PRESCRIPTION, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async issuePrescription({commit}, idPrescription) {
        const response = await DAPrescriptionService.issue(idPrescription);
        if(response.success) {
            commit(types.SET_PRESCRIPTION, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async cancelPrescription({commit}, {id, reason}) {
        const response = await DAPrescriptionService.cancel(id, reason);
        if(response.success) {
            commit(types.SET_PRESCRIPTION, response.data);
        }
        setResponseError(commit, response);
        return response;
    },

    async deleteDraftPrescription({commit}, idPrescription) {
        const response = await DAPrescriptionService.deleteDraft(idPrescription);
        setResponseError(commit, response);
        return response;
    },

    async getPrescriptionDoctors({commit}) {
        const response = await DAPrescriptionService.doctors();
        if(response.success) {
            commit(types.SET_PRESCRIPTION_DOCTORS, response.data);
        }
        setResponseError(commit, response);
        return response;
    },
};

export default actions;
