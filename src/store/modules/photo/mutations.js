import types from '../common/mutation-types';
const mutations = {

    [types.SET_TYPE_PHOTO] (state, payload) {
        state.isGetTypePhoto = payload ? payload : []
    },
    [types.SET_PHOTO_CAT_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorPhoto = payload
        }else {
            state.hasErrorPhoto.error = false
        }
    },
    [types.SET_PHOTO_SAVE] (state, payload) {
        state.isSavePhoto = payload ? payload : {}
    },
    [types.SET_PHOTO_GET] (state, payload) {
        state.isGetPhoto = payload ? payload : []
    },
    [types.SET_PHOTO_DELETE] (state, payload) {
        state.isDeletePhoto = payload ? payload : []
    },
    
}

export default mutations