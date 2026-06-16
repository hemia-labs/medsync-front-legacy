import { DAFamilyPathService } from '../../../../services/context/core-proccess-context';
import types from '../../common/mutation-types';

const actions = {

    /**
     *  Función que permite listar los tipos de familiares
     * @param {*} param0 
     */
    async getFamilyPath({commit}) {
        let response = await DAFamilyPathService.getFamilyPath();
        if(response.success) {
            commit(types.SET_FAMILY_PATH, response.data)
        }
    }

}

export default actions