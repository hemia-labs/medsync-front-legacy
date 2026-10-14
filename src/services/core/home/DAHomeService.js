import { DAC_BIRTHDAY_LIST, DAC_HOME_CONTINUITY_SUMMARY, DAC_PX_SEARCHER } from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getBirthdays() {
        return DACore.get(DAC_BIRTHDAY_LIST);
    },

    getContinuitySummary(params = {}) {
        const query = new URLSearchParams(params).toString();
        return DACore.get(query ? `${DAC_HOME_CONTINUITY_SUMMARY}?${query}` : DAC_HOME_CONTINUITY_SUMMARY);
    },

    getAppointments(params = {}) {
        return DACore.get(`api/home/appointments?${new URLSearchParams(params).toString()}`);
    },

    getPatients(data) {
        return DACore.post(DAC_PX_SEARCHER, data);
    }
}
