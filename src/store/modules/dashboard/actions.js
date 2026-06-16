import { DAHomeService } from '../../../services/context/core-proccess-context';
import types from '../common/mutation-types';

const actions = {

    /**
     *  Función que permite listar los cumpleañeros del mes
     * @param {*} param0 
     */
    async getBirthdays({commit}) {
            let response = await DAHomeService.getBirthdays();
            if(response.success) {
                commit(types.SET_BIRTHDAYS, response.data)
            }
            return response;
    },

    /**
     *  Función que permite listar los pacientes segun un filtro
     * @param {*} param0 
     */
        async getPatients({commit},data) {
            let response = await DAHomeService.getPatients(data);
            if(response.success) {
                commit(types.SET_PATIENTS, response.data)
            } else {
                commit(types.SET_PATIENTS, [])
            }
            return response;
    },
}

export default actions
