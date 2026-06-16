import types from '../common/mutation-types';

const mutations = {
    [types.SET_CURRENT_ACTION] (state, payload) {
            state.currentAction = payload ? payload : false
    }
}

export default mutations