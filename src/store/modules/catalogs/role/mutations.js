import types from '../../common/mutation-types';

const mutations = {
    [types.SET_ROLES] (state, payload) {
            state.roles = payload ? payload : []
    },
    [types.SET_ROLE_PERMISSIONS] (state, payload) {
            state.permissions = payload ? payload : []
    },
    [types.SET_SAVE_ROLE_PERMISSIONS] (state, payload) {
            state.savedPermissions = payload ? payload : []
    }
}

export default mutations
