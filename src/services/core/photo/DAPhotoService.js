import { DAC_FILE, DAC_FILE_PHOTO, DAC_GET_PHOTOS, DAC_DELETE_PHOTO} from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que lista los tipos de fotos
     * 
     * @returns 
     */
    async getTypeFiles() {
        return DACore.get(DAC_FILE);
    },

    /**
     * Función que guarda una foto
     * 
     * @returns 
     */
    async savePhoto(data) {
        return DACore.post(DAC_FILE_PHOTO,data);
    },

    /**
     * Función que obtiene las fotos
     * 
     * @returns 
     */
    async getPhotos(data) {
        return DACore.get(DAC_GET_PHOTOS + data);
    },

    /**
     * Función que Elimina una foto
     * 
     * @returns 
     */
        async deletePhoto(data) {
            return DACore.delete(DAC_DELETE_PHOTO,data);
        },
}
