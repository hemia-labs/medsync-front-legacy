import types from '../common/mutation-types';

const mutations = {
    [types.SET_ADD_MONITORING] (state, payload) {
            state.saveMonitorings = payload ? payload : []
    },    
    [types.SET_UPD_MONITORING] (state, payload) {
        state.updMonitorings = payload ? payload : []
}, 
    [types.SET_MONITORING_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorMonitoring = payload
        }else {
            state.hasErrorMonitoring.error = false
        }
    },
    [types.SET_GET_MONITORING] (state, payload) {
        state.getMonitorings = payload ? payload : []
    },   
    [types.SET_DELETE_MONITORING] (state, payload) {
        state.deleteTracing = payload ? payload : []
    },   
    [types.SET_GET_ALL_MONITORING] (state, payload) {
        state.allMonitorings = payload ? payload : []
    },  
    [types.SET_GET_ALL_PX_TREATMENT] (state, payload) {
        state.getAllTreatments = payload ? payload : []
    },  
}


export default mutations