import { DAConfigService } from '../../../services/context/core-proccess-context';
import DAHasErrorModel from '../../../models/error/DAHasErrorModel';
import types from '../common/mutation-types';
import { getThemeContext, loadTheme, saveTheme } from '../../../plugins/theme';

const actions = {
    /**
     *  Función que permite Agregar una configuracion
     * @param {*} param0 
     */
    async saveConfiguration({commit},data) {
        let response = await DAConfigService.saveConfiguration(data);
        if(response.success) {
            commit(types.SET_ADD_CONFIG, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_ADD_CONFIG,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
        return response;
    },

    /**
     *  Función que lista la configuracion
     * @param {*} param0 
     */
    async getConfiguration({commit}) {
        let response = await DAConfigService.getConfiguration();
        if(response.success) {
            commit(types.SET_GET_CONFIG, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_GET_CONFIG,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
        return response;
    },

    /**
     *  Función que edita la configuracion
     * @param {*} param0 
     */
    async editConfiguration({commit},data) {
        let response = await DAConfigService.editConfiguration(data);
        if(response.success) {
            commit(types.SET_UPD_CONFIG, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_UPD_CONFIG,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
        return response;
    },

    async saveLoginImage({commit}, data) {
        let response = await DAConfigService.saveLoginImage(data);
        if(response.success) {
            commit(types.SET_SAVE_LOGIN_IMAGE, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_SAVE_LOGIN_IMAGE,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    async getLoginImage({commit}) {
        let response = await DAConfigService.getLoginImage();
        if(response.success) {
            commit(types.SET_GET_LOGIN_IMAGE, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_GET_LOGIN_IMAGE,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    async getThemeList({commit}) {
        let response = await DAConfigService.getThemeList();
        if(response.success) {
            commit(types.SET_THEME_LIST, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_THEME_LIST,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
    },

    async getTheme({commit, rootState}, options = {}) {
        if(!rootState.CORE.AUTH.authenticated && !options.allowAnonymous) return { success: false, themeAccepted: false };
        const context = getThemeContext(rootState.CORE.AUTH);
        const response = await loadTheme(context, () => DAConfigService.getTheme(),
            () => getThemeContext(rootState.CORE.AUTH) === context, options);
        if(response.success && response.themeAccepted) {
            commit(types.SET_THEME, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else if(getThemeContext(rootState.CORE.AUTH) === context && !response.success) {
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
        return response;
    },

    async saveTheme({commit, rootState}, data) {
        if(!rootState.CORE.AUTH.authenticated) return { success: false, themeAccepted: false };
        const context = getThemeContext(rootState.CORE.AUTH);
        const response = await saveTheme(context, () => DAConfigService.saveTheme(data),
            () => getThemeContext(rootState.CORE.AUTH) === context);
        if(getThemeContext(rootState.CORE.AUTH) !== context) return response;
        if(response.success) {
            commit(types.SET_SAVE_THEME, response.data)
            if(response.themeAccepted) commit(types.SET_THEME, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_SAVE_THEME,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
        return response;
    },

    async getClinicalModules({commit}) {
        let response = await DAConfigService.getClinicalModules();
        if(response.success) {
            commit(types.SET_CLINICAL_MODULES, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_CLINICAL_MODULES, {
                odontogramEnabled: false,
                treatmentPlanEnabled: true,
                allowTreatmentToothSelection: false,
                showTreatmentCosts: true,
                showTreatmentStatus: true
            })
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
        return response;
    },

    async saveClinicalModules({commit}, data) {
        let response = await DAConfigService.saveClinicalModules(data);
        if(response.success) {
            commit(types.SET_SAVE_CLINICAL_MODULES, response.data)
            commit(types.SET_CLINICAL_MODULES, response.data)
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel() )
        }
        else {
            commit(types.SET_SAVE_CLINICAL_MODULES,[])
            commit(types.SET_CONFING_EXCEPTION, new DAHasErrorModel(true, response.message) )
        }
        return response;
    },

}

export default actions
