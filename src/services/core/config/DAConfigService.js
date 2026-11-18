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
    DAC_CONFIG_CLINICAL_MODULES_SAVE,
    DAC_CONFIG_CLINICAL_MODULES_CHANGES
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

    async saveClinicalModules(data) {
        if (!data || !data.changes) return DACore.post(DAC_CONFIG_CLINICAL_MODULES_SAVE, data);
        const result = await DACore.post(DAC_CONFIG_CLINICAL_MODULES_CHANGES, data);
        if (result.success && (!result.data || typeof result.data.odontogramEnabled !== 'boolean')) {
            return { success: false, message: 'El servidor no confirmó los ajustes. Conservamos tus cambios.' };
        }
        return result;
    },
}
