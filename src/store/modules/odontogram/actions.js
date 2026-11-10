import DAToothConfigModel from '../../../models/odontogram/DAToothConfig.model';
import { DAOdontogramService } from '../../../services/context/core-proccess-context';
import types from '../common/mutation-types';
import fnTypes from '../common/fn-types';
import DAOdontogramDetailModel from '../../../models/odontogram/DAOdontogramDetail.model';

// Each visit owns its pending requests, including when the same patient is reopened.
const patientRequests = new WeakMap();
const isCurrentRequest = (state, request, id) => {
    const current = patientRequests.get(state);
    return current === request && (!current || id === undefined || current.id === id);
};

const actions = {

    async initOdontogram({dispatch, commit, state}, {id: id}) {
        patientRequests.set(state, {id});
        commit(types.SET_ODONTOGRAM_ID, null);
        commit(types.SET_ODONTOGRAM_TYPE_CODE, null);
        commit(types.SET_ODONTOGRAM, []);
        commit(types.SET_ODONTOGRAM_HISTORY, []);
        commit(types.SET_ODONTOGRAM_TOOTH, null);
        commit(types.SET_ODONTOGRAM_DETAIL, null);
        commit(types.SET_ODONTOGRAM_EDIT, null);
        commit(types.SET_ODONTOGRAM_PREVIEW, null);
        commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false);

        const [catalog, odontogram] = await Promise.all([
            dispatch(fnTypes.getTypeTooth, {}),
            dispatch(fnTypes.validateOdontogram, id)
        ]);
        return !odontogram.success ? odontogram : (!catalog.success ? catalog : odontogram);
    },

    async validateOdontogram({commit, dispatch, state}, id) {
        const request = patientRequests.get(state);
        const response = await DAOdontogramService.validateOdontogram(id);
        if(!isCurrentRequest(state, request, id)) return response;
        if(response.success && response.data) {
            commit(types.SET_ODONTOGRAM_ID, response.data.id_odontogramv1 || null)
            commit(types.SET_ODONTOGRAM_TYPE_CODE, response.data.active ? response.data.type : "")
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
            if(response.data.id_odontogramv1) {
                const detail = await dispatch(fnTypes.getOdontogram, {id: id});
                if(!detail.success) return detail;
            }else {
                commit(types.SET_ODONTOGRAM, []);
            }
        }else {
            commit(types.SET_ODONTOGRAM_ID, null)
            commit(types.SET_ODONTOGRAM_TYPE_CODE, null)
            commit(types.SET_ODONTOGRAM, [])
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
            return {...response, success: false};
        }
        return response;
    },

    /**
     *  Función que permite obtener los datos del odontograma
     * @param {*} param0 
     */
    async getOdontogram({commit, state}, {id: id}) {
            const request = patientRequests.get(state);
            const response = await DAOdontogramService.getOdontogramDetail(id)
            if(!isCurrentRequest(state, request, id)) return response;
            if(response.success && Array.isArray(response.data)) {
                const teeth = [...response.data].sort((a, b) => {
                    const orderReference = [28, 27, 26, 25, 24, 23, 22, 21, 18, 17, 16, 15, 14, 13, 12, 11, 38, 37, 36, 35, 34, 33, 32, 31, 48, 47, 46, 45, 44, 43, 42, 41];
                    return orderReference.indexOf(a.sec) - orderReference.indexOf(b.sec);
                });
                commit(types.SET_ODONTOGRAM, teeth)
                commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
            }else {
                commit(types.SET_ODONTOGRAM, [])
                commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
                return {...response, success: false};
            }
            return response;
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
    async getTooth({commit, state}, {id: id, id_person: id_person}) {
            const request = patientRequests.get(state);
            let response = await DAOdontogramService.getTooth(id, id_person)
            if(!isCurrentRequest(state, request, id_person)) return response;
            if(response.success) {
                if(response.data.config.length <= 0) {
                    response.data.config = [ new DAToothConfigModel() ]
                }
                commit(types.SET_ODONTOGRAM_TOOTH, response.data)
            }
            return response;
    },

    /**
     * Función que permite obtener el catalogo de tipos de odontogramas
     * @param {*} param0 
     */
    async getTypeTooth({commit, state}) {
            const request = patientRequests.get(state);
            const response = await DAOdontogramService.getTypeTooth()
            if(!isCurrentRequest(state, request)) return response;
            if(response.success && Array.isArray(response.data)) {
                commit(types.SET_ODONTOGRAM_TYPE_TOOTH, response.data)
            }else {
                commit(types.SET_ODONTOGRAM_TYPE_TOOTH, [])
                return {...response, success: false};
            }
            return response;
    },

    /**
     *  Función que permite guardar los datos y configuración de un diente
     * @param {*} param0 
     * @param {*} data 
     */
    async save({commit, dispatch, state}, data) {
            const request = patientRequests.get(state);
            const response = await DAOdontogramService.save(data)
            if(!isCurrentRequest(state, request, data.id_person)) return response;
            if(response.success) {
                const saved = response.data || {};
                commit(types.SET_ODONTOGRAM_ID, saved.id_odontogramv1 || null)
                commit(types.SET_ODONTOGRAM_TYPE_CODE, saved.type)
                commit(types.SET_ODONTOGRAM, [])
                commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
                // A failed refresh must not turn a persisted creation into a retryable save.
                try {
                    const detail = saved.id_odontogramv1
                        ? await dispatch(fnTypes.getOdontogram, {id: data.id_person})
                        : await dispatch(fnTypes.validateOdontogram, data.id_person);
                    return {...response, refreshSuccess: detail.success, refreshMessage: detail.message};
                }catch(error) {
                    if(isCurrentRequest(state, request, data.id_person)) {
                        commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
                    }
                    return {...response, refreshSuccess: false, refreshMessage: error.message};
                }
            }else {
                commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
            }
            return response;
    },

    /**
     * Funcion que permite actualizar los datos de dien te y su config
     * @param {*} data  Modelo de los dientes
     * @returns 
     */
    async update({commit, state}, data) {
            const request = patientRequests.get(state);
            let response = await DAOdontogramService.update(data)
            if(!isCurrentRequest(state, request, data.id_person)) return response;
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, !response.success)
            return response;
    },

    /**
     * Función para guardar o actualizar
     * @param {*} param0 
     * @param {*} data 
     */
    async onSaveTooth({dispatch}, data) {
        if(data.id_odontogram != '' && data.id_odontogram != null) {
            return dispatch('update', data)
        }else {
            return dispatch('save', data)
        }
    },

    async saveOdontograDetail({commit, dispatch, state}, {data: data, id_person: id_person}) {
        const request = patientRequests.get(state);
        let response = await DAOdontogramService.saveDetail(data)
        if(!isCurrentRequest(state, request, id_person)) return response;
        if(response.success) {
            try {
                const detail = await dispatch('getOdontogram', {id: id_person});
                if(isCurrentRequest(state, request, id_person)) {
                    commit(types.SET_ODONTOGRAM_TOOTH_ERROR, !detail.success)
                }
                return {...response, refreshSuccess: detail.success, refreshMessage: detail.message};
            }catch(error) {
                if(isCurrentRequest(state, request, id_person)) commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true);
                return {...response, refreshSuccess: false};
            }
        }
        return response;
    },

    async setOdontogramDetail({commit, state}, data) {
        if(data) {
            const detail = new DAOdontogramDetailModel(data.id_odontogram_detailv1, data.id_tooth, data.treatment);
            // Freeze the chart and original text when opening the editor.
            detail.id_odontogramv1 = state.id_odontogram;
            detail.expected_treatment = data.treatment || null;
            commit(types.SET_ODONTOGRAM_DETAIL, detail);
        }
    },

    async getOdontogramHistory({commit, state}, id_person) {
        const request = patientRequests.get(state);
        let response = await DAOdontogramService.getHistory(id_person)
        if(!isCurrentRequest(state, request, id_person)) return response;
        if(response.success) {
            commit(types.SET_ODONTOGRAM_HISTORY, response.data)
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
        }else {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
        }
        return response;
    },

    async status({commit, dispatch, state}, {data: data, id: id}) {
        const request = patientRequests.get(state);
        let response = await DAOdontogramService.status(data)
        if(!isCurrentRequest(state, request, id)) return response;
        if(response.success) {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
            try {
                const results = await Promise.all([
                    dispatch('validateOdontogram', id),
                    dispatch('getOdontogramHistory', id)
                ]);
                return {...response, refreshSuccess: results.every(result => result.success)};
            }catch(error) {
                if(isCurrentRequest(state, request, id)) commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true);
                return {...response, refreshSuccess: false};
            }
        }else {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
        }
        return response;
    },

    async delete({commit, dispatch, state}, {data: data, id: id}) {
        const request = patientRequests.get(state);
        let response = await DAOdontogramService.delete(data)
        if(!isCurrentRequest(state, request, id)) return response;
        if(response.success) {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, false)
            try {
                const results = await Promise.all([
                    dispatch('validateOdontogram', id),
                    dispatch('getOdontogramHistory', id)
                ]);
                return {...response, refreshSuccess: results.every(result => result.success)};
            }catch(error) {
                if(isCurrentRequest(state, request, id)) commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true);
                return {...response, refreshSuccess: false};
            }
        }else {
            commit(types.SET_ODONTOGRAM_TOOTH_ERROR, true)
        }
        return response;
    },


}

export default actions
