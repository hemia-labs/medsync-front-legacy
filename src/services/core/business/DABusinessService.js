import { DAC_BUSINESS_CURRENT } from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getCurrent() {
        return DACore.get(DAC_BUSINESS_CURRENT);
    },
    getPreparation({agenda=false, clinicalHistory=false, doctorProfileId} = {}) {
        return DACore.get('/api/business/preparation', {params:{...(agenda ? {agenda:'1', ...(doctorProfileId ? {doctor_profile_id:doctorProfileId} : {})} : {}), ...(clinicalHistory ? {clinical_history:'1'} : {})}});
    },
    getLicenseUsage() {
        return DACore.get('/api/business/license-usage');
    },
    updateCurrent(data) {
        return DACore.put(DAC_BUSINESS_CURRENT, data);
    }
}
