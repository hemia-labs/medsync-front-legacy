import {
    DAC_CONFIG_SAVE,
    DAC_CONFIG_GET,
    DAC_CONFIG_UPDATE,
    DAC_CONFIG_LOGIN_IMAGE_SAVE,
    DAC_CONFIG_LOGIN_IMAGE_GET,
    DAC_CONFIG_THEME_LIST,
    DAC_CONFIG_THEME_GET,
    DAC_CONFIG_THEME_SAVE,
    DAC_CONFIG_CLINICAL_MODULES_GET,
    DAC_CONFIG_CLINICAL_MODULES_SAVE
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que guardar la configuracion
     * 
     * @returns 
     */
    saveConfiguration(data) {
        return DACore.post(DAC_CONFIG_SAVE,data);
    },

    /**
     * Función que edita la configuracion
     * 
     * @returns 
     */
    editConfiguration(data) {
        return DACore.put(DAC_CONFIG_UPDATE,data);
    },

    /**
     * Función que obtiene la configuracion
     * 
     * @returns 
     */
    getConfiguration() {
        return DACore.get(DAC_CONFIG_GET);
    },

    saveLoginImage(data) {
        return DACore.post(DAC_CONFIG_LOGIN_IMAGE_SAVE, data);
    },

    getLoginImage() {
        return DACore.get(DAC_CONFIG_LOGIN_IMAGE_GET);
    },

    getThemeList() {
        return DACore.get(DAC_CONFIG_THEME_LIST);
    },

    getTheme() {
        return DACore.get(DAC_CONFIG_THEME_GET);
    },

    saveTheme(data) {
        return DACore.post(DAC_CONFIG_THEME_SAVE, data);
    },

    getClinicalModules() {
        return DACore.get(DAC_CONFIG_CLINICAL_MODULES_GET);
    },

    saveClinicalModules(data) {
        return DACore.post(DAC_CONFIG_CLINICAL_MODULES_SAVE, data);
    },
}
