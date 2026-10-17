import { DAC_BUSINESS_CURRENT } from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getCurrent() {
        return DACore.get(DAC_BUSINESS_CURRENT);
    },
    getPreparation() {
        return DACore.get('/api/business/preparation');
    },
    getLicenseUsage() {
        return DACore.get('/api/business/license-usage');
    },
    updateCurrent(data) {
        return DACore.put(DAC_BUSINESS_CURRENT, data);
    }
}
