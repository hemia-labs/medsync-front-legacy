import { DAPatologicSectionService, DAPatologicalService } from '../../../../services/context/core-proccess-context';
import types from '../../common/mutation-types';
import fntypes from '../../common/fn-types';

const actions = {

    /**
     *  Función que permite listar el catalogo se secciones patologicas
     * @param {*} param0 
     */
    async getSections({commit}) {
        let response = await DAPatologicSectionService.getPatologicSections();
        if(response.success) {
            commit(types.SET_PATOLOGIC_SECTIONS, response.data)
        }
    },
    async getPatological({commit}) {
        let response = await DAPatologicalService.getPatological();
        if(response.success) {
            commit(types.SET_PATOLOGICAL_QA, response.data)
        }
    },

    /**
     * Función que ejecuta los servicios de datos patologicos
     * @param {*} param0 
     */
    async getPatologicInfo({dispatch}) {
        dispatch(fntypes.getPatological);
    }


}

export default actions