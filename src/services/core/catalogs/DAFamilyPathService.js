import { DAC_FAMILY_PATH } from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite listar los tipos de familiares
     * @returns 
     */
    getFamilyPath() {
        return DACore.get(DAC_FAMILY_PATH);
    }
}
