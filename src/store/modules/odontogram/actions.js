import DAToothConfigModel from '../../../models/odontogram/DAToothConfig.model';
import { DAOdontogramService } from '../../../services/context/core-proccess-context';
import types from '../common/mutation-types';
import fnTypes from '../common/fn-types';
import DAOdontogramDetailModel from '../../../models/odontogram/DAOdontogramDetail.model';

const actions = {

    async initOdontogram({dispatch, commit, state}, {id: id}) {
        if(!state.id_odontogram)  {
            commit(types.SET_ODONTOGRAM_ID, "")
        }
       
        dispatch(fnTypes.getTypeTooth, {});
        dispatch(fnTypes.validateOdontogram, id);
    },

    async validateOdontogram({commit, dispatch}, id) {
        let response = await DAOdontogramService.validateOdontogram(id)
        if(response.success) {
            commit(types.SET_ODONTOGRAM_ID, response.data.id_odontogramv1)
            commit(types.SET_ODONTOGRAM_TYPE_CODE, response.data.active ? response.data.type : "")
            if(response.data.id_odontogramv1) {
                dispatch(fnTypes.getOdontogram, {id: id});
            }
        }else {
            commit(types.SET_ODONTOGRAM_ID, null)
            commit(types.SET_ODONTOGRAM_TYPE_CODE, null)
        }
    },

    /**
     *  Función que permite obtener los datos del odontograma
     * @param {*} param0 
     */
    async getOdontogram({commit}, {id: id}) {
            let response = await DAOdontogramService.getOdontogramDetail(id)
            if(response.success) {
                response.data =  response.data.sort((a, b) => {
                    const orderReference = [28, 27, 26, 25, 24, 23, 22, 21, 18, 17, 16, 15, 14, 13, 12, 11, 38, 37, 36, 35, 34, 33, 32, 31, 48, 47, 46, 45, 44, 43, 42, 41];
                    return orderReference.indexOf(a.sec) - orderReference.indexOf(b.sec);
                });
                commit(types.SET_ODONTOGRAM, response.data)
            }
    },

    async onGetOdontogramByID({commit}, {id: id}) {
            let response = await DAOdontogramService.getOdontogramDetail(id)
            if(response.success) {
                commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
                // commit(types.SET_ODONTOGRAM, response.data)
                // commit(types.SET_ODONTOGRAM_TYPE_CODE, response.data.code_cat_type_tooth)
            }
    },

    /**
     * Función que permite obtener los datos de un diente
     * @param {*} param0 
     * @param {*} param1 
     */
    async getTooth({commit}, {id: id, id_person: id_person}) {
            let response = await DAOdontogramService.getTooth(id, id_person)
            if(response.success) {
                if(response.data.config.length <= 0) {
                    response.data.config = [ new DAToothConfigModel() ]
                }
                commit(types.SET_ODONTOGRAM_TOOTH, response.data)
            }
    },

    /**
     * Función que permite obtener el catalogo de tipos de odontogramas
     * @param {*} param0 
     */
    async getTypeTooth({commit}) {
            let response = await DAOdontogramService.getTypeTooth()
            if(response.success) {
                commit(types.SET_ODONTOGRAM_TYPE_TOOTH, response.data)
            }
    },

    /**
     *  Función que permite guardar los datos y configuración de un diente
     * @param {*} param0 
     * @param {*} data 
     */
    async save({commit, dispatch}, data) {
            let response = await DAOdontogramService.save(data)
            if(response.success) {
                dispatch(fnTypes.validateOdontogram, data.id_person);
                commit(types.SET_ODONTOGRAM_ID, response.data.id_odontogramv1)
                commit(types.SET_ODONTOGRAM_TYPE_CODE, response.data.type)
                commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
            }
    },

    /**
     * Funcion que permite actualizar los datos de dien te y su config
     * @param {*} data  Modelo de los dientes
     * @returns 
     */
    async update({commit}, data) {
            let response = await DAOdontogramService.update(data)
            if(!response.success) {
                commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
            }
    },

    /**
     * Función para guardar o actualizar
     * @param {*} param0 
     * @param {*} data 
     */
    async onSaveTooth({dispatch}, data) {
        if(data.id_odontogram != '' && data.id_odontogram != null) {
            dispatch('update', data)
        }else {
            dispatch('save', data)
        }
    },

    async saveOdontograDetail({commit, dispatch}, {data: data, id_person: id_person}) {
        let response = await DAOdontogramService.saveDetail(data)
        if(response.success) {
            dispatch('getOdontogram', {id: id_person});
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
        }
    },

    async setOdontogramDetail({commit}, data) {
        if(data) {
            commit(types.SET_ODONTOGRAM_DETAIL, new DAOdontogramDetailModel(data.id_odontogram_detailv1, data.id_tooth, data.treatment)); // 
        }
    },

    async getOdontogramHistory({commit}, id_person) {
        let response = await DAOdontogramService.getHistory(id_person)
        if(response.success) {
            commit(types.SET_ODONTOGRAM_HISTORY, response.data)
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
        }else {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
        }
    },

    async status({commit,  dispatch}, {data: data, id: id}) {
        let response = await DAOdontogramService.status(data)
        if(response.success) {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
            dispatch('validateOdontogram', id);
            dispatch('getOdontogramHistory', id);
        }else {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
        }
    },

    async delete({commit,  dispatch}, {data: data, id: id}) {
        let response = await DAOdontogramService.delete(data)
        if(response.success) {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
            dispatch('validateOdontogram', id);
            dispatch('getOdontogramHistory', id);
        }else {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
        }
    },


}

export default actions