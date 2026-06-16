import types from '../../common/mutation-types';

const mutations = {
    [types.SET_PATOLOGIC_SECTIONS] (state, payload) {
            state.patologicsections = payload ? payload : false
    },
    [types.SET_PATOLOGICAL_QA] (state, payload) {
            state.patological = payload ? payload : false
    }
}

export default mutations