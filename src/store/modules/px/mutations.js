import types from '../common/mutation-types';

const mutations = {
    [types.SET_ERROR_SERVICE] (state, payload) {
            state.hasErrorInService = payload ? payload : false
    },
    [types.SET_PX] (state, payload) {
            state.px = payload ? payload : false;
            state.id_person = payload.person ? payload.person.id_person : ''
    },
    [types.SET_PX_ID_PERSON] (state, payload) {
            state.id_person = payload ? payload : ''
    },

}

export default mutations