import { DAC_PATOLOGICAL } from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite listar el catalogo de preguntas patologicas
     * @returns 
     */
    getPatological() {
        return DACore.get(DAC_PATOLOGICAL);
    }
}
