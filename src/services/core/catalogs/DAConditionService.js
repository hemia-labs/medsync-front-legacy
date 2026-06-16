import { DAC_CONDITIONS_GET } from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite listar el catalogo de condiciones
     * @returns 
     */
    getConditions() {
        return DACore.get(DAC_CONDITIONS_GET);
    }
}
