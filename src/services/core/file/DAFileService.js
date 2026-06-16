import { DAC_FILE_PROFILE } from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite guardar una foto de perfil
     * 
     * @returns 
     */
    uploadProfile(data) {
        return DACore.post(DAC_FILE_PROFILE, data);
    },

}
