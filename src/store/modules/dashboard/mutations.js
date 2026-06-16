import types from '../common/mutation-types';

const mutations = {
    [types.SET_BIRTHDAYS] (state, payload) {
            state.birthdays = payload ? payload : []
    },
    [types.SET_PATIENTS] (state, payload) {
        state.patients = payload ? payload : []
    }
}

export default mutations