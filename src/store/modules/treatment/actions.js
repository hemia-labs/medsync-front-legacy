import { DATreatmentService } from '../../../services/context/core-proccess-context';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import types from '../common/mutation-types';
import fnTypes from '../common/fn-types';

let planRequest = 0;
let currentPatient = '';

const actions = {

    /**
     *  Función que permite Agregar una nueva cita
     * @param {*} param0 
     */
    async saveOTreatment({commit},data) {
            let response = await DATreatmentService.saveOTreatment(data);
            if(response.success) {
                commit(types.SET_ADD_OTREATMENT, response.data)
                commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel() )
            }
            else {
                commit(types.SET_ADD_OTREATMENT,[])
                commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message) )
            }
    },

    /**
     *  Función que permite Agregar una nueva cita
     * @param {*} param0 
     */
    async editOTreatment({commit},data) {
        let response = await DATreatmentService.editOTreatment(data);
        if(response.success) {
            commit(types.SET_UPD_OTREATMENT, response.data)
            commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_UPD_OTREATMENT,[])
            commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    /**
     *  Función que lista citas
     * @param {*} param0 
     */
    async getOTreatment({commit},data) {
        let response = await DATreatmentService.getOTreatment(data);
        if(response.success) {
            commit(types.SET_GET_OTREATMENT, response.data)
            commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_GET_OTREATMENT,[])
            commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },
    /**
     * Función que permite obtener el tratamiento del paciente
     * @param {*} param0 
     * @param {*} id ID del PX
     */
    async getTratament({commit}, id) {
        let response = await DATreatmentService.getTratament(id);
        if(response.success) {
            commit(types.SET_TRATAMENT, response.data)
        }
    },
    /**
     * Función que permite actualizar los datos del tratamiento
     * @param {*} param0 
     * @param {*} data 
     */
    async saveTratament({dispatch, commit}, data) {
        let response = await DATreatmentService.saveTratament(data);
        if(!response.success) {
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }else {
            dispatch(fnTypes.getTratament, data.id_person)
        }
    },

    /**
     *  Función que elimina citas
     * @param {*} param0 
     */
    async deleteOTreatment({commit},data) {
        let response = await DATreatmentService.deleteOTreatment(data);
        if(response.success) {
            commit(types.SET_OTREATMENT_EXCEPTION, response.data)
            commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_DELETE_OTREATMENT,[])
            commit(types.SET_OTREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    async getTreatmentPlan({commit}, idPerson) {
        const revision = ++planRequest;
        currentPatient = idPerson;
        commit(types.SET_TREATMENT_PLAN, null);
        try {
            const response = await DATreatmentService.getTreatmentPlan(idPerson);
            if(revision === planRequest) {
                if(response.success) commit(types.SET_TREATMENT_PLAN, response.data);
                commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(!response.success, response.message));
            }
            return response;
        } catch(error) {
            if(revision === planRequest) commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, 'No se pudo consultar el plan.'));
            throw error;
        }
    },
    ...Object.fromEntries(['createTreatmentPlan', 'updateTreatmentPlan', 'closeTreatmentPlan', 'savePlanTreatment', 'changePlanTreatmentStatus', 'deletePlanTreatment', 'saveTreatmentPlanConsent'].map(name => [name, async function({commit}, data) {
        const response = await DATreatmentService[name](data);
        if(data.id_person === currentPatient) {
            if(response.success && response.data && response.data.patient) commit(types.SET_TREATMENT_PLAN, response.data);
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(!response.success, response.message));
        }
        // Mutation endpoints return the updated DTO; avoid an extra read after every save.
        return response;
    }]))
}

export default actions
