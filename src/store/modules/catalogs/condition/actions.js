import { DAConditionService } from '../../../../services/context/core-proccess-context';
import types from '../../common/mutation-types';

const actions = {

    /**
     *  Función que permite listar los tipos de familiares
     * @param {*} param0 
     */
    async getConditions({commit}) {
        let response = await DAConditionService.getConditions();
        if(response.success) {
            commit(types.SET_CONDITIONS, response.data)
        }
    }

}

export default actions