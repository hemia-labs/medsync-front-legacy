import { DAC_BUSINESS_CURRENT } from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getCurrent() {
        return DACore.get(DAC_BUSINESS_CURRENT);
    },
    updateCurrent(data) {
        return DACore.put(DAC_BUSINESS_CURRENT, data);
    }
}
