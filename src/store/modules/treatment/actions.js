import { DATreatmentService } from '../../../services/context/core-proccess-context';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import types from '../common/mutation-types';
import fnTypes from '../common/fn-types';

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
        let response = await DATreatmentService.getTreatmentPlan(idPerson);
        if(response.success) {
            commit(types.SET_TREATMENT_PLAN, response.data)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel())
        } else {
            commit(types.SET_TREATMENT_PLAN, null)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }
        return response;
    },

    async createTreatmentPlan({dispatch, commit}, data) {
        let response = await DATreatmentService.createTreatmentPlan(data);
        if(response.success) {
            commit(types.SET_TREATMENT_PLAN, response.data)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel())
        } else {
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }
        if(data && data.id_person) {
            await dispatch(fnTypes.getTreatmentPlan, data.id_person)
        }
        return response;
    },

    async closeTreatmentPlan({dispatch, commit}, data) {
        let response = await DATreatmentService.closeTreatmentPlan(data);
        if(response.success) {
            commit(types.SET_TREATMENT_PLAN, response.data)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel())
        } else {
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }
        if(data && data.id_person) {
            await dispatch(fnTypes.getTreatmentPlan, data.id_person)
        }
        return response;
    },

    async savePlanTreatment({dispatch, commit}, data) {
        let response = await DATreatmentService.savePlanTreatment(data);
        if(response.success) {
            commit(types.SET_TREATMENT_PLAN, response.data)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel())
        } else {
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }
        if(data && data.id_person) {
            await dispatch(fnTypes.getTreatmentPlan, data.id_person)
        }
        return response;
    },

    async changePlanTreatmentStatus({dispatch, commit}, data) {
        let response = await DATreatmentService.changePlanTreatmentStatus(data);
        if(response.success) {
            commit(types.SET_TREATMENT_PLAN, response.data)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel())
        } else {
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }
        if(data && data.id_person) {
            await dispatch(fnTypes.getTreatmentPlan, data.id_person)
        }
        return response;
    },

    async deletePlanTreatment({dispatch, commit}, data) {
        let response = await DATreatmentService.deletePlanTreatment(data);
        if(response.success) {
            commit(types.SET_TREATMENT_PLAN, response.data)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel())
        } else {
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }
        if(data && data.id_person) {
            await dispatch(fnTypes.getTreatmentPlan, data.id_person)
        }
        return response;
    },

    async saveTreatmentPlanConsent({dispatch, commit}, data) {
        let response = await DATreatmentService.saveTreatmentPlanConsent(data);
        if(response.success) {
            commit(types.SET_TREATMENT_PLAN, response.data)
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel())
        } else {
            commit(types.SET_TREATMENT_EXCEPTION, new DAHasErrorModel(true, response.message))
        }
        if(data && data.id_person) {
            await dispatch(fnTypes.getTreatmentPlan, data.id_person)
        }
        return response;
    },

}

export default actions
