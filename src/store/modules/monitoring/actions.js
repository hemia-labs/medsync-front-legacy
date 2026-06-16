import { DAMonitoringService } from '../../../services/context/core-proccess-context';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import types from '../common/mutation-types';

const actions = {

    /**
     *  Función que permite Agregar una nueva cita
     * @param {*} param0 
     */
    async saveTracing({commit},data) {
            let response = await DAMonitoringService.saveTracing(data);
            if(response.success) {
                commit(types.SET_ADD_MONITORING, response.data)
                commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel() )
            }
            else {
                commit(types.SET_ADD_MONITORING,[])
                commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel(true, response.message) )
            }
    },

        /**
     *  Función que permite Editar una nueva cita
     * @param {*} param0 
     */
        async updTracing({commit},data) {
            let response = await DAMonitoringService.updTracing(data);
            if(response.success) {
                commit(types.SET_UPD_MONITORING, response.data)
                commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel() )
            }
            else {
                commit(types.SET_UPD_MONITORING,[])
                commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel(true, response.message) )
            }
    },

    /**
     *  Función que lista citas
     * @param {*} param0 
     */
    async getTracing({commit},data) {
        let response = await DAMonitoringService.getTracing(data);
        if(response.success) {
            commit(types.SET_GET_MONITORING, response.data)
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_GET_MONITORING,[])
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    /**
     *  Función que elimina citas
     * @param {*} param0 
     */
    async deleteTracing({commit},data) {
        let response = await DAMonitoringService.deleteTracing(data);
        if(response.success) {
            commit(types.SET_DELETE_MONITORING, response.data)
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_DELETE_MONITORING,[])
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    /**
     *  Función que lista todas las citas
     * @param {*} param0 
     */
    async getAllTracing({commit}) {
        let response = await DAMonitoringService.getAllTracing();
        if(response.success) {
            commit(types.SET_GET_ALL_MONITORING, response.data)
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_GET_ALL_MONITORING,[])
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    async getAllPxTreatment({commit},data) {
        let response = await DAMonitoringService.getAllPxTreatment(data);
        if(response.success) {
            commit(types.SET_GET_ALL_PX_TREATMENT, response.data)
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_GET_ALL_PX_TREATMENT,[])
            commit(types.SET_MONITORING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

}

export default actions