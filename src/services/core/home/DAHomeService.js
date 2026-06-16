import { DAC_BIRTHDAY_LIST, DAC_PX_SEARCHER } from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getBirthdays() {
        return DACore.get(DAC_BIRTHDAY_LIST);
    },

    getPatients(data) {
        return DACore.post(DAC_PX_SEARCHER, data);
    }
}
