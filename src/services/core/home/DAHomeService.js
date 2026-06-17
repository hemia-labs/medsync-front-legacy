import { DAC_BIRTHDAY_LIST, DAC_HOME_CONTINUITY_SUMMARY, DAC_PX_SEARCHER } from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getBirthdays() {
        return DACore.get(DAC_BIRTHDAY_LIST);
    },

    getContinuitySummary() {
        return DACore.get(DAC_HOME_CONTINUITY_SUMMARY);
    },

    getPatients(data) {
        return DACore.post(DAC_PX_SEARCHER, data);
    }
}
