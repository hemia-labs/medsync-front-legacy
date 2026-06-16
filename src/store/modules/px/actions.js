import { DAPxService, DAFileService } from '../../../services/context/core-proccess-context';
import types from '../common/mutation-types';
import fnTypes from '../common/fn-types';

const actions = {

    /**
     * Función para realizar el alta de pacientes
     * @param {*} data Modelo de datos de paciente
     * @returns 
     */
    async save({commit}, data) {
            let response = await DAPxService.save(data);
            if(!response.success) {
                commit(types.SET_ERROR_SERVICE, true)
            }else {
               // window.location.href = '/px/history/'+response.data.id_person
               commit(types.SET_PX_ID_PERSON, response.data.id_person)
               commit(types.SET_ERROR_SERVICE, false)
            }
            return response;
    },

    async createMinimal({commit}, data) {
            let response = await DAPxService.createMinimal(data);
            if(!response.success) {
                commit(types.SET_ERROR_SERVICE, true)
            }else {
               commit(types.SET_PX_ID_PERSON, response.data.id_person)
               commit(types.SET_ERROR_SERVICE, false)
            }
            return response;
    },
    
     /**
     * Función que permite actualizar los datos del paciente
     * @param {*} data Datos del paciente
     * @returns 
     */
    async update({commit, dispatch}, data) {
            let response = await DAPxService.update(data);
            if(response.success) {
                dispatch(fnTypes.getById, data.person.id_person)
            }
            commit(types.SET_ERROR_SERVICE, response.success ? false : true)
            return response;
    },

    /**
     * Función que permite obtener px por ID
     * @param {*} param0 
     * @param {*} id ID del px
     */
    async getById({commit}, id) {
            let response = await DAPxService.getById(id);
            if(response.success) {
                commit(types.SET_PX, response.data)
            }
            return response;
    },
    /**
     * Función que permite eliminar de forma logica al paciente (PX)
     * @param {*} param0 
     * @param {*} id 
     */
    /* eslint-disable */
    async remove({}, id) {
        let response = await DAPxService.remove({id_person: id});
        if(response.success) {
            window.location.href = '/'
        }
    },
    /**
     * Función que permite dar de alta una foto de perfil de px
     * @param {*} param0 
     * @param {*} data 
     */
    async uploadProfile({commit, dispatch}, {data, isnew}) {
        let response = await DAFileService.uploadProfile(data);
        commit(types.SET_ERROR_SERVICE, response.success ? false : true)
        if(response.success) {
            if(isnew) {
                window.location.href = `/px/history/${data.id_person}?tab=medical-history&fromCreatePatient=1`
            }else {
                dispatch('getById', data.id_person)
            }
        }
    }

}

export default actions;
