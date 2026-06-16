import types from '../common/mutation-types';

const mutations = {
    [types.SET_ADD_CONFIG] (state, payload) {
        state.saveConfigurations = payload ? payload : []
    },    
    [types.SET_GET_CONFIG] (state, payload) {
        state.getConfigurations = payload ? payload : []
    },   
    [types.SET_UPD_CONFIG] (state, payload) {
        state.editConfigurations = payload ? payload : []
    }, 
    [types.SET_SAVE_LOGIN_IMAGE] (state, payload) {
        state.saveLoginImage = payload ? payload : []
    },
    [types.SET_GET_LOGIN_IMAGE] (state, payload) {
        state.getLoginImage = payload ? payload : []
    },
    [types.SET_THEME_LIST] (state, payload) {
        state.themeList = payload ? payload : []
    },
    [types.SET_THEME] (state, payload) {
        state.theme = payload ? payload : []
    },
    [types.SET_SAVE_THEME] (state, payload) {
        state.saveTheme = payload ? payload : []
    },
    [types.SET_CLINICAL_MODULES] (state, payload) {
        state.clinicalModules = payload || { odontogramEnabled: false }
    },
    [types.SET_SAVE_CLINICAL_MODULES] (state, payload) {
        state.saveClinicalModules = payload ? payload : []
    },
    [types.SET_CONFING_EXCEPTION] (state, payload) {
        if(payload) {
            state.hasErrorConfiguration = payload
        }else {
            state.hasErrorConfiguration.error = false
        }
    },
}


export default mutations
