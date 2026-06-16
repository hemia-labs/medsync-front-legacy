import types from '../../common/mutation-types';

const mutations = {
    [types.SET_FAMILY_PATH] (state, payload) {
            state.path = payload ? payload : []
    }
}

export default mutations