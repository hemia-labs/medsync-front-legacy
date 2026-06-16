import types from '../../common/mutation-types';

const mutations = {
    [types.SET_CONDITIONS] (state, payload) {
            state.conditions = payload ? payload : []
    }
}

export default mutations