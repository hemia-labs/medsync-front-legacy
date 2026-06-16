import types from '../common/mutation-types';
const mutations = {
    [types.SET_ADD_OTREATMENT] (state, payload) {
            state.saveOTreatments = payload ? payload : []
    },    
    [types.SET_UPD_OTREATMENT] (state, payload) {
        state.editOTreatments = payload ? payload : []
    },  
    [types.SET_OTREATMENT_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorOTreatments = payload
        }else {
            state.hasErrorOTreatments.error = false
        }
    },
    [types.SET_TREATMENT_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorTreatment = payload
        }else {
            state.hasErrorTreatment.error = false
        }
    },
    [types.SET_GET_OTREATMENT] (state, payload) {
        state.getOTreatments = payload ? payload : []
    },   
    [types.SET_DELETE_OTREATMENT] (state, payload) {
        state.deleteOTreatments = payload ? payload : []
    },  
    [types.SET_TRATAMENT] (state, payload) {
        state.tratament = payload ? payload : []
    },  
    [types.SET_TRATAMENT_EDIT] (state, payload) {
        state.tratamentEdit = payload ? payload : null
    },  
    [types.SET_TRATAMENT_DETAIL] (state, payload) {
        state.tratamentDetail = payload ? payload : null
    },  
    [types.SET_TREATMENT_PLAN] (state, payload) {
        state.treatmentPlan = payload ? payload : null
    },
}


export default mutations
