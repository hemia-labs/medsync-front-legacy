import types from '../common/mutation-types';

const mutations = {
    [types.SET_PRESCRIPTION_CONFIG](state, payload) {
        state.config = payload || null;
    },
    [types.SET_PRESCRIPTIONS](state, payload) {
        state.list = payload || [];
    },
    [types.SET_PRESCRIPTION](state, payload) {
        state.current = payload || null;
    },
    [types.SET_PRESCRIPTION_DOCTORS](state, payload) {
        state.doctors = payload || [];
    },
    [types.SET_PRESCRIPTION_ERROR](state, payload) {
        state.hasError = payload;
    },
};

export default mutations;
