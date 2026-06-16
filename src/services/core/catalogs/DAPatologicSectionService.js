import { DAC_PATOLOGIC_SECTION } from '../../common/apiurl';
import { DACore } from '../../config/axios.context'

export default {

    /**
     * Función que permite listar el catalogo se secciones patologicas
     * @returns 
     */
    getPatologicSections() {
        return DACore.get(DAC_PATOLOGIC_SECTION);
    }
}
