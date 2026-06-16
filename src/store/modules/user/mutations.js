import types from '../common/mutation-types';

const mutations = {
    [types.SET_USERS] (state, payload) {
        state.users = payload ? payload : []
    },
    [types.SET_RESPONSE_SAVE] (state, payload) {
        state.successfullysave = payload ? payload : false
    },
    [types.SET_USER] (state, payload) {
        state.user = payload ? payload : null
    },
    [types.SET_ERROR_SERVICE] (state, payload) {
        state.hasErrorInService = payload ? payload : false
    },
    [types.SET_ERROR_SERVICE_MESSAGE] (state, payload) {
        state.lastErrorInService = payload ? payload : ''
    },
    [types.SET_ERROR_SERVICE_DETAILS] (state, payload) {
        state.lastErrorInServiceDetails = payload || null
    },
}

export default mutations
