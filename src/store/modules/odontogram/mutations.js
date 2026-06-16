

import DAOdontogramDetailModel from '../../../models/odontogram/DAOdontogramDetail.model';
import DAToothModel from '../../../models/odontogram/DATooth.model';
import types from '../common/mutation-types';

const mutations = {
    [types.SET_ODONTOGRAM] (state, payload) {
            state.odontogram = payload ? payload : false
    },
    [types.SET_ODONTOGRAM_TOOTH] (state, payload) {
            state.tooth = payload ? payload : new DAToothModel()
    },
    [types.SET_ODONTOGRAM_TOOTH_ERROR] (state, payload) {
            state.hasError = payload ? payload : false
    },
    [types.SET_ODONTOGRAM_TYPE_TOOTH] (state, payload) {
            state.typeTooth = payload ? payload : []
    },
    [types.SET_ODONTOGRAM_TYPE_CODE] (state, payload) {
            state.codetypetooth = payload ? payload : ''
    },
    [types.SET_ODONTOGRAM_ID] (state, payload) {
        state.id_odontogram = payload
    },
    [types.SET_ODONTOGRAM_DETAIL] (state, payload) {
        state.odontogramDetail = payload ? payload : new DAOdontogramDetailModel()
    },
    [types.SET_ODONTOGRAM_HISTORY] (state, payload) {
        state.history = payload ? payload : []
    },
    [types.SET_ODONTOGRAM_EDIT] (state, payload) {
        state.odontogramEdit = payload ? payload : {}
    },
    [types.SET_ODONTOGRAM_PREVIEW] (state, payload) {
          state.odontogramPreview = payload ? payload : new DAOdontogramDetailModel()
    }
}

export default mutations